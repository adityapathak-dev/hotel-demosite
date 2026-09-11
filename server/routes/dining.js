/**
 * XYZ Hotel — Dining & Culinary API Routes
 * Venue catalog, full admin CRUD, and table reservation management.
 */

const express = require('express');
const router = express.Router();
const { prisma, isDatabaseConnected } = require('../prisma');

// Fallback dining venues
const FALLBACK_RESTAURANTS = [
  {
    id: 'rest-1',
    slug: 'saffron',
    name: 'The Saffron Pavilion',
    cuisine: 'Royal Awadhi Haute Cuisine',
    description: 'Immerse yourself in authentic royal culinary heritage with slow-simmered dum pukht biryanis, silken galouti kebabs, and rare regional spices prepared under the direction of master ustaads.',
    hours: 'Lunch: 12:30 PM - 3:30 PM | Dinner: 7:00 PM - 11:30 PM',
    atmosphere: 'Handcrafted jali screens & ambient classical sitar',
    dressCode: 'Smart Elegant / Traditional Formal',
    phone: '+91 123 456 7891',
    images: ['images/dining.jpg'],
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'rest-2',
    slug: 'sky-lounge',
    name: 'Aura Vista Sky Lounge',
    cuisine: 'Artisanal Cocktails & Nikkei Small Plates',
    description: 'Perched on the 32nd floor with 360-degree city skyline panoramas, Aura Vista pairs Japanese-Peruvian Nikkei bites with custom barrel-aged mixology and rare vintage labels.',
    hours: '5:00 PM - 1:30 AM Daily',
    atmosphere: 'Panoramic sunset terrace & curated ambient deep lounge sets',
    dressCode: 'Upscale Chic',
    phone: '+91 123 456 7892',
    images: ['https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&q=80'],
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'rest-3',
    slug: 'orangerie',
    name: "L'Orangerie Brasserie",
    cuisine: 'French Heritage & Mediterranean Riviera',
    description: 'Sunlit conservatory dining inspired by Belle Époque Paris. Offering artisanal morning viennoiserie, freshly shucked oysters, dry-aged steaks, and organic garden salads.',
    hours: 'Breakfast: 6:30 AM - 10:30 AM | All-Day: 11:30 AM - 11:00 PM',
    atmosphere: 'Glass atrium, marble mosaic floors & live harp morning accompaniment',
    dressCode: 'Smart Casual',
    phone: '+91 123 456 7893',
    images: ['https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1200&q=80'],
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'rest-4',
    slug: 'conservatory',
    name: 'The Grand Conservatory',
    cuisine: 'English Afternoon High Tea & Artisanal Patisserie',
    description: 'A botanical haven beneath soaring crystal cupolas, celebrated for traditional multi-tiered High Tea, bespoke single-estate Darjeeling harvests, and French patisserie.',
    hours: 'High Tea: 2:30 PM - 6:30 PM Daily',
    atmosphere: 'Lush exotic palms, fine bone china, classical grand piano',
    dressCode: 'Smart Casual',
    phone: '+91 123 456 7894',
    images: ['https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80'],
    sortOrder: 4,
    isActive: true,
  },
];

let inMemoryRestaurants = [...FALLBACK_RESTAURANTS];
let inMemoryReservations = [];

/**
 * GET /api/dining
 * Fetch all active dining venues
 */
router.get('/', async (req, res) => {
  try {
    if (isDatabaseConnected()) {
      const restaurants = await prisma.restaurant.findMany({
        where: req.query.all === 'true' ? {} : { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      return res.json({ success: true, data: restaurants });
    }

    return res.json({ success: true, data: inMemoryRestaurants });
  } catch (error) {
    console.error('Error in GET /api/dining:', error);
    res.json({ success: true, data: inMemoryRestaurants });
  }
});

/**
 * GET /api/dining/:slug
 * Fetch single dining venue by slug
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    if (isDatabaseConnected()) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { slug },
      });
      if (!restaurant) {
        return res.status(404).json({ success: false, message: 'Venue not found' });
      }
      return res.json({ success: true, data: restaurant });
    }

    const rest = inMemoryRestaurants.find((r) => r.slug === slug || r.id === slug);
    if (!rest) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
    }
    return res.json({ success: true, data: rest });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve venue', error: error.message });
  }
});

/**
 * POST /api/dining
 * Create restaurant venue (Admin)
 */
router.post('/', async (req, res) => {
  try {
    const { name, slug, cuisine, description, hours, atmosphere, dressCode, phone, images = [], isActive = true, sortOrder = 0 } = req.body;

    if (!name || !cuisine) {
      return res.status(400).json({ success: false, message: 'Venue name and cuisine are required' });
    }

    const targetSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    if (isDatabaseConnected()) {
      const created = await prisma.restaurant.create({
        data: {
          name,
          slug: targetSlug,
          cuisine,
          description: description || '',
          hours: hours || 'Open Daily',
          atmosphere,
          dressCode,
          phone,
          images: Array.isArray(images) ? images : [images],
          isActive: Boolean(isActive),
          sortOrder: Number(sortOrder) || 0,
        },
      });
      return res.status(201).json({ success: true, data: created });
    }

    const newVenue = {
      id: `rest-${Date.now()}`,
      slug: targetSlug,
      name,
      cuisine,
      description,
      hours,
      atmosphere,
      dressCode,
      phone,
      images: Array.isArray(images) ? images : [images],
      isActive,
      sortOrder,
    };
    inMemoryRestaurants.push(newVenue);
    return res.status(201).json({ success: true, data: newVenue });
  } catch (error) {
    console.error('Error in POST /api/dining:', error);
    res.status(500).json({ success: false, message: 'Failed to create dining venue', error: error.message });
  }
});

/**
 * PUT /api/dining/:id
 * Update restaurant venue (Admin)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (isDatabaseConnected()) {
      const updated = await prisma.restaurant.update({
        where: { id },
        data: updateData,
      });
      return res.json({ success: true, message: 'Dining venue updated', data: updated });
    }

    const idx = inMemoryRestaurants.findIndex((r) => r.id === id || r.slug === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
    }
    inMemoryRestaurants[idx] = { ...inMemoryRestaurants[idx], ...updateData };
    return res.json({ success: true, message: 'Dining venue updated', data: inMemoryRestaurants[idx] });
  } catch (error) {
    console.error('Error in PUT /api/dining/:id:', error);
    res.status(500).json({ success: false, message: 'Failed to update venue', error: error.message });
  }
});

/**
 * DELETE /api/dining/:id
 * Delete venue (Admin)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isDatabaseConnected()) {
      await prisma.restaurant.delete({ where: { id } });
      return res.json({ success: true, message: 'Dining venue deleted' });
    }

    inMemoryRestaurants = inMemoryRestaurants.filter((r) => r.id !== id && r.slug !== id);
    return res.json({ success: true, message: 'Dining venue deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete venue', error: error.message });
  }
});

/**
 * POST /api/dining/reserve
 * Submit table reservation
 */
router.post('/reserve', async (req, res) => {
  try {
    const { restaurantSlug, restaurantId, guestName, guestPhone, guestEmail, date, timeSlot, partySize = 2, specialRequests } = req.body;

    if (!guestName || !guestPhone || !date || !timeSlot) {
      return res.status(400).json({ success: false, message: 'Name, phone, date, and time slot are required' });
    }

    const bookingRef = `DINE-${Math.floor(10000 + Math.random() * 90000)}`;

    if (isDatabaseConnected()) {
      let targetRestaurant = null;
      if (restaurantId) {
        targetRestaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
      } else if (restaurantSlug) {
        targetRestaurant = await prisma.restaurant.findUnique({ where: { slug: restaurantSlug } });
      }

      if (!targetRestaurant) {
        targetRestaurant = await prisma.restaurant.findFirst();
      }

      if (targetRestaurant) {
        const reservation = await prisma.diningReservation.create({
          data: {
            bookingRef,
            restaurantId: targetRestaurant.id,
            guestName,
            guestPhone,
            guestEmail,
            reservationDate: new Date(date),
            timeSlot,
            partySize: Number(partySize),
            specialRequests,
            status: 'UNREAD',
          },
        });

        await prisma.notification.create({
          data: {
            type: 'DINING_RESERVATION',
            title: `Table Reservation: ${bookingRef}`,
            message: `${guestName} reserved a table for ${partySize} at ${targetRestaurant.name} on ${date} at ${timeSlot}`,
            linkUrl: '/admin#dining',
          },
        });

        return res.status(201).json({
          success: true,
          message: 'Table reservation confirmed. Our maître d’ will confirm your seating shortly.',
          data: reservation,
        });
      }
    }

    const reservation = {
      id: `dine-${Date.now()}`,
      bookingRef,
      guestName,
      guestPhone,
      guestEmail,
      reservationDate: date,
      timeSlot,
      partySize: Number(partySize),
      specialRequests,
      status: 'UNREAD',
      createdAt: new Date().toISOString(),
    };
    inMemoryReservations.unshift(reservation);

    return res.status(201).json({
      success: true,
      message: 'Table reservation confirmed. Our maître d’ will confirm your seating shortly.',
      data: reservation,
    });
  } catch (error) {
    console.error('Error in POST /api/dining/reserve:', error);
    res.status(500).json({ success: false, message: 'Failed to process table reservation', error: error.message });
  }
});

/**
 * GET /api/dining/reservations
 * List table reservations (Admin)
 */
router.get('/reservations/all', async (req, res) => {
  try {
    if (isDatabaseConnected()) {
      const reservations = await prisma.diningReservation.findMany({
        include: { restaurant: true },
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ success: true, data: reservations });
    }
    return res.json({ success: true, data: inMemoryReservations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list table reservations', error: error.message });
  }
});

module.exports = router;
