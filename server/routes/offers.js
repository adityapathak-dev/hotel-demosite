/**
 * XYZ Hotel — Offers & Promotions API Routes
 * Exclusive offers catalog, promo code validation, and admin CRUD.
 */

const express = require('express');
const router = express.Router();
const { prisma, isDatabaseConnected } = require('../prisma');

// Fallback offers
const FALLBACK_OFFERS = [
  {
    id: 'offer-1',
    slug: 'early-bird',
    title: 'Early Bird Reserve Special',
    badgeText: '20% OFF',
    discountPercent: 0.20,
    promoCode: 'XYZLUXURY',
    description: 'Book 30 days in advance to unlock 20% savings on our Signature Deluxe Rooms and Premier Skyline Suites, including complimentary champagne breakfast.',
    terms: 'Valid on bookings made 30+ days prior to arrival. Non-refundable. Blackout dates apply.',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 86400000 * 90).toISOString(),
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'offer-2',
    slug: 'royal-heritage-package',
    title: 'Royal Heritage & Spa Escape',
    badgeText: 'LUXURY PACKAGE',
    discountPercent: 0.15,
    promoCode: 'ROYALSPA',
    description: 'A curated 3-night stay featuring airport Rolls-Royce transfer, daily Ayurvedic spa therapies for two, and a bespoke four-course dinner at The Saffron Pavilion.',
    terms: 'Minimum 3-night stay required. Includes complimentary high tea daily.',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80',
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 86400000 * 120).toISOString(),
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'offer-3',
    slug: 'suite-sensation',
    title: 'Suite Sensation & High Floor Upgrade',
    badgeText: 'FREE UPGRADE',
    discountPercent: 0.10,
    promoCode: 'SUITEVIP',
    description: 'Complimentary high-floor skyline upgrade on all Premier Suites, complete with 24/7 dedicated butler service and private evening club lounge access.',
    terms: 'Subject to suite availability upon confirmation.',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80',
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 86400000 * 60).toISOString(),
    sortOrder: 3,
    isActive: true,
  },
];

let inMemoryOffers = [...FALLBACK_OFFERS];

/**
 * GET /api/offers
 * List active offers for guests, or all for admin
 */
router.get('/', async (req, res) => {
  try {
    const { all } = req.query;

    if (isDatabaseConnected()) {
      const offers = await prisma.offer.findMany({
        where: all === 'true' ? {} : { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      return res.json({ success: true, data: offers });
    }

    const results = all === 'true' ? inMemoryOffers : inMemoryOffers.filter((o) => o.isActive);
    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error in GET /api/offers:', error);
    res.json({ success: true, data: inMemoryOffers.filter((o) => o.isActive) });
  }
});

/**
 * GET /api/offers/validate?code=XYZLUXURY
 * Validate promo code during booking checkout
 */
router.get('/validate', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Promo code is required' });
    }

    const cleanCode = code.trim().toUpperCase();

    if (isDatabaseConnected()) {
      const offer = await prisma.offer.findFirst({
        where: {
          promoCode: { equals: cleanCode, mode: 'insensitive' },
          isActive: true,
        },
      });

      if (offer) {
        return res.json({
          success: true,
          valid: true,
          data: {
            title: offer.title,
            promoCode: offer.promoCode,
            discountPercent: offer.discountPercent,
            discountText: `${Math.round(offer.discountPercent * 100)}% OFF`,
            description: offer.description,
          },
        });
      }
    }

    // Fallback checks
    const match = inMemoryOffers.find(
      (o) => o.isActive && o.promoCode && o.promoCode.toUpperCase() === cleanCode
    );

    if (match) {
      return res.json({
        success: true,
        valid: true,
        data: {
          title: match.title,
          promoCode: match.promoCode,
          discountPercent: match.discountPercent,
          discountText: `${Math.round(match.discountPercent * 100)}% OFF`,
          description: match.description,
        },
      });
    }

    // Common standard promo codes
    if (cleanCode === 'XYZLUXURY' || cleanCode === 'WELCOME15') {
      return res.json({
        success: true,
        valid: true,
        data: {
          title: 'Signature Guest Privilege',
          promoCode: cleanCode,
          discountPercent: 0.15,
          discountText: '15% OFF',
          description: '15% savings applied on all luxury suites',
        },
      });
    }

    return res.json({
      success: true,
      valid: false,
      message: 'Invalid or expired promotional code.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error validating promo code', error: error.message });
  }
});

/**
 * POST /api/offers
 * Create new offer (Admin)
 */
router.post('/', async (req, res) => {
  try {
    const { title, slug, badgeText, discountPercent, promoCode, description, terms, imageUrl, validFrom, validUntil, sortOrder = 0, isActive = true } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required' });
    }

    const targetSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    if (isDatabaseConnected()) {
      const created = await prisma.offer.create({
        data: {
          title,
          slug: targetSlug,
          badgeText: badgeText || 'SPECIAL',
          discountPercent: Number(discountPercent) || 0.15,
          promoCode: promoCode ? promoCode.toUpperCase() : null,
          description,
          terms,
          imageUrl,
          validFrom: validFrom ? new Date(validFrom) : new Date(),
          validUntil: validUntil ? new Date(validUntil) : null,
          sortOrder: Number(sortOrder) || 0,
          isActive: Boolean(isActive),
        },
      });
      return res.status(201).json({ success: true, message: 'Offer created', data: created });
    }

    const newOffer = {
      id: `offer-${Date.now()}`,
      title,
      slug: targetSlug,
      badgeText: badgeText || 'SPECIAL',
      discountPercent: Number(discountPercent) || 0.15,
      promoCode: promoCode ? promoCode.toUpperCase() : null,
      description,
      terms,
      imageUrl,
      validFrom: validFrom || new Date().toISOString(),
      validUntil: validUntil || null,
      sortOrder,
      isActive,
    };
    inMemoryOffers.push(newOffer);

    return res.status(201).json({ success: true, message: 'Offer created', data: newOffer });
  } catch (error) {
    console.error('Error in POST /api/offers:', error);
    res.status(500).json({ success: false, message: 'Failed to create offer', error: error.message });
  }
});

/**
 * PUT /api/offers/:id
 * Update offer (Admin)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.discountPercent) data.discountPercent = Number(data.discountPercent);
    if (data.promoCode) data.promoCode = data.promoCode.toUpperCase();

    if (isDatabaseConnected()) {
      const updated = await prisma.offer.update({
        where: { id },
        data,
      });
      return res.json({ success: true, message: 'Offer updated', data: updated });
    }

    const idx = inMemoryOffers.findIndex((o) => o.id === id || o.slug === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Offer not found' });
    inMemoryOffers[idx] = { ...inMemoryOffers[idx], ...data };
    return res.json({ success: true, message: 'Offer updated', data: inMemoryOffers[idx] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update offer', error: error.message });
  }
});

/**
 * DELETE /api/offers/:id
 * Delete offer (Admin)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isDatabaseConnected()) {
      await prisma.offer.delete({ where: { id } });
      return res.json({ success: true, message: 'Offer deleted' });
    }

    inMemoryOffers = inMemoryOffers.filter((o) => o.id !== id && o.slug !== id);
    return res.json({ success: true, message: 'Offer deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete offer', error: error.message });
  }
});

module.exports = router;
