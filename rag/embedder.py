"""
XYZ Hotel — Semantic Vector Embedder
Provides dense semantic embeddings and vector normalization using
TF-IDF + Latent Semantic Projection (LSA/SVD) via scikit-learn.
Exportable to JSON for both Python backend and in-browser JS execution.
"""

import math
import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD

def preprocess_text(text: str) -> str:
    """Normalize text for semantic analysis."""
    text = text.lower()
    text = re.sub(r'[^\w\s₹$€£\-\.]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

class SemanticEmbedder:
    def __init__(self, n_components: int = 64):
        self.n_components = n_components
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True,
            min_df=1,
            token_pattern=r'(?u)\b\w+\b|₹\d+'
        )
        self.svd = None
        self.is_fitted = False
        self.vocabulary = {}
        self.idf_diag = []
        self.components_matrix = []

    def fit(self, texts):
        """Fit TF-IDF and SVD on knowledge base texts."""
        clean_texts = [preprocess_text(t) for t in texts]
        tfidf_matrix = self.vectorizer.fit_transform(clean_texts)
        n_features = tfidf_matrix.shape[1]
        
        # Adaptive components based on vocabulary size
        actual_components = min(self.n_components, n_features - 1, len(texts) - 1)
        if actual_components < 2:
            actual_components = min(n_features, len(texts))
            
        self.svd = TruncatedSVD(n_components=actual_components, random_state=42)
        self.svd.fit(tfidf_matrix)
        self.is_fitted = True

        # Extract parameters for JSON export
        self.vocabulary = self.vectorizer.vocabulary_
        self.idf_diag = self.vectorizer.idf_.tolist()
        self.components_matrix = self.svd.components_.tolist()

    def transform(self, texts):
        """Transform text into normalized dense semantic vectors."""
        if not self.is_fitted:
            raise ValueError("SemanticEmbedder must be fitted before transform.")
        clean_texts = [preprocess_text(t) for t in texts]
        tfidf_matrix = self.vectorizer.transform(clean_texts)
        dense_vectors = self.svd.transform(tfidf_matrix)
        
        # L2 Normalize
        norms = np.linalg.norm(dense_vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        normalized = dense_vectors / norms
        return normalized

    def embed_query(self, query: str):
        """Generate embedding vector for a single query."""
        vecs = self.transform([query])
        return vecs[0].tolist()

    def export_spec(self):
        """Export model parameters for browser JS inference."""
        return {
            "vocabulary": {k: int(v) for k, v in self.vocabulary.items()},
            "idf": [float(x) for x in self.idf_diag],
            "components": self.components_matrix
        }
