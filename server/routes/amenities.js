/**
 * XYZ Hotel — Amenities & Spa Wellness API Routes
 * Amenities catalog, full admin CRUD, and Spa appointment scheduling.
 */

const express = require('express');
const router = express.Router();
const { prisma, isDatabaseConnected } = require('../prisma');

// Fallback amenities
const FALLBACK_AMENITIES = [
  {
    id: 'amenity-1',
    slug: 'luxury-spa',
    name: 'Ananda Heritage Spa',
    category: 'Wellness',
    description: 'An oasis of holistic rejuvenation blending ancient Vedic Ayurvedic therapies, Swedish deep-tissue rituals, and organic rose petal baths.',
    features: ['Vedic Ayurvedic Rituals', 'Steam & Crystal Sauna', 'Herbal Soaking Baths', 'Couples Treatment Pavilion', 'Aromatherapy Suites'],
    hours: 'Daily: 8:00 AM - 10:00 PM',
    images: ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80'],
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'amenity-2',
    slug: 'infinity-pool',
    name: 'Temperature-Controlled Horizon Pool',
    category: 'Leisure',
    description: 'A 25-meter azure infinity pool framed by Italian sandstone, plush private cabanas, and attentive poolside cocktail service.',
    features: ['25-Meter Heated Lap Pool', 'Private Sun Cabanas', 'Underwater Audio Acoustics', 'Poolside Refreshment Bar', 'Sunset Horizon Views'],
    hours: 'Daily: 6:00 AM - 9:00 PM',
    images: ['https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1200&q=80'],
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'amenity-3',
    slug: 'fitness-centre',
    name: 'State-of-the-Art Technogym Centre',
    category: 'Wellness',
    description: 'Equipped with the latest Technogym Artis series, dedicated Olympic lifting platform, personal trainers, and private yoga/pilates studio.',
    features: ['Technogym Artis Equipment', 'Certified Personal Trainers', 'Pilates & Yoga Studio', 'Complimentary Protein Bar', 'Biometric Performance Tracking'],
    hours: 'Open 24 Hours with Keycard',
    images: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80'],
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'amenity-4',
    slug: 'private-chauffeur',
    name: 'Rolls-Royce & Mercedes Fleet',
    category: 'Concierge',
    description: 'Seamless door-to-door luxury airport transfers and custom city architectural tours with professional uniformed chauffeurs.',
    features: ['Rolls-Royce Ghost & Mercedes S-Class', 'Complimentary Wi-Fi & Evian in transit', 'Flight tracking & meet-and-greet', 'City Heritage Itineraries'],
    hours: 'Available 24/7 on Request',
    images: ['https://images.unsplash.com/photo-1563720223185-11003d516935?w=1200&q=80'],
    sortOrder: 4,
    isActive: true,
  },
];

let inMemoryAmenities = [...FALLBACK_AMENITIES];
let inMemorySpaReservations = [];

/**
 * GET /api/amenities
 * Fetch all active amenities
 */
router.get('/', async (req, res) => {
  try {
    const { category, all } = req.query;

    if (isDatabaseConnected()) {
      const where = all === 'true' ? {} : { isActive: true };
      if (category) where.category = category;

      const amenities = await prisma.amenity.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
      });
      return res.json({ success: true, data: amenities });
    }

    let results = [...inMemoryAmenities];
    if (category) {
      results = results.filter((a) => a.category.toLowerCase() === category.toLowerCase());
    }
    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error in GET /api/amenities:', error);
    res.json({ success: true, data: inMemoryAmenities });
  }
});

/**
 * GET /api/amenities/:slug
 * Fetch single amenity by slug
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    if (isDatabaseConnected()) {
      const amenity = await prisma.amenity.findUnique({ where: { slug } });
      if (!amenity) return res.status(404).json({ success: false, message: 'Amenity not found' });
      return res.json({ success: true, data: amenity });
    }

    const item = inMemoryAmenities.find((a) => a.slug === slug || a.id === slug);
    if (!item) return res.status(404).json({ success: false, message: 'Amenity not found' });
    return res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to find amenity', error: error.message });
  }
});

/**
 * POST /api/amenities
 * Create amenity (Admin)
 */
router.post('/', async (req, res) => {
  try {
    const { name, slug, category = 'Wellness', description, features = [], hours, images = [], sortOrder = 0, isActive = true } = req.body;

    if (!name || !description) {
      return res.status(400).json({ success: false, message: 'Name and description are required' });
    }

    const targetSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    if (isDatabaseConnected()) {
      const created = await prisma.amenity.create({
        data: {
          name,
          slug: targetSlug,
          category,
          description,
          features: Array.isArray(features) ? features : [features],
          hours,
          images: Array.isArray(images) ? images : [images],
          sortOrder: Number(sortOrder) || 0,
          isActive: Boolean(isActive),
        },
      });
      return res.status(201).json({ success: true, data: created });
    }

    const newAmenity = {
      id: `amenity-${Date.now()}`,
      slug: targetSlug,
      name,
      category,
      description,
      features: Array.isArray(features) ? features : [features],
      hours,
      images: Array.isArray(images) ? images : [images],
      sortOrder,
      isActive,
    };
    inMemoryAmenities.push(newAmenity);
    return res.status(201).json({ success: true, data: newAmenity });
  } catch (error) {
    console.error('Error in POST /api/amenities:', error);
    res.status(500).json({ success: false, message: 'Failed to create amenity', error: error.message });
  }
});

/**
 * PUT /api/amenities/:id
 * Update amenity (Admin)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (isDatabaseConnected()) {
      const updated = await prisma.amenity.update({
        where: { id },
        data: updateData,
      });
      return res.json({ success: true, message: 'Amenity updated', data: updated });
    }

    const idx = inMemoryAmenities.findIndex((a) => a.id === id || a.slug === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Amenity not found' });
    inMemoryAmenities[idx] = { ...inMemoryAmenities[idx], ...updateData };
    return res.json({ success: true, message: 'Amenity updated', data: inMemoryAmenities[idx] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update amenity', error: error.message });
  }
});

/**
 * DELETE /api/amenities/:id
 * Delete amenity (Admin)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isDatabaseConnected()) {
      await prisma.amenity.delete({ where: { id } });
      return res.json({ success: true, message: 'Amenity deleted' });
    }

    inMemoryAmenities = inMemoryAmenities.filter((a) => a.id !== id && a.slug !== id);
    return res.json({ success: true, message: 'Amenity deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete amenity', error: error.message });
  }
});

/**
 * POST /api/amenities/spa/reserve
 * Book spa ritual
 */
router.post('/spa/reserve', async (req, res) => {
  try {
    const { serviceName, guestName, guestPhone, guestEmail, appointmentDate, preferredTime, partySize = 1, notes } = req.body;

    if (!serviceName || !guestName || !guestPhone || !appointmentDate || !preferredTime) {
      return res.status(400).json({ success: false, message: 'Service, name, phone, date, and preferred time are required' });
    }

    const bookingRef = `SPA-${Math.floor(10000 + Math.random() * 90000)}`;

    if (isDatabaseConnected()) {
      const appointment = await prisma.spaReservation.create({
        data: {
          bookingRef,
          serviceName,
          guestName,
          guestPhone,
          guestEmail,
          appointmentDate: new Date(appointmentDate),
          preferredTime,
          partySize: Number(partySize),
          notes,
          status: 'UNREAD',
        },
      });

      await prisma.notification.create({
        data: {
          type: 'SPA_APPOINTMENT',
          title: `Spa Appointment: ${bookingRef}`,
          message: `${guestName} booked ${serviceName} on ${appointmentDate} at ${preferredTime}`,
          linkUrl: '/admin#amenities',
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Spa appointment scheduled. Our spa concierge will confirm your treatment slot.',
        data: appointment,
      });
    }

    const appointment = {
      id: `spa-${Date.now()}`,
      bookingRef,
      serviceName,
      guestName,
      guestPhone,
      guestEmail,
      appointmentDate,
      preferredTime,
      partySize: Number(partySize),
      notes,
      status: 'UNREAD',
      createdAt: new Date().toISOString(),
    };
    inMemorySpaReservations.unshift(appointment);

    return res.status(201).json({
      success: true,
      message: 'Spa appointment scheduled. Our spa concierge will confirm your treatment slot.',
      data: appointment,
    });
  } catch (error) {
    console.error('Error in POST /api/amenities/spa/reserve:', error);
    res.status(500).json({ success: false, message: 'Failed to schedule spa appointment', error: error.message });
  }
});

/**
 * GET /api/amenities/spa/reservations
 * List spa appointments (Admin)
 */
router.get('/spa/reservations', async (req, res) => {
  try {
    if (isDatabaseConnected()) {
      const reservations = await prisma.spaReservation.findMany({
        orderBy: { appointmentDate: 'desc' },
      });
      return res.json({ success: true, data: reservations });
    }
    return res.json({ success: true, data: inMemorySpaReservations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list spa appointments', error: error.message });
  }
});

module.exports = router;
