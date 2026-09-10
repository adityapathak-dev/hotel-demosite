"""
XYZ Hotel — Vector Store & Semantic Retrieval Engine
Performs cosine similarity search against pre-computed normalized dense vectors.
Supports pure standard library Python (math) with optional numpy acceleration,
ensuring zero import errors across all Python interpreters and IDEs.
"""

import json
import math
import os

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

class VectorStore:
    def __init__(self, index_path: str = None):
        if index_path is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            index_path = os.path.join(base_dir, 'knowledge_index.json')
        
        self.index_path = index_path
        self.chunks = []
        self.vectors = []
        self.load_index()

    def load_index(self):
        if not os.path.exists(self.index_path):
            raise FileNotFoundError(f"Knowledge index not found at {self.index_path}. Run ingest.py first.")
        
        with open(self.index_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.chunks = data.get('chunks', [])
        self.vectors = [c['vector'] for c in self.chunks]

    def _cosine_similarity(self, v1, v2):
        """Compute cosine similarity between two vectors."""
        dot = sum(a * b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a * a for a in v1))
        norm2 = math.sqrt(sum(b * b for b in v2))
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return dot / (norm1 * norm2)

    def similarity_search(self, query_vector, top_k: int = 3, threshold: float = 0.25):
        """
        Compute cosine similarity between query vector and chunk vectors.
        Returns top_k chunks exceeding similarity threshold.
        """
        if not self.vectors or len(self.chunks) == 0:
            return []

        if HAS_NUMPY:
            q = np.array(query_vector, dtype=np.float32)
            q_norm = np.linalg.norm(q)
            if q_norm > 0:
                q = q / q_norm
            matrix = np.array(self.vectors, dtype=np.float32)
            norms = np.linalg.norm(matrix, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            matrix = matrix / norms
            scores = np.dot(matrix, q).tolist()
        else:
            scores = [self._cosine_similarity(query_vector, v) for v in self.vectors]

        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)

        results = []
        for idx, score in ranked[:top_k]:
            if score >= threshold:
                chunk = dict(self.chunks[idx])
                chunk['score'] = round(float(score), 4)
                results.append(chunk)

        return results
