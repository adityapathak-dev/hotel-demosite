/**
 * XYZ Hotel — Rooms & Suites API Routes
 * Full CRUD, filtering, pagination, sorting, and availability checks.
 */

const express = require('express');
const router = express.Router();
const { prisma, isDatabaseConnected } = require('../prisma');

// Fallback in-memory catalog matching current website inventory
const FALLBACK_ROOMS = [
  {
    id: 'deluxe',
    slug: 'deluxe',
    name: 'Deluxe King Room',
    type: 'Signature Luxury',
    price: 12500,
    capacity: 2,
    sizeSqm: 48,
    sizeSqft: 516,
    bedType: 'King Pillow-top Bed',
    viewType: 'City Skyline View',
    description: 'Spacious 48-square-meter layout featuring custom hardwood furnishings, a plush king pillow-top bed, and panoramic city views. An oasis of calm equipped with an Italian marble en-suite bathroom with deep soaking tub and rainforest shower.',
    images: ['images/room-deluxe.jpg'],
    amenities: ['King Pillow-top Bed', '48 m²', 'Skyline View', 'Marble Deep-Soak Bath', 'Free Wi-Fi 6', 'Nespresso Atelier'],
    features: ['48 m² / 516 sq.ft', 'Panoramic Skyline View', 'King Pillow-top Bed', 'Marble Deep-Soak Bath', 'Nespresso Coffee Atelier', 'High-Speed Wi-Fi 6'],
    isAvailable: true,
    isFeatured: true,
    totalUnits: 12,
  },
  {
    id: 'suite',
    slug: 'suite',
    name: 'Premier Skyline Suite',
    type: 'Executive Collection',
    price: 28000,
    capacity: 3,
    sizeSqm: 75,
    sizeSqft: 807,
    bedType: 'King Bed + Daybed',
    viewType: '180° Panoramic View',
    description: 'Spanning 75 square meters of pure grandeur, this suite features a distinct living salon, private bar, and master bedroom with walk-in wardrobe. Guests enjoy 24-hour dedicated butler service, complimentary evening cocktails, and priority dining reservations.',
    images: ['images/room-suite.jpg'],
    amenities: ['Separate Living Salon', '75 m²', '24/7 Butler Service', 'Club Lounge Privilege', 'Walk-in Wardrobe', 'Evening Cocktails'],
    features: ['75 m² / 807 sq.ft', 'Separate Living Salon', 'Dedicated 24/7 Butler', 'Evening Canapé Service', 'Walk-in Dressing Room', 'Club Lounge Privilege'],
    isAvailable: true,
    isFeatured: true,
    totalUnits: 6,
  },
  {
    id: 'villa',
    slug: 'villa',
    name: 'Garden Plunge Pool Villa',
    type: 'Private Haven',
    price: 42000,
    capacity: 2,
    sizeSqm: 95,
    sizeSqft: 1022,
    bedType: 'Emperor King Bed',
    viewType: 'Private Botanical Garden & Pool',
    description: 'A secluded urban sanctuary set within the hotel\'s lush private heritage gardens. Step outside onto your teak wood sun deck with heated infinity plunge pool, open-air rainforest shower, and secluded lounge pavilions.',
    images: ['https://images.unsplash.com/photo-1591088398332-8a7791972843?w=1200&q=80'],
    amenities: ['Private Heated Pool', '95 m²', 'Heritage Garden', 'Outdoor Teak Deck', 'Champagne Breakfast', 'Full Spa Bath Menu'],
    features: ['95 m² / 1,022 sq.ft', 'Private Heated Plunge Pool', 'Private Botanical Garden', 'Outdoor Daybed & Deck', 'Daily Champagne Breakfast', 'Full Spa Bath Menu'],
    isAvailable: true,
    isFeatured: true,
    totalUnits: 4,
  },
  {
    id: 'presidential',
    slug: 'presidential',
    name: 'The Presidential Royal Suite',
    type: 'Crown Jewel',
    price: 65000,
    capacity: 4,
    sizeSqm: 180,
    sizeSqft: 1937,
    bedType: 'Custom Handcrafted Emperor Bed',
    viewType: '32nd Floor 360° Penthouse Horizon',
    description: 'Occupying the entire 32nd penthouse floor, the 180-square-meter Presidential Royal Suite is the benchmark of royal luxury. Features a private boardroom, grand baby grand piano, curated fine art collection, private dining room for ten, and airport Rolls-Royce chauffeur transfer.',
    images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80'],
    amenities: ['180 m² Penthouse', 'Rooftop Terrace', 'Rolls-Royce Transfer', 'Private Chef & Butler', '10-Seat Dining Salon', 'Boardroom'],
    features: ['180 m² / 1,937 sq.ft', 'Private Rooftop Terrace', 'Chauffeur Airport Transfer', 'Private Chef & Butler', '10-Seat Dining Salon', 'Bespoke Fragrance Bar'],
    isAvailable: true,
    isFeatured: true,
    totalUnits: 2,
  },
];

/**
 * GET /api/rooms
 * List all rooms with filtering, sorting, and pagination
 */
router.get('/', async (req, res) => {
  try {
    const { type, minPrice, maxPrice, guests, sort, page = 1, limit = 20, featured } = req.query;

    if (isDatabaseConnected()) {
      const where = {};
      if (type) where.type = { equals: type, mode: 'insensitive' };
      if (featured === 'true') where.isFeatured = true;
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = parseFloat(minPrice);
        if (maxPrice) where.price.lte = parseFloat(maxPrice);
      }
      if (guests) {
        where.capacity = { gte: parseInt(guests) };
      }

      let orderBy = { sortOrder: 'asc' };
      if (sort === 'price_asc') orderBy = { price: 'asc' };
      if (sort === 'price_desc') orderBy = { price: 'desc' };
      if (sort === 'name') orderBy = { name: 'asc' };

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const [rooms, total] = await Promise.all([
        prisma.room.findMany({
          where,
          orderBy,
          skip,
          take,
          include: { category: true },
        }),
        prisma.room.count({ where }),
      ]);

      return res.json({
        success: true,
        data: rooms,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / take),
        },
      });
    }

    // Fallback in-memory catalog
    let filtered = [...FALLBACK_ROOMS];
    if (type) filtered = filtered.filter(r => r.type.toLowerCase() === type.toLowerCase());
    if (minPrice) filtered = filtered.filter(r => r.price >= parseFloat(minPrice));
    if (maxPrice) filtered = filtered.filter(r => r.price <= parseFloat(maxPrice));
    if (guests) filtered = filtered.filter(r => r.capacity >= parseInt(guests));
    if (sort === 'price_asc') filtered.sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') filtered.sort((a, b) => b.price - a.price);

    return res.json({
      success: true,
      data: filtered,
      pagination: { total: filtered.length, page: 1, limit: filtered.length, pages: 1 },
    });
  } catch (err) {
    console.error('Error fetching rooms:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve rooms' });
  }
});

/**
 * GET /api/rooms/:slugOrId
 * Fetch single room details
 */
router.get('/:slugOrId', async (req, res) => {
  try {
    const { slugOrId } = req.params;

    if (isDatabaseConnected()) {
      const room = await prisma.room.findFirst({
        where: {
          OR: [{ slug: slugOrId }, { id: slugOrId }],
        },
        include: { category: true },
      });

      if (!room) {
        return res.status(404).json({ success: false, error: 'Room not found' });
      }
      return res.json({ success: true, data: room });
    }

    const found = FALLBACK_ROOMS.find(r => r.slug === slugOrId || r.id === slugOrId);
    if (!found) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }
    return res.json({ success: true, data: found });
  } catch (err) {
    console.error('Error fetching room details:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve room details' });
  }
});

/**
 * POST /api/rooms
 * Create new room (Admin/Staff)
 */
router.post('/', async (req, res) => {
  try {
    const { name, slug, type, price, capacity, sizeSqm, sizeSqft, description, images, amenities, features, isAvailable, isFeatured } = req.body;

    if (!name || !price || !description) {
      return res.status(400).json({ success: false, error: 'Name, price, and description are required.' });
    }

    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    if (isDatabaseConnected()) {
      const newRoom = await prisma.room.create({
        data: {
          name,
          slug: generatedSlug,
          type: type || 'Signature Luxury',
          price: parseFloat(price),
          capacity: parseInt(capacity) || 2,
          sizeSqm: parseInt(sizeSqm) || 48,
          sizeSqft: parseInt(sizeSqft) || 516,
          description,
          images: Array.isArray(images) ? images : (images ? [images] : []),
          amenities: Array.isArray(amenities) ? amenities : [],
          features: Array.isArray(features) ? features : [],
          isAvailable: isAvailable !== false,
          isFeatured: isFeatured === true,
        },
      });
      return res.status(201).json({ success: true, data: newRoom });
    }

    // Fallback append
    const localRoom = {
      id: generatedSlug,
      slug: generatedSlug,
      name,
      type: type || 'Signature Luxury',
      price: parseFloat(price),
      capacity: parseInt(capacity) || 2,
      sizeSqm: parseInt(sizeSqm) || 48,
      sizeSqft: parseInt(sizeSqft) || 516,
      description,
      images: images || [],
      amenities: amenities || [],
      features: features || [],
      isAvailable: true,
      isFeatured: isFeatured === true,
    };
    FALLBACK_ROOMS.push(localRoom);
    return res.status(201).json({ success: true, data: localRoom });
  } catch (err) {
    console.error('Error creating room:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to create room' });
  }
});

/**
 * PUT /api/rooms/:id
 * Update room details (instant reflection on live website)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (data.price) data.price = parseFloat(data.price);
    if (data.capacity) data.capacity = parseInt(data.capacity);
    if (data.sizeSqm) data.sizeSqm = parseInt(data.sizeSqm);
    if (data.sizeSqft) data.sizeSqft = parseInt(data.sizeSqft);

    if (isDatabaseConnected()) {
      const updated = await prisma.room.update({
        where: { id },
        data,
      });
      return res.json({ success: true, data: updated });
    }

    // Fallback update
    const idx = FALLBACK_ROOMS.findIndex(r => r.id === id || r.slug === id);
    if (idx !== -1) {
      FALLBACK_ROOMS[idx] = { ...FALLBACK_ROOMS[idx], ...data };
      return res.json({ success: true, data: FALLBACK_ROOMS[idx] });
    }
    return res.status(404).json({ success: false, error: 'Room not found' });
  } catch (err) {
    console.error('Error updating room:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to update room' });
  }
});

/**
 * DELETE /api/rooms/:id
 * Delete room
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isDatabaseConnected()) {
      await prisma.room.delete({ where: { id } });
      return res.json({ success: true, message: 'Room deleted successfully.' });
    }

    const idx = FALLBACK_ROOMS.findIndex(r => r.id === id || r.slug === id);
    if (idx !== -1) {
      FALLBACK_ROOMS.splice(idx, 1);
      return res.json({ success: true, message: 'Room removed from catalog.' });
    }
    return res.status(404).json({ success: false, error: 'Room not found' });
  } catch (err) {
    console.error('Error deleting room:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete room' });
  }
});

module.exports = router;
