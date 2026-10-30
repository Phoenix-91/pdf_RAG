import os
import uuid

from flask import Flask, jsonify, render_template, request

from config import Config
from services import chunk_service, embedding_service, groq_service, pdf_service
from services.vector_service import VectorStore

app = Flask(__name__)
app.config.from_object(Config)
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

store = VectorStore()
history = []
doc_state = {"name": None, "pages": 0, "chunks": 0}


def reset_state():
    global store, history, doc_state
    store = VectorStore()
    history = []
    doc_state = {"name": None, "pages": 0, "chunks": 0}


@app.get("/")
def index():
    return render_template("index.html", model=Config.GROQ_MODEL)


@app.post("/upload")
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file part in the request."}), 400

    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "No file selected."}), 400
    if not pdf_service.allowed_file(file.filename):
        return jsonify({"error": "Only PDF files are allowed."}), 400

    saved_path = os.path.join(Config.UPLOAD_FOLDER, f"{uuid.uuid4().hex}.pdf")
    try:
        file.save(saved_path)
        result = pdf_service.extract_pages(saved_path)
        chunks = chunk_service.chunk_pages(result["pages"])
        if not chunks:
            raise ValueError("Document produced no usable text.")

        vectors = embedding_service.embed_texts([c["text"] for c in chunks])
        store.build(vectors, chunks)

        doc_state.update(
            {"name": file.filename, "pages": result["page_count"], "chunks": len(chunks)}
        )
        history.clear()
        return jsonify({"message": "PDF processed successfully.", "document": doc_state})
    except Exception as exc:
        reset_state()
        return jsonify({"error": str(exc)}), 500
    finally:
        if os.path.exists(saved_path):
            os.remove(saved_path)


@app.post("/chat")
def chat():
    data = request.get_json(silent=True) or {}
    question = (data.get("question") or "").strip()

    if not question:
        return jsonify({"error": "Please enter a question."}), 400
    if not store.is_ready():
        return jsonify({"error": "Please upload a PDF first."}), 400

    try:
        matches = store.search(embedding_service.embed_query(question), Config.TOP_K)
        answer = groq_service.answer_question(question, matches, history)

        history.append({"role": "user", "content": question})
        history.append({"role": "assistant", "content": answer})
        del history[:-8]

        pages = sorted({m["page"] for m in matches})
        return jsonify({"answer": answer, "sources": pages, "model": Config.GROQ_MODEL})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.post("/clear")
def clear():
    reset_state()
    return jsonify({"message": "Session cleared."})


@app.errorhandler(413)
def too_large(_error):
    return jsonify({"error": "File is too large. Maximum size is 16 MB."}), 413


if __name__ == "__main__":
    app.run(debug=True, port=5000)
