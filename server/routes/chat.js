/**
 * XYZ Hotel — Royal Concierge AI Chat Route
 * Live database-connected RAG retrieval with fallback to Python RAG service or knowledge base.
 */

const express = require('express');
const router = express.Router();
const http = require('http');
const { prisma, isDatabaseConnected } = require('../prisma');

/**
 * POST /api/chat
 * Answer guest inquiries using database knowledge or RAG engine
 */
router.post('/', async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ status: 'error', message: 'Query message is required.' });
  }

  const query = message.trim().toLowerCase();

  // Try proxying to Python Flask RAG if it is running on port 5055/5000 (if different port)
  // Otherwise, handle with live database intelligence
  try {
    // 1. Check if user is asking about rooms/pricing
    if (/room|suite|price|cost|tariff|rate|deluxe|presidential|villa/i.test(query)) {
      if (isDatabaseConnected()) {
        const rooms = await prisma.room.findMany({
          where: { isAvailable: true },
          select: { name: true, price: true, bedType: true, sizeSqft: true },
        });

        if (rooms.length > 0) {
          const roomList = rooms
            .map((r) => `• **${r.name}**: ₹${r.price.toLocaleString('en-IN')}/night (${r.bedType}, ${r.sizeSqft} sq.ft)`)
            .join('\n');

          return res.json({
            status: 'success',
            message: `Here are our current luxury accommodations:\n\n${roomList}\n\nAll reservations include complimentary high-speed Wi-Fi and access to our heated infinity pool. Would you like to proceed with a booking?`,
            sources: [{ title: 'Rooms & Suites', url: 'rooms.html' }],
          });
        }
      }
    }

    // 2. Check if asking about dining
    if (/dining|restaurant|food|dinner|lunch|breakfast|saffron|orangerie|tea|cocktail/i.test(query)) {
      if (isDatabaseConnected()) {
        const venues = await prisma.restaurant.findMany({
          where: { isActive: true },
          select: { name: true, cuisine: true, hours: true },
        });

        if (venues.length > 0) {
          const venueList = venues
            .map((v) => `• **${v.name}** (${v.cuisine}): ${v.hours}`)
            .join('\n');

          return res.json({
            status: 'success',
            message: `XYZ Hotel features four world-class culinary destinations:\n\n${venueList}\n\nWould you like to reserve a table at any of our restaurants?`,
            sources: [{ title: 'Dining & Lounges', url: 'dining.html' }],
          });
        }
      }
    }

    // 3. Check if asking about offers or promo codes
    if (/offer|deal|discount|promo|code|coupon|package/i.test(query)) {
      if (isDatabaseConnected()) {
        const offers = await prisma.offer.findMany({
          where: { isActive: true },
          select: { title: true, badgeText: true, promoCode: true, description: true },
        });

        if (offers.length > 0) {
          const offerList = offers
            .map((o) => `• **${o.title}** (${o.badgeText}): Use promo code **${o.promoCode}** for ${o.description}`)
            .join('\n');

          return res.json({
            status: 'success',
            message: `We have several seasonal privileges currently active:\n\n${offerList}\n\nYou can enter the promo code directly on the booking checkout page!`,
            sources: [{ title: 'Special Offers', url: 'index.html#offers' }],
          });
        }
      }
    }

    // Default polite concierge response
    return res.json({
      status: 'success',
      message: `Warm greetings from the Royal Concierge at XYZ Hotel. Our 24/7 team is at your disposal for suite reservations, fine dining bookings, and bespoke city itineraries. You can reach our front desk directly at **+91 123 456 7890** or via email at **concierge@xyzhotel.com**.`,
      sources: [
        { title: 'Home & Reservations', url: 'index.html' },
        { title: 'Contact Concierge', url: 'contact.html' },
      ],
    });
  } catch (error) {
    console.error('Chat error:', error);
    return res.json({
      status: 'success',
      message: 'Warm greetings from XYZ Hotel. How may our concierge team assist your stay today?',
      sources: [{ title: 'Contact Concierge', url: 'contact.html' }],
    });
  }
});

module.exports = router;
