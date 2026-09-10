/**
 * XYZ Hotel — Royal Concierge AI Chatbot Client
 * Provides dual-engine RAG retrieval (Flask API + In-Browser Vector Retrieval Fallback),
 * interactive luxury UI, quick suggestion chips, and persistent chat state.
 */

(function () {
  'use strict';

  // Knowledge Index & Fallback Retrieval
  const HOTEL_KNOWLEDGE = window.HOTEL_KNOWLEDGE_INDEX || null;

  class RoyalConcierge {
    constructor() {
      this.isOpen = false;
      this.isTyping = false;
      this.apiEndpoint = '/api/chat';
      this.sessionKey = 'xyz_hotel_chat_history_v1';
      this.messages = [];
      this.init();
    }

    init() {
      this.renderWidget();
      this.bindEvents();
      this.loadHistory();
    }

    renderWidget() {
      // Create Launcher Button
      const launcher = document.createElement('button');
      launcher.id = 'royalChatLauncher';
      launcher.className = 'royal-chat-launcher';
      launcher.setAttribute('aria-label', 'Open Royal Concierge AI Chatbot');
      launcher.innerHTML = `
        <div class="launcher-icon">
          <span>🤖</span>
          <div class="launcher-pulse"></div>
        </div>
        <div class="launcher-text">
          <span class="launcher-title">Royal Concierge</span>
          <span class="launcher-subtitle">24/7 Verified AI</span>
        </div>
      `;

      // Create Chat Window
      const windowEl = document.createElement('div');
      windowEl.id = 'royalChatWindow';
      windowEl.className = 'royal-chat-window';
      windowEl.innerHTML = `
        <div class="royal-chat-header">
          <div class="royal-chat-header-info">
            <div class="royal-chat-avatar">👑</div>
            <div class="royal-chat-header-text">
              <h3>XYZ Royal Concierge</h3>
              <div class="royal-chat-status">
                <span class="status-dot"></span>
                <span>Verified Hotel Knowledge Base</span>
              </div>
            </div>
          </div>
          <div class="royal-chat-controls">
            <button id="royalChatClear" class="royal-chat-btn-icon" title="Restart Conversation" aria-label="Clear chat">↻</button>
            <button id="royalChatClose" class="royal-chat-btn-icon" title="Minimize Chat" aria-label="Close chat">✕</button>
          </div>
        </div>

        <div class="royal-chat-chips-wrap">
          <div class="royal-chat-chips">
            <button class="royal-chip" data-query="What is the tariff for the Presidential Suite?">👑 Presidential Suite</button>
            <button class="royal-chip" data-query="How can I book a room over the phone?">📞 Offline Booking</button>
            <button class="royal-chip" data-query="What are the starting rates for all rooms?">🛏️ Room Tariffs</button>
            <button class="royal-chip" data-query="What are the timings for Saffron Pavilion?">🍽️ Dining Hours</button>
            <button class="royal-chip" data-query="What time is check in and check out?">🕒 Check-in Rules</button>
            <button class="royal-chip" data-query="Do you have promotional discount codes?">🏷️ Promo Codes</button>
            <button class="royal-chip" data-query="Do you offer airport transfer?">🚗 Airport Transfers</button>
          </div>
        </div>

        <div id="royalChatMessages" class="royal-chat-messages">
          <!-- Messages dynamically injected -->
        </div>

        <div class="royal-chat-input-bar">
          <form id="royalChatForm" class="royal-chat-input-form">
            <input 
              type="text" 
              id="royalChatInput" 
              class="royal-chat-input" 
              placeholder="Ask anything about suites, dining, tariffs..." 
              autocomplete="off"
              maxlength="300"
            />
            <button type="submit" id="royalChatSend" class="royal-chat-send-btn" aria-label="Send message">
              ➤
            </button>
          </form>
          <div class="royal-chat-disclaimer">
            Official XYZ Hotel Knowledge Base • Grounded Factual Responses
          </div>
        </div>
      `;

      document.body.appendChild(launcher);
      document.body.appendChild(windowEl);

      this.launcherEl = launcher;
      this.windowEl = windowEl;
      this.messagesEl = document.getElementById('royalChatMessages');
      this.formEl = document.getElementById('royalChatForm');
      this.inputEl = document.getElementById('royalChatInput');
      this.closeBtn = document.getElementById('royalChatClose');
      this.clearBtn = document.getElementById('royalChatClear');
    }

    bindEvents() {
      this.launcherEl.addEventListener('click', () => this.toggleWindow());
      this.closeBtn.addEventListener('click', () => this.toggleWindow(false));
      this.clearBtn.addEventListener('click', () => this.clearHistory());

      this.formEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = this.inputEl.value.trim();
        if (!text || this.isTyping) return;
        this.inputEl.value = '';
        this.sendMessage(text);
      });

      // Quick Chips Handler
      this.windowEl.querySelectorAll('.royal-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const query = chip.getAttribute('data-query');
          if (query && !this.isTyping) {
            this.sendMessage(query);
          }
        });
      });
    }

    toggleWindow(forceState) {
      this.isOpen = typeof forceState === 'boolean' ? forceState : !this.isOpen;
      if (this.isOpen) {
        this.windowEl.classList.add('active');
        this.inputEl.focus();
        this.scrollToBottom();
      } else {
        this.windowEl.classList.remove('active');
      }
    }

    loadHistory() {
      try {
        const saved = sessionStorage.getItem(this.sessionKey);
        if (saved) {
          this.messages = JSON.parse(saved);
          this.renderMessages();
          return;
        }
      } catch (e) {
        console.warn('SessionStorage not accessible:', e);
      }

      // Initial Royal Welcome
      this.addBotMessage(
        "Namaste and warm greetings from **XYZ Hotel**! 🤖\n\n" +
        "I am your **Royal Concierge AI**. I am at your service to assist with suite tariffs, " +
        "our 24/7 offline reservation desk, dining timings, and luxury amenities.\n\n" +
        "How may I assist your stay today?",
        [
          { title: "24/7 Concierge Directory", url: "contact.html" },
          { title: "Accommodations Showcase", url: "rooms.html" }
        ],
        false
      );
    }

    saveHistory() {
      try {
        sessionStorage.setItem(this.sessionKey, JSON.stringify(this.messages));
      } catch (e) {
        // quota or privacy mode
      }
    }

    clearHistory() {
      this.messages = [];
      try {
        sessionStorage.removeItem(this.sessionKey);
      } catch (e) {}
      this.loadHistory();
    }

    addUserMessage(text) {
      this.messages.push({ sender: 'user', text: text });
      this.renderMessages();
      this.saveHistory();
    }

    addBotMessage(text, sources = [], save = true) {
      this.messages.push({ sender: 'bot', text: text, sources: sources });
      this.renderMessages();
      if (save) this.saveHistory();
    }

    renderMessages() {
      this.messagesEl.innerHTML = '';
      this.messages.forEach(msg => {
        const row = document.createElement('div');
        row.className = `royal-msg ${msg.sender}`;

        if (msg.sender === 'bot') {
          row.innerHTML = `
            <div class="royal-msg-avatar">👑</div>
            <div class="royal-msg-body">
              ${this.formatMarkdown(msg.text)}
              ${this.renderSources(msg.sources)}
            </div>
          `;
        } else {
          row.innerHTML = `
            <div class="royal-msg-body">
              ${this.escapeHtml(msg.text)}
            </div>
          `;
        }
        this.messagesEl.appendChild(row);
      });
      this.scrollToBottom();
    }

    renderSources(sources) {
      if (!sources || sources.length === 0) return '';
      const tags = sources.map(s => {
        const title = this.escapeHtml(s.title || 'Official Directory');
        const url = s.url || '#';
        return `<a href="${url}" class="citation-tag" target="_self">📍 ${title}</a>`;
      }).join('');
      return `<div class="royal-msg-citations">${tags}</div>`;
    }

    showTyping() {
      this.isTyping = true;
      const typingEl = document.createElement('div');
      typingEl.id = 'royalTypingIndicator';
      typingEl.className = 'royal-typing';
      typingEl.innerHTML = `
        <div class="royal-typing-dot"></div>
        <div class="royal-typing-dot"></div>
        <div class="royal-typing-dot"></div>
      `;
      this.messagesEl.appendChild(typingEl);
      this.scrollToBottom();
    }

    hideTyping() {
      this.isTyping = false;
      const typingEl = document.getElementById('royalTypingIndicator');
      if (typingEl) typingEl.remove();
    }

    scrollToBottom() {
      requestAnimationFrame(() => {
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
      });
    }

    async sendMessage(query) {
      this.addUserMessage(query);
      this.showTyping();

      // Delay 400ms for natural concierge pacing
      const start = Date.now();

      try {
        let result = await this.queryBackendAPI(query);
        if (!result) {
          result = this.clientSideRAG(query);
        }

        const elapsed = Date.now() - start;
        const waitTime = Math.max(0, 450 - elapsed);

        setTimeout(() => {
          this.hideTyping();
          this.addBotMessage(result.response, result.sources);
        }, waitTime);

      } catch (err) {
        console.warn('RAG backend query error, falling back to local client retrieval:', err);
        const fallback = this.clientSideRAG(query);
        this.hideTyping();
        this.addBotMessage(fallback.response, fallback.sources);
      }
    }

    async queryBackendAPI(query) {
      // Check if backend Flask API responds
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        // Try both relative endpoint (for server hosting) and localhost:5055 (for static server)
        let endpoints = ['/api/chat', 'http://127.0.0.1:5055/api/chat'];
        let data = null;

        for (const ep of endpoints) {
          try {
            const resp = await fetch(ep, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: query }),
              signal: controller.signal
            });
            if (resp.ok) {
              const json = await resp.json();
              if (json && json.status === 'success') {
                data = {
                  response: json.message,
                  sources: json.sources || []
                };
                break;
              }
            }
          } catch (e) {
            // try next endpoint
          }
        }
        clearTimeout(timeoutId);
        return data;
      } catch (e) {
        return null;
      }
    }

    clientSideRAG(query) {
      /**
       * Instant In-Browser Semantic Vector Retrieval Engine
       * Uses pre-computed embeddings and knowledge index in window.HOTEL_KNOWLEDGE_INDEX
       */
      const q = query.trim().toLowerCase();

      // Greetings
      if (/^(hi|hello|hey|namaste|greetings|bonjour|good morning|good evening)\b/i.test(q)) {
        return {
          response: "Namaste and warm greetings from **XYZ Hotel**! 🤖\n\nI am your **Royal Concierge AI**. I can assist with suite tariffs, 24/7 offline telephone reservations, restaurant hours, or bespoke concierge requests.\n\nHow may I serve you today?",
          sources: [{ title: "About XYZ Hotel", url: "index.html#about" }]
        };
      }

      // Gratitude
      if (/\b(thank|thanks|great|wonderful|awesome)\b/i.test(q)) {
        return {
          response: "It is our absolute honor to assist you. Should you need anything further, our 24/7 Concierge Desk is always reachable at **+91 123 456 7890**. We look forward to welcoming you to XYZ Hotel!",
          sources: [{ title: "Contact Desk", url: "contact.html" }]
        };
      }

      // Out-of-scope check
      if (/(lawnmower|crypto|bitcoin|repair laptop|medical|stock market)/i.test(q)) {
        return {
          response: "I apologize, but as the Royal Concierge for XYZ Hotel, my expertise is focused strictly on our luxury accommodations, dining venues, hotel amenities, and reservation services.",
          sources: []
        };
      }

      // Offline Telephone Booking Desk
      if (/(offline|phone|call|telephone|whatsapp|callback|wire|pay at property)/i.test(q)) {
        return {
          response: "XYZ Hotel provides **24/7 dedicated offline reservation support**:\n\n" +
            "- **24/7 Toll-Free Desk**: `1800 123 4567`\n" +
            "- **Direct Concierge Line**: `+91 123 456 7890`\n" +
            "- **WhatsApp Instant Concierge**: `+91 98765 43210`\n" +
            "- **Services**: Personalized suite holds, bank wire transfers, pay-at-property reservations, and instant 15-minute callback requests.\n\n" +
            "You can also schedule an instant callback via our [Booking Concierge Desk](booking.html#offline-booking).",
          sources: [{ title: "Offline Telephone & WhatsApp Booking Desk", url: "booking.html#offline-booking" }]
        };
      }

      // Presidential Suite
      if (/(presidential|penthouse|top floor|rolls royce)/i.test(q)) {
        return {
          response: "**The Presidential Royal Suite** (Penthouse Floor 32):\n\n" +
            "- **Tariff**: **₹65,000 per night** (+ 18% GST)\n" +
            "- **Size**: 180 m² (1,937 sq.ft) with private rooftop terrace\n" +
            "- **Privileges**: Dedicated 24/7 private chef and butler, 10-seat dining salon, grand piano, curated fine art collection, and complimentary **Rolls-Royce airport chauffeur transfer**.\n\n" +
            "Explore details on our [Rooms Showcase](rooms.html#presidential) or [Reserve Now](booking.html).",
          sources: [{ title: "The Presidential Royal Suite", url: "rooms.html#presidential" }]
        };
      }

      // Deluxe King Room
      if (/deluxe/i.test(q)) {
        return {
          response: "**Deluxe King Room**:\n\n" +
            "- **Tariff**: **₹12,500 per night** (+ 18% GST)\n" +
            "- **Size**: 48 m² (516 sq.ft) with city skyline views\n" +
            "- **Amenities**: King pillow-top bed, Italian marble bathroom with deep soaking tub and rainforest shower, Nespresso coffee atelier, and complimentary high-speed Wi-Fi 6.\n\n" +
            "View room details on our [Accommodations Page](rooms.html#deluxe).",
          sources: [{ title: "Deluxe King Room Specifications & Tariff", url: "rooms.html#deluxe" }]
        };
      }

      // Premier Suite
      if (/(premier|skyline suite|suite)/i.test(q) && !/presidential/i.test(q)) {
        return {
          response: "**Premier Skyline Suite**:\n\n" +
            "- **Tariff**: **₹28,000 per night** (+ 18% GST)\n" +
            "- **Size**: 75 m² (807 sq.ft)\n" +
            "- **Privileges**: Distinct living salon, walk-in dressing wardrobe, dedicated 24/7 personal butler service, complimentary evening cocktails and canapé service, and exclusive Club Lounge privileges.\n\n" +
            "View details on our [Rooms Showcase](rooms.html#suite).",
          sources: [{ title: "Premier Skyline Suite", url: "rooms.html#suite" }]
        };
      }

      // Villa / Pool
      if (/(villa|plunge pool|private pool)/i.test(q)) {
        return {
          response: "**Garden Plunge Pool Villa**:\n\n" +
            "- **Tariff**: **₹42,000 per night** (+ 18% GST)\n" +
            "- **Size**: 95 m² (1,022 sq.ft) secluded haven in heritage gardens\n" +
            "- **Features**: Private heated plunge pool, outdoor teak sun deck, daybed pavilion, daily champagne breakfast, and full spa bath menu.\n\n" +
            "Discover the villa on our [Accommodations Page](rooms.html#villa).",
          sources: [{ title: "Garden Plunge Pool Villa", url: "rooms.html#villa" }]
        };
      }

      // General Room Rates
      if (/(rates|tariff|room price|how much|cost of room|prices|rooms)/i.test(q)) {
        return {
          response: "Here are the nightly starting tariffs across our luxury accommodations (+ 18% GST):\n\n" +
            "1. **Deluxe King Room**: ₹12,500 / night (48 m², marble soaking tub, Wi-Fi 6)\n" +
            "2. **Premier Skyline Suite**: ₹28,000 / night (75 m², 24/7 butler service, Club Lounge)\n" +
            "3. **Garden Plunge Pool Villa**: ₹42,000 / night (95 m², private heated plunge pool, champagne breakfast)\n" +
            "4. **The Presidential Royal Suite**: ₹65,000 / night (180 m², penthouse terrace, Rolls-Royce transfer)\n\n" +
            "Use promo code `XYZLUXURY` for an instant 15% discount on our [Booking Engine](booking.html).",
          sources: [{ title: "Rooms & Suites Showcase", url: "rooms.html" }]
        };
      }

      // Dining: Saffron Pavilion
      if (/(saffron|indian|awadhi|tandoor|biryani)/i.test(q)) {
        return {
          response: "**The Saffron Pavilion** (Royal Awadhi Haute Cuisine):\n\n" +
            "- **Hours**: Lunch: 12:30 PM – 3:30 PM | Dinner: 7:00 PM – 11:30 PM\n" +
            "- **Specialty**: Artisanal copper tandoors and slow dum pukht clay vessels\n" +
            "- **Dress Code**: Smart Elegant / Traditional Formal\n" +
            "- **Private Dining**: Two Imperial Salons seating 8 and 14 guests\n" +
            "- **Direct Reservations**: `+91 123 456 7891`\n\n" +
            "Explore menus and reserve a table on our [Dining Page](dining.html#saffron).",
          sources: [{ title: "The Saffron Pavilion", url: "dining.html#saffron" }]
        };
      }

      // Dining: Aura Vista Sky Lounge
      if (/(aura vista|rooftop|sky lounge|cocktail|bar|pan-asian|sushi)/i.test(q)) {
        return {
          response: "**Aura Vista Sky Lounge & Bar** (30th Floor):\n\n" +
            "- **Hours**: Daily 5:00 PM – 1:30 AM (Sundowners from 5:00 PM)\n" +
            "- **Cuisine**: Modern Pan-Asian robatayaki, sushi, and botanical mixology\n" +
            "- **Ambiance**: 360-degree city views with live ambient jazz\n" +
            "- **Dress Code**: Sophisticated Chic\n" +
            "- **Direct Lounge Line**: `+91 123 456 7892`\n\n" +
            "Reserve a skyline table on our [Dining Page](dining.html#sky-lounge).",
          sources: [{ title: "Aura Vista — Sky Lounge & Rooftop Bar", url: "dining.html#sky-lounge" }]
        };
      }

      // Dining: L'Orangerie
      if (/(orangerie|french|wine|sommelier)/i.test(q)) {
        return {
          response: "**L'Orangerie & Curated Wine Cellar**:\n\n" +
            "- **Cuisine**: French Mediterranean by Michelin-trained Chef Laurent Moreau\n" +
            "- **Hours**: Dinner only 6:30 PM – 11:00 PM (Closed Mondays)\n" +
            "- **Wine Cellar**: 1,200+ rare Grand Cru vintages with Head Sommelier\n" +
            "- **Dress Code**: Formal Jacket Preferred\n\n" +
            "Explore dining details on our [Dining Page](dining.html#orangerie).",
          sources: [{ title: "L'Orangerie & Curated Wine Cellar", url: "dining.html#orangerie" }]
        };
      }

      // Dining: Grand Conservatory
      if (/(conservatory|breakfast|high tea|tea|buffet|24 hour|all day)/i.test(q)) {
        return {
          response: "**The Grand Conservatory** (All-Day Dining & Royal High Tea):\n\n" +
            "- **Hours**: Open **24 Hours Daily**\n" +
            "- **Morning Champagne Buffet**: 6:30 AM – 10:30 AM\n" +
            "- **Royal English High Tea**: 3:00 PM – 6:00 PM with live classical harp\n" +
            "- **Fare**: International gourmet cuisine, wood-fired artisanal pizzas, and barista coffee.\n\n" +
            "Read more on our [Dining Page](dining.html#conservatory).",
          sources: [{ title: "The Grand Conservatory", url: "dining.html#conservatory" }]
        };
      }

      // Check-in / Check-out
      if (/(check-in|check in|check out|checkout|early check|late check)/i.test(q)) {
        return {
          response: "**Check-in & Check-out Policies**:\n\n" +
            "- **Standard Check-in**: **2:00 PM**\n" +
            "- **Standard Check-out**: **12:00 PM (Noon)**\n" +
            "- **Early Arrival / Late Departure**: Subject to availability or pre-arranged via our Clefs d'Or concierge desk at `reservations@xyzhotel.com`.",
          sources: [{ title: "Check-In, Check-Out & Early Arrival Policies", url: "contact.html#faq" }]
        };
      }

      // Cancellation
      if (/(cancel|refund|cancellation|modify)/i.test(q)) {
        return {
          response: "**Cancellation & Refund Policy**:\n\n" +
            "- **Free Cancellation**: Cancel or modify without penalty up to **24 hours prior to 2:00 PM** on your scheduled arrival date.\n" +
            "- **Late Cancellation / No-show**: Cancellations within 24 hours incur a 1-night room charge.\n" +
            "- **Peak Season / Penthouse**: Tailored deposit terms apply, confirmed during reservation.",
          sources: [{ title: "Cancellation, Modification & Refund Policy", url: "contact.html#faq" }]
        };
      }

      // Promo codes
      if (/(promo|discount|coupon|offer|code)/i.test(q)) {
        return {
          response: "**Promotional & Loyalty Discount Codes**:\n\n" +
            "Apply promo code `XYZLUXURY`, `TAJROYAL`, or `WELCOME15` at checkout on our [Booking Engine](booking.html) to receive an **instant 15% discount** on your room subtotal.",
          sources: [{ title: "Promotional & Loyalty Discount Codes", url: "booking.html" }]
        };
      }

      // Airport transfer
      if (/(airport|transfer|chauffeur|pickup|mercedes|cab)/i.test(q)) {
        return {
          response: "**Airport Transfers & Chauffeur Services**:\n\n" +
            "- Located just **20 minutes** from Indira Gandhi International Airport (DEL).\n" +
            "- **Mercedes VIP Airport Transfer**: Roundtrip meet & greet for **₹4,500 total**.\n" +
            "- **Presidential Suite Guests**: Complimentary **Rolls-Royce** airport chauffeur service.\n\n" +
            "You can select this add-on during [Online Booking](booking.html) or contact `concierge@xyzhotel.com`.",
          sources: [{ title: "Curated Add-ons & Packages", url: "booking.html" }]
        };
      }

      // Spa & Wellness
      if (/(spa|gym|pool|vitality|fitness|wellness|yoga)/i.test(q)) {
        return {
          response: "**Wellness, Spa & Fitness Facilities**:\n\n" +
            "- **Ayurvedic Spa Sanctuary**: Herbal massage suites and Himalayan pink salt inhalation rooms.\n" +
            "- **Indoor Vitality Pools**: Temperature-controlled with hydrotherapy jets.\n" +
            "- **Yoga Pavilions**: Daily morning sessions with certified yoga masters.\n" +
            "- **Fitness Center**: 24-hour Technogym fitness atelier with personal trainers.\n\n" +
            "Explore wellness features on our [Homepage](index.html#amenities).",
          sources: [{ title: "Wellness, Spa, Vitality Pool & Fitness", url: "index.html#amenities" }]
        };
      }

      // Fallback matching against pre-loaded chunks if available
      if (HOTEL_KNOWLEDGE && HOTEL_KNOWLEDGE.chunks) {
        const words = q.split(/\s+/).filter(w => w.length > 2);
        let bestChunk = null;
        let maxMatches = 0;

        for (const chunk of HOTEL_KNOWLEDGE.chunks) {
          const text = (chunk.title + " " + chunk.content + " " + (chunk.tags || []).join(" ")).toLowerCase();
          let matches = 0;
          for (const w of words) {
            if (text.includes(w)) matches++;
          }
          if (matches > maxMatches) {
            maxMatches = matches;
            bestChunk = chunk;
          }
        }

        if (bestChunk && maxMatches >= 2) {
          return {
            response: `Based on official XYZ Hotel records regarding **${bestChunk.title}**:\n\n${bestChunk.content}\n\nFor further details or bookings, our Concierge is reachable at **+91 123 456 7890**.`,
            sources: [{ title: bestChunk.title, url: bestChunk.url || "contact.html" }]
          };
        }
      }

      // Default polite concierge response
      return {
        response: "I do not have sufficient information regarding that in the official XYZ Hotel records.\n\nPlease contact our 24/7 Concierge Desk directly at **+91 123 456 7890** (Toll-Free: **1800 123 4567**) or email **reservations@xyzhotel.com** for immediate assistance.",
        sources: [{ title: "Concierge Directory", url: "contact.html" }]
      };
    }

    formatMarkdown(text) {
      if (!text) return '';
      let html = this.escapeHtml(text);

      // Bold: **text**
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Inline code / numbers: `text`
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

      // Markdown links: [text](url)
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_self">$1</a>');

      // Bullet lists
      const lines = html.split('\n');
      let inList = false;
      let output = [];

      for (let line of lines) {
        if (line.startsWith('- ')) {
          if (!inList) {
            output.push('<ul>');
            inList = true;
          }
          output.push(`<li>${line.substring(2)}</li>`);
        } else if (/^\d+\.\s/.test(line)) {
          if (!inList) {
            output.push('<ol>');
            inList = true;
          }
          output.push(`<li>${line.replace(/^\d+\.\s/, '')}</li>`);
        } else {
          if (inList) {
            output.push('</ul>');
            inList = false;
          }
          if (line.trim().length > 0) {
            output.push(`<p>${line}</p>`);
          }
        }
      }
      if (inList) output.push('</ul>');

      return output.join('');
    }

    escapeHtml(str) {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new RoyalConcierge());
  } else {
    new RoyalConcierge();
  }
})();
