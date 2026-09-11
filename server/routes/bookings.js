/**
 * XYZ Hotel — Bookings & Reservations API Routes
 * Robust double-booking prevention, transactions, guest profile linking,
 * promo code validation, admin filtering, and status management.
 */

const express = require('express');
const router = express.Router();
const { prisma, isDatabaseConnected } = require('../prisma');

// Fallback in-memory bookings store
const inMemoryBookings = [
  {
    id: 'bkg-101',
    bookingRef: 'XYZ-847291',
    roomId: 'deluxe',
    room: { name: 'Deluxe King Room', price: 12500, slug: 'deluxe' },
    guest: {
      firstName: 'Vikram',
      lastName: 'Mehta',
      email: 'vikram.m@example.com',
      phone: '+91 98201 12345',
      country: 'India',
      vipLevel: 'Gold',
    },
    checkIn: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    nights: 3,
    guestsCount: 2,
    roomsCount: 1,
    nightlyRate: 12500,
    subtotal: 37500,
    discountAmount: 5625,
    promoCode: 'XYZLUXURY',
    addonsTotal: 3600,
    taxAmount: 6385.5,
    totalAmount: 41860.5,
    hasBreakfast: true,
    hasTransfer: false,
    hasSpa: false,
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    paymentMethod: 'Credit Card (Stripe)',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bkg-102',
    bookingRef: 'XYZ-918234',
    roomId: 'suite',
    room: { name: 'Premier Skyline Suite', price: 28000, slug: 'suite' },
    guest: {
      firstName: 'Eleanor',
      lastName: 'Vance',
      email: 'eleanor.vance@uk-corp.co.uk',
      phone: '+44 7700 900123',
      country: 'United Kingdom',
      vipLevel: 'Diamond',
    },
    checkIn: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
    nights: 3,
    guestsCount: 2,
    roomsCount: 1,
    nightlyRate: 28000,
    subtotal: 84000,
    discountAmount: 0,
    promoCode: null,
    addonsTotal: 7000,
    taxAmount: 16380,
    totalAmount: 107380,
    hasBreakfast: true,
    hasTransfer: true,
    hasSpa: true,
    status: 'CONFIRMED',
    paymentStatus: 'PAY_AT_PROPERTY',
    paymentMethod: 'Pay at Property',
    createdAt: new Date().toISOString(),
  },
];

/**
 * Generate unique booking reference
 */
function generateBookingRef() {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `XYZ-${num}`;
}

/**
 * GET /api/bookings
 * Query bookings with filtering, sorting, pagination (Admin / Staff)
 */
router.get('/', async (req, res) => {
  try {
    const { status, search, from, to, page = 1, limit = 50 } = req.query;

    if (isDatabaseConnected()) {
      const where = {};
      if (status) {
        where.status = status;
      }
      if (search) {
        where.OR = [
          { bookingRef: { contains: search, mode: 'insensitive' } },
          { guest: { email: { contains: search, mode: 'insensitive' } } },
          { guest: { firstName: { contains: search, mode: 'insensitive' } } },
          { guest: { lastName: { contains: search, mode: 'insensitive' } } },
        ];
      }
      if (from || to) {
        where.checkIn = {};
        if (from) where.checkIn.gte = new Date(from);
        if (to) where.checkIn.lte = new Date(to);
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          include: {
            room: true,
            guest: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.booking.count({ where }),
      ]);

      return res.json({
        success: true,
        data: bookings,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    }

    // In-memory fallback
    let results = [...inMemoryBookings];
    if (status) {
      results = results.filter((b) => b.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (b) =>
          b.bookingRef.toLowerCase().includes(q) ||
          b.guest.email.toLowerCase().includes(q) ||
          b.guest.firstName.toLowerCase().includes(q) ||
          b.guest.lastName.toLowerCase().includes(q)
      );
    }

    return res.json({
      success: true,
      data: results,
      pagination: {
        total: results.length,
        page: 1,
        limit: results.length,
        pages: 1,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/bookings:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve bookings', error: error.message });
  }
});

/**
 * GET /api/bookings/:refOrId
 * Retrieve a specific booking by ref or ID
 */
router.get('/:refOrId', async (req, res) => {
  try {
    const { refOrId } = req.params;

    if (isDatabaseConnected()) {
      const booking = await prisma.booking.findFirst({
        where: {
          OR: [{ id: refOrId }, { bookingRef: refOrId }],
        },
        include: { room: true, guest: true },
      });

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      return res.json({ success: true, data: booking });
    }

    // Fallback
    const booking = inMemoryBookings.find(
      (b) => b.id === refOrId || b.bookingRef.toUpperCase() === refOrId.toUpperCase()
    );
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    return res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Error in GET /api/bookings/:refOrId:', error);
    res.status(500).json({ success: false, message: 'Failed to find booking', error: error.message });
  }
});

/**
 * POST /api/bookings
 * Create new reservation with double-booking prevention & transaction support
 */
router.post('/', async (req, res) => {
  try {
    const {
      roomId,
      checkIn,
      checkOut,
      guestsCount = 2,
      roomsCount = 1,
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      country = 'India',
      promoCode,
      hasBreakfast = false,
      hasTransfer = false,
      hasSpa = false,
      specialRequests,
      paymentMethod = 'Pay at Property',
    } = req.body;

    // Validation
    if (!roomId || !checkIn || !checkOut || !email || !firstName || !lastName || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required booking fields (roomId, checkIn, checkOut, firstName, lastName, email, phone)',
      });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid check-in or check-out date format' });
    }

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ success: false, message: 'Check-out date must be strictly after check-in date' });
    }

    const nights = Math.max(1, Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));

    if (isDatabaseConnected()) {
      // Find room in database
      const room = await prisma.room.findFirst({
        where: { OR: [{ id: roomId }, { slug: roomId }] },
      });

      if (!room) {
        return res.status(404).json({ success: false, message: 'Selected room not found' });
      }

      // Check double-booking / availability collisions
      const overlappingBookings = await prisma.booking.count({
        where: {
          roomId: room.id,
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          AND: [
            { checkIn: { lt: checkOutDate } },
            { checkOut: { gt: checkInDate } },
          ],
        },
      });

      // Total units for this room type
      const maxUnits = room.totalUnits || 5;
      if (overlappingBookings + Number(roomsCount) > maxUnits) {
        return res.status(409).json({
          success: false,
          message: `Double-booking prevention: The selected ${room.name} is fully booked for the requested dates. Please choose different dates or another suite.`,
        });
      }

      // Pricing computation
      const nightlyRate = room.price;
      const subtotal = nightlyRate * nights * Number(roomsCount);

      // Promo discount
      let discountAmount = 0;
      if (promoCode) {
        const offer = await prisma.offer.findFirst({
          where: {
            promoCode: { equals: promoCode, mode: 'insensitive' },
            isActive: true,
          },
        });
        if (offer) {
          discountAmount = subtotal * offer.discountPercent;
        } else if (promoCode.toUpperCase() === 'XYZLUXURY' || promoCode.toUpperCase() === 'WELCOME15') {
          discountAmount = subtotal * 0.15;
        }
      }

      // Addons computation
      let addonsTotal = 0;
      if (hasBreakfast) addonsTotal += 1200 * Number(guestsCount) * nights;
      if (hasTransfer) addonsTotal += 3500;
      if (hasSpa) addonsTotal += 4500;

      const taxableAmount = subtotal - discountAmount + addonsTotal;
      const taxAmount = taxableAmount * 0.18; // 18% luxury hospitality GST
      const totalAmount = taxableAmount + taxAmount;

      const bookingRef = generateBookingRef();

      // Execute in Prisma transaction
      const createdBooking = await prisma.$transaction(async (tx) => {
        // Find or create guest
        let guest = await tx.guest.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!guest) {
          guest = await tx.guest.create({
            data: {
              firstName,
              lastName,
              email: email.toLowerCase(),
              phone,
              address,
              city,
              country,
              specialRequests,
            },
          });
        } else {
          // Update phone / requests if provided
          guest = await tx.guest.update({
            where: { id: guest.id },
            data: { phone: phone || guest.phone, specialRequests: specialRequests || guest.specialRequests },
          });
        }

        // Create booking
        const booking = await tx.booking.create({
          data: {
            bookingRef,
            roomId: room.id,
            guestId: guest.id,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            nights,
            guestsCount: Number(guestsCount),
            roomsCount: Number(roomsCount),
            nightlyRate,
            subtotal,
            discountAmount,
            promoCode: promoCode || null,
            addonsTotal,
            taxAmount,
            totalAmount,
            hasBreakfast: Boolean(hasBreakfast),
            hasTransfer: Boolean(hasTransfer),
            hasSpa: Boolean(hasSpa),
            specialRequests,
            status: 'CONFIRMED',
            paymentStatus: 'PAY_AT_PROPERTY',
            paymentMethod,
          },
          include: {
            room: true,
            guest: true,
          },
        });

        // Trigger Admin Notification
        await tx.notification.create({
          data: {
            type: 'NEW_BOOKING',
            title: `New Reservation: ${bookingRef}`,
            message: `${firstName} ${lastName} reserved ${room.name} (${nights} nights, ₹${totalAmount.toLocaleString('en-IN')})`,
            linkUrl: `/admin#bookings`,
          },
        });

        return booking;
      });

      return res.status(201).json({
        success: true,
        message: 'Reservation confirmed successfully',
        data: createdBooking,
      });
    }

    // In-memory fallback execution
    const nightlyRate = 12500;
    const subtotal = nightlyRate * nights * Number(roomsCount);
    let discountAmount = 0;
    if (promoCode && (promoCode.toUpperCase() === 'XYZLUXURY' || promoCode.toUpperCase() === 'WELCOME15')) {
      discountAmount = subtotal * 0.15;
    }
    let addonsTotal = 0;
    if (hasBreakfast) addonsTotal += 1200 * Number(guestsCount) * nights;
    if (hasTransfer) addonsTotal += 3500;
    if (hasSpa) addonsTotal += 4500;
    const taxAmount = (subtotal - discountAmount + addonsTotal) * 0.18;
    const totalAmount = subtotal - discountAmount + addonsTotal + taxAmount;

    const newBooking = {
      id: `bkg-${Date.now()}`,
      bookingRef: generateBookingRef(),
      roomId,
      room: { name: roomId.toUpperCase() + ' Suite', price: nightlyRate, slug: roomId },
      guest: { firstName, lastName, email, phone, country },
      checkIn: checkInDate.toISOString().split('T')[0],
      checkOut: checkOutDate.toISOString().split('T')[0],
      nights,
      guestsCount: Number(guestsCount),
      roomsCount: Number(roomsCount),
      nightlyRate,
      subtotal,
      discountAmount,
      promoCode: promoCode || null,
      addonsTotal,
      taxAmount,
      totalAmount,
      hasBreakfast: Boolean(hasBreakfast),
      hasTransfer: Boolean(hasTransfer),
      hasSpa: Boolean(hasSpa),
      specialRequests,
      status: 'CONFIRMED',
      paymentStatus: 'PAY_AT_PROPERTY',
      paymentMethod,
      createdAt: new Date().toISOString(),
    };

    inMemoryBookings.unshift(newBooking);

    return res.status(201).json({
      success: true,
      message: 'Reservation confirmed successfully (Fallback Store)',
      data: newBooking,
    });
  } catch (error) {
    console.error('Error in POST /api/bookings:', error);
    res.status(500).json({ success: false, message: 'Failed to process reservation', error: error.message });
  }
});

/**
 * PUT /api/bookings/:id/status
 * Update booking status (CONFIRMED, CANCELLED, CHECKED_IN, CHECKED_OUT)
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    if (isDatabaseConnected()) {
      const updated = await prisma.booking.update({
        where: { id },
        data: {
          status,
          ...(notes ? { notes } : {}),
        },
        include: { room: true, guest: true },
      });

      if (status === 'CANCELLED') {
        await prisma.notification.create({
          data: {
            type: 'CANCELLED_BOOKING',
            title: `Booking Cancelled: ${updated.bookingRef}`,
            message: `Booking for ${updated.guest.firstName} ${updated.guest.lastName} was cancelled.`,
            linkUrl: `/admin#bookings`,
          },
        });
      }

      return res.json({ success: true, message: 'Booking status updated', data: updated });
    }

    // In-memory fallback
    const booking = inMemoryBookings.find((b) => b.id === id || b.bookingRef === id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    booking.status = status;
    if (notes) booking.notes = notes;

    return res.json({ success: true, message: 'Booking status updated', data: booking });
  } catch (error) {
    console.error('Error in PUT /api/bookings/:id/status:', error);
    res.status(500).json({ success: false, message: 'Failed to update booking status', error: error.message });
  }
});

/**
 * DELETE /api/bookings/:id
 * Delete or soft-cancel a booking
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isDatabaseConnected()) {
      await prisma.booking.delete({ where: { id } });
      return res.json({ success: true, message: 'Booking deleted successfully' });
    }

    const idx = inMemoryBookings.findIndex((b) => b.id === id || b.bookingRef === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    inMemoryBookings.splice(idx, 1);
    return res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/bookings/:id:', error);
    res.status(500).json({ success: false, message: 'Failed to delete booking', error: error.message });
  }
});

module.exports = router;
