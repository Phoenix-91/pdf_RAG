from config import Config


def chunk_pages(pages, chunk_size=None, overlap=None):
    chunk_size = chunk_size or Config.CHUNK_SIZE
    overlap = overlap or Config.CHUNK_OVERLAP
    if overlap >= chunk_size:
        overlap = max(0, chunk_size // 4)

    chunks = []
    for page in pages:
        words = page["text"].split()
        start = 0
        while start < len(words):
            end = start + chunk_size
            piece = " ".join(words[start:end]).strip()
            if piece:
                chunks.append({"text": piece, "page": page["page"]})
            if end >= len(words):
                break
            start = end - overlap
    return chunks
