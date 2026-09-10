#!/usr/bin/env python3
"""
XYZ Hotel — Production RAG API Server
Provides REST endpoints for Royal Concierge AI chatbot.
Serves static hotel assets and provides /api/chat with full CORS support.
"""

import os
import sys
from flask import Flask, request, jsonify, send_from_directory
from engine import RAGEngine

# Root directory of hotel demosite
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__, static_folder=BASE_DIR)
rag_engine = RAGEngine()

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "XYZ Hotel Royal Concierge RAG API",
        "version": "1.0.0",
        "indexed_chunks": len(rag_engine.vector_store.chunks)
    })

@app.route('/api/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    try:
        data = request.get_json(force=True, silent=True) or {}
        message = data.get('message', '').strip()
        history = data.get('history', [])

        if not message:
            return jsonify({
                "status": "error",
                "message": "Message content is required."
            }), 400

        result = rag_engine.answer_query(message)

        return jsonify({
            "status": "success",
            "message": result["response"],
            "sources": result["sources"],
            "confidence": result["confidence"]
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Internal RAG processing error: {str(e)}"
        }), 500

# Static file serving to allow running the entire website through this server
@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(BASE_DIR, path)):
        return send_from_directory(BASE_DIR, path)
    return send_from_directory(BASE_DIR, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5055))
    print(f"Starting XYZ Hotel Royal Concierge Server on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
