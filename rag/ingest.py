#!/usr/bin/env python3
"""
XYZ Hotel — RAG Ingestion Pipeline
Crawls HTML pages, loads structured knowledge, segments into semantic chunks,
computes dense vector embeddings, and outputs knowledge_index.json.
"""

import os
import json
import re
from embedder import SemanticEmbedder, preprocess_text

def clean_html(raw_html: str) -> str:
    """Strip HTML tags, scripts, and extra whitespaces."""
    # Remove script and style tags
    clean = re.sub(r'<script[\s\S]*?</script>', ' ', raw_html, flags=re.IGNORECASE)
    clean = re.sub(r'<style[\s\S]*?</style>', ' ', clean, flags=re.IGNORECASE)
    # Remove tags
    clean = re.sub(r'<[^>]+>', ' ', clean)
    # Clean whitespace
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean

def run_ingestion():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    rag_dir = os.path.join(base_dir, 'rag')
    knowledge_path = os.path.join(rag_dir, 'knowledge_data.json')

    print(f"Loading structured knowledge from {knowledge_path}...")
    with open(knowledge_path, 'r', encoding='utf-8') as f:
        chunks = json.load(f)

    # Ingest text from HTML pages to ensure full coverage
    html_files = {
        'index.html': 'Home Page & Overview',
        'rooms.html': 'Rooms & Suites Showcase',
        'dining.html': 'Dining & Restaurants',
        'booking.html': 'Booking Engine & Offline Desks',
        'contact.html': 'Contact & Concierge Desk'
    }

    for filename, title in html_files.items():
        filepath = os.path.join(base_dir, filename)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                cleaned_text = clean_html(content)
                # Ensure main key details are retained
                chunks.append({
                    "id": f"page-{filename.replace('.html', '')}",
                    "title": f"Official Page: {title}",
                    "category": "page_overview",
                    "url": filename,
                    "content": cleaned_text[:1200] + "...", # representative summary
                    "tags": [filename.replace('.html', ''), "page", "overview"]
                })

    print(f"Total semantic chunks to embed: {len(chunks)}")

    # Prepare corpus for vectorizer
    # Combine title, content, and tags to enrich semantic representation
    corpus = []
    for c in chunks:
        enriched_text = f"{c['title']} {c['category']} {' '.join(c.get('tags', []))} {c['content']}"
        corpus.append(enriched_text)

    # Initialize and fit SemanticEmbedder
    embedder = SemanticEmbedder(n_components=64)
    embedder.fit(corpus)
    vectors = embedder.transform(corpus)

    # Attach vectors to chunks
    indexed_chunks = []
    for i, chunk in enumerate(chunks):
        chunk_copy = dict(chunk)
        chunk_copy['vector'] = [round(float(val), 5) for val in vectors[i].tolist()]
        indexed_chunks.append(chunk_copy)

    # Prepare final index bundle
    bundle = {
        "version": "1.0.0",
        "created_at": "2026-09-10",
        "chunks_count": len(indexed_chunks),
        "dimensions": len(indexed_chunks[0]['vector']),
        "model_spec": embedder.export_spec(),
        "chunks": indexed_chunks
    }

    # Save to JSON
    index_json_path = os.path.join(rag_dir, 'knowledge_index.json')
    with open(index_json_path, 'w', encoding='utf-8') as f:
        json.dump(bundle, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved vector index to {index_json_path}")

    # Also save as a JS file for direct in-browser zero-latency execution
    js_dest_path = os.path.join(base_dir, 'js', 'knowledge_index.js')
    with open(js_dest_path, 'w', encoding='utf-8') as f:
        f.write("// Pre-computed vector embeddings for in-browser zero-latency RAG\n")
        f.write("window.HOTEL_KNOWLEDGE_INDEX = ")
        json.dump(bundle, f, ensure_ascii=False)
        f.write(";\n")
    print(f"✓ Saved in-browser knowledge index to {js_dest_path}")

if __name__ == '__main__':
    run_ingestion()
