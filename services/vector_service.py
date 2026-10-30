import faiss


class VectorStore:
    def __init__(self):
        self.index = None
        self.chunks = []
        self.dimension = 0

    def build(self, vectors, chunks):
        self.dimension = vectors.shape[1]
        self.index = faiss.IndexFlatIP(self.dimension)
        self.index.add(vectors)
        self.chunks = chunks

    def search(self, query_vector, top_k):
        if not self.is_ready():
            return []
        scores, indices = self.index.search(query_vector, top_k)
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:
                continue
            chunk = self.chunks[idx]
            results.append(
                {"text": chunk["text"], "page": chunk["page"], "score": float(score)}
            )
        return results

    def is_ready(self):
        return self.index is not None and self.index.ntotal > 0
