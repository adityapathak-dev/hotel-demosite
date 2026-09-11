/**
 * XYZ Hotel — Cinematic Video & Media Gallery API Routes
 * Manages hotel promotional videos, room walk-throughs, culinary showcases, and spa tours.
 */

const express = require('express');
const router = express.Router();
const { prisma, isDatabaseConnected } = require('../prisma');

// Curated initial hotel showcase videos
const DEFAULT_VIDEOS = [
  {
    id: 'vid-1',
    title: 'XYZ Hotel — Architectural Grandeur & Heritage Sanctuary',
    description: 'Step inside the majestic palace enclave of XYZ Hotel, where timeless heritage architecture meets five-star modern luxury.',
    category: 'Property Tour',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-luxury-hotel-hallway-and-room-41135-large.mp4',
    thumbnailUrl: 'images/hero-bg.jpg',
    duration: '2:45',
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vid-2',
    title: 'The Presidential Royal Suite — Penthouse Sanctuary Walkthrough',
    description: 'A private walkthrough of the 32nd-floor Penthouse Royal Suite with dedicated butler salon and 360-degree terrace.',
    category: 'Suites & Rooms',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-luxurious-hotel-bedroom-with-a-view-41136-large.mp4',
    thumbnailUrl: 'images/room-suite.jpg',
    duration: '1:50',
    isFeatured: true,
    isActive: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vid-3',
    title: 'The Saffron Pavilion — Nawabi Culinary Heritage & Copper Pots',
    description: 'Heirloom Awadhi recipes slow-cooked in copper vessels, paired with sitar melodies and regal service.',
    category: 'Dining & Bars',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-dish-in-a-restaurant-kitchen-41142-large.mp4',
    thumbnailUrl: 'images/dining-fine.jpg',
    duration: '2:10',
    isFeatured: true,
    isActive: true,
    sortOrder: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vid-4',
    title: 'Luxury Spa & Holistic Ayurvedic Wellness Rituals',
    description: 'Ancient Ayurvedic rejuvenation, Himalayan pink salt therapy, and vitality hydrotherapy pools.',
    category: 'Spa & Wellness',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-masseur-massaging-a-person-s-back-41144-large.mp4',
    thumbnailUrl: 'images/hero.jpg',
    duration: '2:20',
    isFeatured: true,
    isActive: true,
    sortOrder: 4,
    createdAt: new Date().toISOString(),
  },
];

let inMemoryVideos = [...DEFAULT_VIDEOS];

/**
 * Ensures initial default videos exist in DB
 */
async function ensureDefaultVideos() {
  if (!isDatabaseConnected()) return;
  try {
    const count = await prisma.hotelVideo.count();
    if (count === 0) {
      for (const v of DEFAULT_VIDEOS) {
        await prisma.hotelVideo.create({
          data: {
            title: v.title,
            description: v.description,
            category: v.category,
            videoUrl: v.videoUrl,
            thumbnailUrl: v.thumbnailUrl,
            duration: v.duration,
            isFeatured: v.isFeatured,
            isActive: v.isActive,
            sortOrder: v.sortOrder,
          },
        });
      }
      console.log('✓ Initialized default hotel showcase videos in PostgreSQL.');
    }
  } catch (err) {
    console.warn('Could not check/seed default hotel videos:', err.message);
  }
}

// Trigger initial check asynchronously
setTimeout(ensureDefaultVideos, 2000);

/**
 * GET /api/gallery
 * Retrieve hotel showcase videos
 */
router.get('/', async (req, res) => {
  try {
    const { all, category, featured } = req.query;

    if (isDatabaseConnected()) {
      const where = {};
      if (all !== 'true') where.isActive = true;
      if (category && category !== 'All') where.category = category;
      if (featured === 'true') where.isFeatured = true;

      const videos = await prisma.hotelVideo.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      });

      // If DB returned videos, return them
      if (videos.length > 0) {
        return res.json({ success: true, data: videos });
      }

      // If empty in DB, seed and return defaults
      await ensureDefaultVideos();
      const freshVideos = await prisma.hotelVideo.findMany({ where, orderBy: { sortOrder: 'asc' } });
      if (freshVideos.length > 0) {
        return res.json({ success: true, data: freshVideos });
      }
    }

    // In-memory fallback
    let list = inMemoryVideos;
    if (all !== 'true') list = list.filter((v) => v.isActive);
    if (category && category !== 'All') list = list.filter((v) => v.category === category);
    if (featured === 'true') list = list.filter((v) => v.isFeatured);

    res.json({ success: true, data: list });
  } catch (err) {
    console.error('Error in GET /api/gallery:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve videos', error: err.message });
  }
});

/**
 * GET /api/gallery/:id
 * Retrieve a single video
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isDatabaseConnected()) {
      const video = await prisma.hotelVideo.findUnique({ where: { id } });
      if (video) return res.json({ success: true, data: video });
    }

    const mem = inMemoryVideos.find((v) => v.id === id);
    if (mem) return res.json({ success: true, data: mem });

    res.status(404).json({ success: false, message: 'Video not found' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch video', error: err.message });
  }
});

/**
 * POST /api/gallery
 * Create a new hotel video
 */
router.post('/', async (req, res) => {
  try {
    const { title, description, category, videoUrl, thumbnailUrl, duration, isFeatured, isActive, sortOrder } = req.body;

    if (!title || !videoUrl) {
      return res.status(400).json({ success: false, message: 'Video title and video URL or upload are required.' });
    }

    const videoData = {
      title: title.trim(),
      description: (description || '').trim(),
      category: category || 'Property Tour',
      videoUrl: videoUrl.trim(),
      thumbnailUrl: (thumbnailUrl || 'images/hero-bg.jpg').trim(),
      duration: (duration || '2:00').trim(),
      isFeatured: isFeatured === true || isFeatured === 'true',
      isActive: isActive !== false && isActive !== 'false',
      sortOrder: parseInt(sortOrder, 10) || 0,
    };

    if (isDatabaseConnected()) {
      const saved = await prisma.hotelVideo.create({ data: videoData });
      return res.status(201).json({ success: true, message: 'Video created successfully', data: saved });
    }

    const newItem = { id: `vid-${Date.now()}`, ...videoData, createdAt: new Date().toISOString() };
    inMemoryVideos.unshift(newItem);
    res.status(201).json({ success: true, message: 'Video created in resilient memory', data: newItem });
  } catch (err) {
    console.error('Error in POST /api/gallery:', err);
    res.status(500).json({ success: false, message: 'Failed to create video', error: err.message });
  }
});

/**
 * PUT /api/gallery/:id
 * Update an existing hotel video
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, videoUrl, thumbnailUrl, duration, isFeatured, isActive, sortOrder } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (category !== undefined) updates.category = category;
    if (videoUrl !== undefined) updates.videoUrl = videoUrl.trim();
    if (thumbnailUrl !== undefined) updates.thumbnailUrl = thumbnailUrl.trim();
    if (duration !== undefined) updates.duration = duration.trim();
    if (isFeatured !== undefined) updates.isFeatured = isFeatured === true || isFeatured === 'true';
    if (isActive !== undefined) updates.isActive = isActive === true || isActive === 'true';
    if (sortOrder !== undefined) updates.sortOrder = parseInt(sortOrder, 10) || 0;

    if (isDatabaseConnected()) {
      const updated = await prisma.hotelVideo.update({
        where: { id },
        data: updates,
      });
      return res.json({ success: true, message: 'Video updated successfully', data: updated });
    }

    const idx = inMemoryVideos.findIndex((v) => v.id === id);
    if (idx !== -1) {
      inMemoryVideos[idx] = { ...inMemoryVideos[idx], ...updates, updatedAt: new Date().toISOString() };
      return res.json({ success: true, message: 'Video updated', data: inMemoryVideos[idx] });
    }

    res.status(404).json({ success: false, message: 'Video not found' });
  } catch (err) {
    console.error('Error in PUT /api/gallery/:id:', err);
    res.status(500).json({ success: false, message: 'Failed to update video', error: err.message });
  }
});

/**
 * DELETE /api/gallery/:id
 * Remove a hotel video
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isDatabaseConnected()) {
      await prisma.hotelVideo.delete({ where: { id } });
      return res.json({ success: true, message: 'Video deleted from database' });
    }

    const initialLen = inMemoryVideos.length;
    inMemoryVideos = inMemoryVideos.filter((v) => v.id !== id);
    if (inMemoryVideos.length < initialLen) {
      return res.json({ success: true, message: 'Video deleted' });
    }

    res.status(404).json({ success: false, message: 'Video not found' });
  } catch (err) {
    console.error('Error in DELETE /api/gallery/:id:', err);
    res.status(500).json({ success: false, message: 'Failed to delete video', error: err.message });
  }
});

module.exports = router;
