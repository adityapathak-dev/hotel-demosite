/**
 * XYZ Hotel — Newsletter Subscribers API Routes
 */

const express = require('express');
const router = express.Router();
const { prisma, isDatabaseConnected } = require('../prisma');

let inMemorySubscribers = [
  { id: 'sub-1', email: 'guest.vip@luxurydiary.com', isActive: true, subscribedAt: new Date().toISOString() },
  { id: 'sub-2', email: 'traveler@connoisseur.com', isActive: true, subscribedAt: new Date().toISOString() },
];

/**
 * POST /api/newsletter/subscribe
 * Register email for seasonal offers & journal
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isDatabaseConnected()) {
      const subscriber = await prisma.newsletterSubscriber.upsert({
        where: { email: cleanEmail },
        update: { isActive: true },
        create: { email: cleanEmail },
      });

      return res.status(201).json({
        success: true,
        message: 'You have been subscribed to our seasonal journal and private privileges.',
        data: subscriber,
      });
    }

    const exists = inMemorySubscribers.find((s) => s.email === cleanEmail);
    if (!exists) {
      inMemorySubscribers.push({
        id: `sub-${Date.now()}`,
        email: cleanEmail,
        isActive: true,
        subscribedAt: new Date().toISOString(),
      });
    }

    return res.status(201).json({
      success: true,
      message: 'You have been subscribed to our seasonal journal and private privileges.',
    });
  } catch (error) {
    console.error('Error in POST /api/newsletter/subscribe:', error);
    res.status(500).json({ success: false, message: 'Subscription failed', error: error.message });
  }
});

/**
 * GET /api/newsletter/subscribers
 * List all subscribers (Admin)
 */
router.get('/subscribers', async (req, res) => {
  try {
    if (isDatabaseConnected()) {
      const subscribers = await prisma.newsletterSubscriber.findMany({
        orderBy: { subscribedAt: 'desc' },
      });
      return res.json({ success: true, data: subscribers });
    }
    return res.json({ success: true, data: inMemorySubscribers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve subscribers', error: error.message });
  }
});

module.exports = router;
