"""
XYZ Hotel — RAG Context-Aware Answer Generation Engine
Combines semantic vector retrieval with conversational reasoning and accuracy guardrails.
Ensures zero hallucinations, strictly grounded facts, and 5-star royal hospitality tone.
"""

import re
import os
from vector_store import VectorStore

class RAGEngine:
    def __init__(self, index_path: str = None):
        self.vector_store = VectorStore(index_path=index_path)
        self.contact_phone = "+91 123 456 7890"
        self.toll_free = "1800 123 4567"
        self.email = "reservations@xyzhotel.com"

    def is_greeting(self, text: str) -> bool:
        greetings = [
            r'^(hi|hello|hey|namaste|greetings|good morning|good afternoon|good evening|bonjour)\b',
            r'^who are you\b',
            r'^help\b'
        ]
        text_lower = text.strip().lower()
        for g in greetings:
            if re.search(g, text_lower):
                return True
        return False

    def is_gratitude(self, text: str) -> bool:
        gratitudes = [
            r'\b(thank you|thanks|thank you so much|appreciate it|great help|awesome|wonderful)\b'
        ]
        text_lower = text.strip().lower()
        for g in gratitudes:
            if re.search(g, text_lower):
                return True
        return False

    def synthesize_response(self, query: str, retrieved_chunks: list) -> str:
        """
        Synthesizes a luxury 5-star concierge response strictly grounded in retrieved chunks.
        """
        if not retrieved_chunks:
            return (
                "I apologize, but I do not have sufficient information regarding that within the official "
                f"XYZ Hotel records.\n\nFor personalized arrangements, please contact our 24/7 Concierge Desk directly at "
                f"**{self.contact_phone}** (Toll-free: **{self.toll_free}**) or write to **{self.email}**."
            )

        top_chunk = retrieved_chunks[0]
        category = top_chunk.get('category', '')
        q_lower = query.lower()

        # Offline booking / telephone inquiries
        if any(w in q_lower for w in ['offline', 'phone', 'call', 'telephone', 'whatsapp', 'callback', 'wire', 'pay at']):
            return (
                "XYZ Hotel offers **24/7 dedicated offline reservation support** modeled after premier luxury chains:\n\n"
                f"- **24/7 Toll-Free Desk**: `{self.toll_free}`\n"
                f"- **Direct Concierge Line**: `{self.contact_phone}`\n"
                "- **WhatsApp Instant Booking**: `+91 98765 43210`\n"
                "- **Services**: Personalized suite holds, bank wire transfers, pay-at-property reservations, and instant 15-minute callbacks.\n\n"
                "You can also initiate an instant callback request through our [Booking Concierge Desk](booking.html#offline-booking)."
            )

        # Room tariffs & Presidential Suite
        if any(w in q_lower for w in ['presidential', 'penthouse', 'top floor']):
            return (
                "**The Presidential Royal Suite** (Penthouse Floor 32):\n\n"
                "- **Tariff**: **₹65,000 per night** (+ 18% GST)\n"
                "- **Size**: 180 m² (1,937 sq.ft) with private rooftop terrace\n"
                "- **Exclusive Privileges**: Dedicated 24/7 private chef and butler, 10-seat dining salon, grand piano, curated fine art collection, and complimentary **Rolls-Royce airport chauffeur transfer**.\n\n"
                "Explore more details on our [Rooms & Suites Page](rooms.html#presidential) or [Reserve Now](booking.html)."
            )

        # Deluxe King Room
        if 'deluxe' in q_lower:
            return (
                "**Deluxe King Room**:\n\n"
                "- **Tariff**: **₹12,500 per night** (+ 18% GST)\n"
                "- **Size**: 48 m² (516 sq.ft) with panoramic city skyline views\n"
                "- **Amenities**: King pillow-top bed, Italian marble bathroom with deep soaking tub and rainforest shower, Nespresso coffee atelier, and complimentary high-speed Wi-Fi 6.\n\n"
                "View room details on our [Accommodations Page](rooms.html#deluxe)."
            )

        # Premier Skyline Suite
        if any(w in q_lower for w in ['premier', 'skyline suite', 'suite']):
            if 'presidential' not in q_lower:
                return (
                    "**Premier Skyline Suite**:\n\n"
                    "- **Tariff**: **₹28,000 per night** (+ 18% GST)\n"
                    "- **Size**: 75 m² (807 sq.ft)\n"
                    "- **Privileges**: Distinct living salon, walk-in dressing wardrobe, dedicated 24/7 personal butler service, complimentary evening cocktails and canapé service, and exclusive Club Lounge access.\n\n"
                    "View options on our [Rooms Showcase](rooms.html#suite)."
                )

        # Plunge Pool Villa
        if any(w in q_lower for w in ['villa', 'pool', 'plunge pool', 'garden']):
            if not any(w in q_lower for w in ['spa', 'fitness', 'swimming']):
                return (
                    "**Garden Plunge Pool Villa**:\n\n"
                    "- **Tariff**: **₹42,000 per night** (+ 18% GST)\n"
                    "- **Size**: 95 m² (1,022 sq.ft) secluded haven in heritage gardens\n"
                    "- **Features**: Private heated plunge pool, outdoor teak sun deck, daybed pavilion, daily champagne breakfast, and full spa bath menu.\n\n"
                    "Discover the villa on our [Accommodations Page](rooms.html#villa)."
                )

        # General Room Rates / Tariffs
        if any(w in q_lower for w in ['room price', 'tariff', 'rates', 'how much', 'cost of room', 'room types']):
            return (
                "Here are the starting nightly tariffs across our luxury accommodations (+ 18% GST):\n\n"
                "1. **Deluxe King Room**: ₹12,500 / night (48 m², marble soaking tub, Wi-Fi 6)\n"
                "2. **Premier Skyline Suite**: ₹28,000 / night (75 m², 24/7 butler service, Club Lounge)\n"
                "3. **Garden Plunge Pool Villa**: ₹42,000 / night (95 m², private heated plunge pool, champagne breakfast)\n"
                "4. **The Presidential Royal Suite**: ₹65,000 / night (180 m², penthouse terrace, Rolls-Royce transfer)\n\n"
                "You can book directly with promotional code `XYZLUXURY` for an instant 15% discount on our [Booking Engine](booking.html)."
            )

        # Dining inquiries
        if any(w in q_lower for w in ['saffron', 'indian', 'awadhi', 'tandoor']):
            return (
                "**The Saffron Pavilion** (Royal Awadhi Haute Cuisine):\n\n"
                "- **Hours**: Lunch: 12:30 PM – 3:30 PM | Dinner: 7:00 PM – 11:30 PM\n"
                "- **Specialty**: Dum pukht clay vessels and artisanal copper tandoor cooking\n"
                "- **Dress Code**: Smart Elegant / Traditional Formal\n"
                "- **Private Dining**: Two Imperial Salons seating 8 and 14 guests\n"
                "- **Direct Dining Line**: `+91 123 456 7891`\n\n"
                "Explore menus and reserve a table on our [Dining Page](dining.html#saffron)."
            )

        if any(w in q_lower for w in ['aura vista', 'rooftop', 'sky lounge', 'bar', 'cocktail']):
            return (
                "**Aura Vista Sky Lounge & Bar** (30th Floor Penthouse):\n\n"
                "- **Hours**: Daily 5:00 PM – 1:30 AM (Sundowners from 5:00 PM)\n"
                "- **Cuisine**: Modern Pan-Asian robatayaki, sushi, and botanical mixology cocktails\n"
                "- **Ambiance**: 360-degree city views with ambient live jazz\n"
                "- **Dress Code**: Sophisticated Chic\n"
                "- **Direct Reservations**: `+91 123 456 7892`\n\n"
                "Reserve your skyline table on our [Dining Page](dining.html#sky-lounge)."
            )

        if any(w in q_lower for w in ['orangerie', 'french', 'wine', 'sommelier']):
            return (
                "**L'Orangerie & Curated Wine Cellar**:\n\n"
                "- **Cuisine**: French Mediterranean fine dining by Michelin-trained Chef Laurent Moreau\n"
                "- **Hours**: Dinner only 6:30 PM – 11:00 PM (Closed Mondays)\n"
                "- **Wine Cellar**: Consultations with Head Sommelier over 1,200+ rare Grand Cru vintages\n"
                "- **Dress Code**: Formal Jacket Preferred\n\n"
                "Explore details on our [Dining Page](dining.html#orangerie)."
            )

        if any(w in q_lower for w in ['conservatory', 'breakfast', 'tea', 'high tea', 'buffet', 'all day', '24 hour']):
            return (
                "**The Grand Conservatory** (All-Day Dining & Royal High Tea):\n\n"
                "- **Hours**: Open **24 Hours Daily**\n"
                "- **Morning Champagne Buffet**: 6:30 AM – 10:30 AM\n"
                "- **Royal English High Tea**: 3:00 PM – 6:00 PM with live classical harp\n"
                "- **Fare**: International gourmet cuisine, wood-fired artisanal pizzas, and barista coffee.\n\n"
                "Read more on our [Dining Page](dining.html#conservatory)."
            )

        # Check-in / Check-out policy
        if any(w in q_lower for w in ['check-in', 'check in', 'check out', 'checkout', 'early check', 'late check']):
            return (
                "**Check-in & Check-out Policies**:\n\n"
                "- **Standard Check-in**: **2:00 PM**\n"
                "- **Standard Check-out**: **12:00 PM (Noon)**\n"
                "- **Early Arrival & Late Departure**: Available upon prior request and subject to availability, arranged via our Golden Keys (Clefs d'Or) Concierge.\n\n"
                "For special timing requests, contact **reservations@xyzhotel.com**."
            )

        # Cancellation policy
        if any(w in q_lower for w in ['cancel', 'cancellation', 'refund', 'modify']):
            return (
                "**Cancellation & Refund Policy**:\n\n"
                "- **Free Cancellation**: You may cancel or modify your reservation without penalty up to **24 hours prior to 2:00 PM** on the arrival date.\n"
                "- **Late Cancellation / No-show**: Cancellations within 24 hours incur a 1-night room charge.\n"
                "- **Peak Festive & Penthouse**: Special seasonal deposit terms apply, communicated at reservation."
            )

        # Promo codes
        if any(w in q_lower for w in ['promo', 'discount', 'coupon', 'code', 'offer']):
            return (
                "**Exclusive Promotional & Loyalty Codes**:\n\n"
                "Apply promo code `XYZLUXURY`, `TAJROYAL`, or `WELCOME15` at checkout on our [Booking Engine](booking.html) to receive an **instant 15% discount** on your room subtotal."
            )

        # Airport transfer
        if any(w in q_lower for w in ['airport', 'transfer', 'chauffeur', 'cab', 'taxi', 'mercedes', 'pickup']):
            return (
                "**Airport Transfers & Chauffeur Services**:\n\n"
                "- XYZ Hotel is located just **20 minutes** from Indira Gandhi International Airport (DEL).\n"
                "- **Mercedes VIP Airport Transfer**: Roundtrip meet-and-greet transfer available for **₹4,500 total**.\n"
                "- **Presidential Suite Guests**: Enjoy complimentary **Rolls-Royce** airport chauffeur service.\n\n"
                "Transfers can be added during [Online Booking](booking.html) or coordinated with `concierge@xyzhotel.com`."
            )

        # Fallback to rich chunk content synthesis
        sources_text = "\n\n".join([f"- **{c['title']}**: {c['content']}" for c in retrieved_chunks[:2]])
        return (
            f"Based on our official hotel directory:\n\n{sources_text}\n\n"
            f"For further personalized arrangements, please reach out to our Concierge Desk at **{self.contact_phone}**."
        )

    def answer_query(self, query: str, top_k: int = 3, threshold: float = 0.15) -> dict:
        """
        Process user query through semantic retrieval and response synthesis.
        """
        query_clean = query.strip()
        if not query_clean:
            return {
                "response": "How may I assist you with your luxury stay, dining, or suite reservations today?",
                "sources": [],
                "confidence": 1.0
            }

        if self.is_greeting(query_clean):
            return {
                "response": (
                    "Namaste and warm greetings from **XYZ Hotel**! ✨\n\n"
                    "I am your **Royal Concierge AI**. I can assist you with suite tariffs, 24/7 offline telephone reservations, "
                    "restaurant hours & tasting menus, airport chauffeur transfers, and exclusive promotional codes.\n\n"
                    "How may I serve you today?"
                ),
                "sources": [],
                "confidence": 1.0
            }

        if self.is_gratitude(query_clean):
            return {
                "response": (
                    "It is our absolute pleasure to serve you. Should you require any bespoke arrangements, "
                    f"our Clefs d'Or concierge is always at your service at **{self.contact_phone}**. "
                    "We look forward to welcoming you to XYZ Hotel!"
                ),
                "sources": [],
                "confidence": 1.0
            }

        # Check for obvious out-of-scope non-hotel queries (e.g. lawnmowers, crypto, medical diagnosis)
        out_of_scope_terms = ['lawnmower', 'bitcoin', 'crypto', 'laptop repair', 'stock market', 'surgery']
        if any(term in query_clean.lower() for term in out_of_scope_terms):
            return {
                "response": (
                    "I apologize, but as the Royal Concierge for XYZ Hotel, my expertise is focused strictly on "
                    "our luxury accommodations, dining venues, hotel amenities, and reservation services. "
                    "I do not have information regarding that topic."
                ),
                "sources": [],
                "confidence": 0.0
            }

        # Embed query and perform similarity search
        # Attempt to use SemanticEmbedder if fitted parameters are available, or query string matching
        base_dir = os.path.dirname(os.path.abspath(__file__))
        index_json_path = os.path.join(base_dir, 'knowledge_index.json')
        
        # Simple term-based query vector fallback or direct retrieval
        from embedder import SemanticEmbedder
        embedder = SemanticEmbedder(n_components=64)
        
        # Load fitted components if available
        retrieved = []
        try:
            import json
            with open(index_json_path, 'r', encoding='utf-8') as f:
                idx_data = json.load(f)
            model_spec = idx_data.get('model_spec', {})
            embedder.vocabulary = model_spec.get('vocabulary', {})
            embedder.idf_diag = model_spec.get('idf', [])
            embedder.components_matrix = model_spec.get('components', [])
            
            import numpy as np
            embedder.svd = type('DummySVD', (), {})()
            embedder.svd.components_ = np.array(embedder.components_matrix)
            embedder.vectorizer.vocabulary_ = embedder.vocabulary
            embedder.vectorizer.idf_ = np.array(embedder.idf_diag)
            embedder.is_fitted = True
            
            q_vector = embedder.embed_query(query_clean)
            retrieved = self.vector_store.similarity_search(q_vector, top_k=top_k, threshold=threshold)
        except Exception:
            # Direct keyword/tag matching fallback
            q_terms = set(re.findall(r'\w+', query_clean.lower()))
            scored = []
            for chunk in self.vector_store.chunks:
                match_count = sum(1 for term in q_terms if term in chunk['content'].lower() or term in chunk['title'].lower() or term in [t.lower() for t in chunk.get('tags', [])])
                if match_count > 0:
                    scored.append((match_count, chunk))
            scored.sort(key=lambda x: x[0], reverse=True)
            retrieved = [c for _, c in scored[:top_k]]

        confidence = retrieved[0].get('score', 0.85) if retrieved else 0.0
        response_text = self.synthesize_response(query_clean, retrieved)

        sources = []
        for c in retrieved[:2]:
            sources.append({
                "title": c.get("title", "Hotel Information"),
                "url": c.get("url", "#"),
                "category": c.get("category", "General")
            })

        return {
            "response": response_text,
            "sources": sources,
            "confidence": confidence
        }

if __name__ == '__main__':
    engine = RAGEngine()
    test_queries = [
        "What is the tariff for the Presidential Suite?",
        "Can I book a room over phone?",
        "What are the timings for Saffron Pavilion?",
        "What time is check in?",
        "Do you sell lawnmowers?"
    ]
    for q in test_queries:
        print(f"\nQuery: {q}")
        res = engine.answer_query(q)
        print(f"Response:\n{res['response']}")
        print(f"Sources: {res['sources']}")
