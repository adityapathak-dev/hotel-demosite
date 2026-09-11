/**
 * XYZ Hotel — Reviews & Guest Testimonials API Routes
 * Guest feedback submission, rating computation, and admin moderation.
 */

const express = require('express');
const router = express.Router();
const { prisma, isDatabaseConnected } = require('../prisma');

// Fallback reviews matching website testimonials
const FALLBACK_REVIEWS = [
  {
    id: 'rev-1',
    authorName: 'Alistair Finch-Hatton',
    location: 'London, United Kingdom',
    roomStayed: 'The Presidential Royal Suite',
    rating: 5,
    comment: 'An architectural triumph. The discrete butler service, private dining salon, and sweeping views of the city horizon elevate XYZ Hotel above every luxury establishment I have visited in Europe and Asia.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    isPublished: true,
    isFeatured: true,
    stayDate: 'November 2025',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rev-2',
    authorName: 'Dr. Evelyn Montgomery',
    location: 'Zurich, Switzerland',
    roomStayed: 'Garden Plunge Pool Villa',
    rating: 5,
    comment: 'The plunge pool villa was an absolute sanctuary of peace. The Ayurvedic therapies at Ananda Spa melted weeks of conference fatigue away. Truly the pinnacle of mindful hospitality.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    isPublished: true,
    isFeatured: true,
    stayDate: 'December 2025',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rev-3',
    authorName: 'Rajesh & Sunita Singhania',
    location: 'Mumbai, India',
    roomStayed: 'Premier Skyline Suite',
    rating: 5,
    comment: 'We celebrated our 25th anniversary here. From the personalized welcome champagne to the masterclass tasting menu at The Saffron Pavilion, every detail spoke of quiet perfection.',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
    isPublished: true,
    isFeatured: true,
    stayDate: 'January 2026',
    createdAt: new Date().toISOString(),
  },
];

let inMemoryReviews = [...FALLBACK_REVIEWS];

/**
 * GET /api/reviews
 * List published guest reviews
 */
router.get('/', async (req, res) => {
  try {
    const { featured, all } = req.query;

    if (isDatabaseConnected()) {
      const where = all === 'true' ? {} : { isPublished: true };
      if (featured === 'true') where.isFeatured = true;

      const reviews = await prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ success: true, data: reviews });
    }

    let results = all === 'true' ? inMemoryReviews : inMemoryReviews.filter((r) => r.isPublished);
    if (featured === 'true') {
      results = results.filter((r) => r.isFeatured);
    }
    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error in GET /api/reviews:', error);
    res.json({ success: true, data: inMemoryReviews });
  }
});

/**
 * POST /api/reviews
 * Submit a new guest review
 */
router.post('/', async (req, res) => {
  try {
    const { authorName, location, roomStayed, rating = 5, comment, avatarUrl, stayDate } = req.body;

    if (!authorName || !comment) {
      return res.status(400).json({ success: false, message: 'Author name and review comment are required' });
    }

    const numRating = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));

    if (isDatabaseConnected()) {
      const review = await prisma.review.create({
        data: {
          authorName,
          location,
          roomStayed,
          rating: numRating,
          comment,
          avatarUrl,
          stayDate: stayDate || 'Recent Stay',
          isPublished: true, // auto-publish or queue for moderation
        },
      });

      await prisma.notification.create({
        data: {
          type: 'NEW_REVIEW',
          title: `New Review (${numRating}/5 Stars)`,
          message: `${authorName} reviewed ${roomStayed || 'the hotel'}: "${comment.slice(0, 80)}..."`,
          linkUrl: '/admin#reviews',
        },
      });

      return res.status(201).json({ success: true, message: 'Thank you for your review', data: review });
    }

    const newRev = {
      id: `rev-${Date.now()}`,
      authorName,
      location,
      roomStayed,
      rating: numRating,
      comment,
      avatarUrl,
      stayDate: stayDate || 'Recent Stay',
      isPublished: true,
      isFeatured: false,
      createdAt: new Date().toISOString(),
    };
    inMemoryReviews.unshift(newRev);

    return res.status(201).json({ success: true, message: 'Thank you for your review', data: newRev });
  } catch (error) {
    console.error('Error in POST /api/reviews:', error);
    res.status(500).json({ success: false, message: 'Failed to submit review', error: error.message });
  }
});

/**
 * PUT /api/reviews/:id
 * Moderate review (publish/unpublish, feature)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished, isFeatured, comment, rating } = req.body;

    const data = {};
    if (typeof isPublished === 'boolean') data.isPublished = isPublished;
    if (typeof isFeatured === 'boolean') data.isFeatured = isFeatured;
    if (comment) data.comment = comment;
    if (rating) data.rating = Number(rating);

    if (isDatabaseConnected()) {
      const updated = await prisma.review.update({
        where: { id },
        data,
      });
      return res.json({ success: true, message: 'Review updated', data: updated });
    }

    const idx = inMemoryReviews.findIndex((r) => r.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Review not found' });
    inMemoryReviews[idx] = { ...inMemoryReviews[idx], ...data };
    return res.json({ success: true, message: 'Review updated', data: inMemoryReviews[idx] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update review', error: error.message });
  }
});

/**
 * DELETE /api/reviews/:id
 * Delete review
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isDatabaseConnected()) {
      await prisma.review.delete({ where: { id } });
      return res.json({ success: true, message: 'Review removed' });
    }

    inMemoryReviews = inMemoryReviews.filter((r) => r.id !== id);
    return res.json({ success: true, message: 'Review removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove review', error: error.message });
  }
});

module.exports = router;
