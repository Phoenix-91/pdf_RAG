from groq import Groq

from config import Config

SYSTEM_PROMPT = (
    "You are a helpful assistant that answers questions strictly about an "
    "uploaded PDF. Use ONLY the provided context. If the answer is not in the "
    "context, reply exactly: \"I couldn't find that information in the uploaded "
    "document.\" Do not use outside knowledge. Be clear and concise."
)

USER_TEMPLATE = "Context from the PDF:\n{context}\n\nQuestion: {question}"


def get_client():
    if not Config.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set. Add it to your .env file.")
    return Groq(api_key=Config.GROQ_API_KEY)


def build_context(matches):
    return "\n\n---\n\n".join(
        "[Page {p}]\n{t}".format(p=m["page"], t=m["text"]) for m in matches
    )


def answer_question(question, matches, history=None):
    context = build_context(matches) or "No relevant context was found."

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        messages.extend(history[-6:])
    messages.append(
        {
            "role": "user",
            "content": USER_TEMPLATE.format(context=context, question=question),
        }
    )

    completion = get_client().chat.completions.create(
        model=Config.GROQ_MODEL,
        messages=messages,
        temperature=0.2,
        max_tokens=1024,
    )
    return completion.choices[0].message.content.strip()
