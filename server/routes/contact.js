/**
 * XYZ Hotel — Contact & Inquiry Submissions API Routes
 * Guest concierge inquiries, administrative ticketing, and status management.
 */

const express = require('express');
const router = express.Router();
const { prisma, isDatabaseConnected } = require('../prisma');

let inMemoryContacts = [
  {
    id: 'contact-1',
    ticketId: 'XYZ-9821',
    name: 'Lady Margaret Thornton',
    email: 'margaret.thornton@heritage-arts.org',
    phone: '+44 20 7946 0912',
    subject: 'Private Terrace Dinner & Wedding Anniversary',
    message: 'We are planning a silver wedding anniversary gathering for 24 guests in November. Could your events concierge contact me regarding terrace availability and bespoke culinary pairings?',
    status: 'READ',
    notes: 'Maître d’ contacted guest via email on Feb 10.',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

/**
 * GET /api/contact
 * List contact submissions (Admin)
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    if (isDatabaseConnected()) {
      const where = status ? { status } : {};
      const submissions = await prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ success: true, data: submissions });
    }

    let results = [...inMemoryContacts];
    if (status) results = results.filter((c) => c.status === status);
    return res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve inquiries', error: error.message });
  }
});

/**
 * POST /api/contact
 * Submit contact or inquiry form
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject = 'General Inquiry', message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
    }

    const ticketId = `XYZ-${Math.floor(1000 + Math.random() * 9000)}`;

    if (isDatabaseConnected()) {
      const submission = await prisma.contactSubmission.create({
        data: {
          ticketId,
          name,
          email,
          phone,
          subject,
          message,
          status: 'UNREAD',
        },
      });

      await prisma.notification.create({
        data: {
          type: 'NEW_INQUIRY',
          title: `Inquiry Ticket #${ticketId}`,
          message: `${name} sent an inquiry: "${subject}"`,
          linkUrl: '/admin#contact',
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Your inquiry has been received. Our concierge will respond within 4 hours.',
        ticketId,
        data: submission,
      });
    }

    const newContact = {
      id: `cnt-${Date.now()}`,
      ticketId,
      name,
      email,
      phone,
      subject,
      message,
      status: 'UNREAD',
      createdAt: new Date().toISOString(),
    };
    inMemoryContacts.unshift(newContact);

    return res.status(201).json({
      success: true,
      message: 'Your inquiry has been received. Our concierge will respond within 4 hours.',
      ticketId,
      data: newContact,
    });
  } catch (error) {
    console.error('Error in POST /api/contact:', error);
    res.status(500).json({ success: false, message: 'Failed to send message', error: error.message });
  }
});

/**
 * PUT /api/contact/:id/status
 * Update inquiry status & staff notes (Admin)
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (isDatabaseConnected()) {
      const updated = await prisma.contactSubmission.update({
        where: { id },
        data: {
          ...(status ? { status } : {}),
          ...(notes !== undefined ? { notes } : {}),
        },
      });
      return res.json({ success: true, message: 'Inquiry updated', data: updated });
    }

    const item = inMemoryContacts.find((c) => c.id === id || c.ticketId === id);
    if (!item) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    if (status) item.status = status;
    if (notes !== undefined) item.notes = notes;

    return res.json({ success: true, message: 'Inquiry updated', data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update inquiry', error: error.message });
  }
});

/**
 * DELETE /api/contact/:id
 * Delete inquiry (Admin)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isDatabaseConnected()) {
      await prisma.contactSubmission.delete({ where: { id } });
      return res.json({ success: true, message: 'Inquiry removed' });
    }

    inMemoryContacts = inMemoryContacts.filter((c) => c.id !== id && c.ticketId !== id);
    return res.json({ success: true, message: 'Inquiry removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete inquiry', error: error.message });
  }
});

module.exports = router;
