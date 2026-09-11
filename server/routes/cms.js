/**
 * XYZ Hotel — CMS & Website Settings API Routes
 * CMS pages (About/Legacy, Privacy, Terms), dynamic homepage sections, and site configuration.
 */

const express = require('express');
const router = express.Router();
const { prisma, isDatabaseConnected } = require('../prisma');

// Fallback CMS Pages
const FALLBACK_PAGES = {
  'about-legacy': {
    slug: 'about-legacy',
    title: 'The Heritage & Architecture of XYZ Hotel',
    subtitle: 'A century of timeless elegance and hospitality leadership',
    content: 'Founded in 1926, XYZ Hotel has stood as a beacon of architectural excellence and discerning hospitality. Designed with neoclassical proportions and handcrafted indigenous stonework, every corridor tells a story of royalty, dignitaries, and cultural luminaries who walked these halls.',
    metaTitle: 'About XYZ Hotel — Heritage, Legacy & Architectural Grandeur',
    metaDescription: 'Discover the storied history, heritage suites, and master craftsmanship of XYZ Hotel.',
    isPublished: true,
  },
  'privacy-policy': {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    subtitle: 'Our commitment to guest confidentiality and digital security',
    content: 'XYZ Hotel is committed to protecting your personal information. All guest reservations, financial transactions, and concierge preferences are encrypted using industry-standard protocols and stored in compliance with global data protection regulations.',
    metaTitle: 'Privacy Policy — XYZ Hotel',
    metaDescription: 'Official guest privacy and data governance policy for XYZ Hotel.',
    isPublished: true,
  },
  'terms-conditions': {
    slug: 'terms-conditions',
    title: 'Terms & Conditions',
    subtitle: 'Reservation rules, check-in policies, and property standards',
    content: 'Standard check-in time is 3:00 PM and check-out is 12:00 PM. Early check-in and late checkout are subject to suite availability. Cancellations made 48 hours prior to arrival are eligible for a full refund on flexible rates.',
    metaTitle: 'Terms & Conditions — XYZ Hotel',
    metaDescription: 'Booking terms, payment policies, and house rules for XYZ Hotel guests.',
    isPublished: true,
  },
};

// Fallback Homepage Sections
const FALLBACK_SECTIONS = {
  hero: {
    sectionKey: 'hero',
    title: 'A New Era of Uncompromised Grandeur',
    subtitle: 'Where timeless architectural heritage meets modern bespoke luxury.',
    contentJson: {
      tagline: 'LUXURY REDEFINED',
      primaryCtaText: 'Reserve Your Suite',
      primaryCtaLink: 'booking.html',
      secondaryCtaText: 'Explore Living',
      secondaryCtaLink: 'rooms.html',
      backgroundImage: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1920&q=85',
      badge: 'Forbes Five-Star Award 2026',
    },
    isVisible: true,
  },
  about_stats: {
    sectionKey: 'about_stats',
    title: 'A Legacy of Gracious Living',
    subtitle: 'Decades of defining world-class hospitality and regal comfort.',
    contentJson: {
      stats: [
        { value: '100+', label: 'Years of Storied Heritage' },
        { value: '142', label: 'Bespoke Luxury Suites' },
        { value: '4', label: 'Michelin-Caliber Restaurants' },
        { value: '98%', label: 'Guest Satisfaction Index' },
      ],
    },
    isVisible: true,
  },
};

// Fallback Website Settings
const FALLBACK_SETTINGS = {
  hotel_name: 'XYZ Luxury Hotel & Suites',
  phone: '+91 123 456 7890',
  email: 'concierge@xyzhotel.com',
  address: '124 Heritage Boulevard, Palace Enclave, New Delhi, India 110001',
  currency: 'INR',
  currency_symbol: '₹',
  checkin_time: '15:00',
  checkout_time: '12:00',
  instagram_url: 'https://instagram.com',
  facebook_url: 'https://facebook.com',
  linkedin_url: 'https://linkedin.com',
};

let inMemoryPages = { ...FALLBACK_PAGES };
let inMemorySections = { ...FALLBACK_SECTIONS };
let inMemorySettings = { ...FALLBACK_SETTINGS };

// ==========================================
// 1. CMS Pages Routes
// ==========================================

router.get('/pages', async (req, res) => {
  try {
    if (isDatabaseConnected()) {
      const pages = await prisma.cmsPage.findMany({
        where: req.query.all === 'true' ? {} : { isPublished: true },
      });
      return res.json({ success: true, data: pages });
    }
    return res.json({ success: true, data: Object.values(inMemoryPages) });
  } catch (error) {
    res.json({ success: true, data: Object.values(inMemoryPages) });
  }
});

router.get('/pages/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    if (isDatabaseConnected()) {
      const page = await prisma.cmsPage.findUnique({ where: { slug } });
      if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
      return res.json({ success: true, data: page });
    }

    const page = inMemoryPages[slug];
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
    return res.json({ success: true, data: page });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve page', error: error.message });
  }
});

router.put('/pages/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, subtitle, content, metaTitle, metaDescription, isPublished } = req.body;

    if (isDatabaseConnected()) {
      const updated = await prisma.cmsPage.upsert({
        where: { slug },
        update: {
          title,
          subtitle,
          content,
          metaTitle,
          metaDescription,
          ...(typeof isPublished === 'boolean' ? { isPublished } : {}),
        },
        create: {
          slug,
          title: title || slug,
          subtitle,
          content: content || '',
          metaTitle,
          metaDescription,
          isPublished: isPublished !== false,
        },
      });
      return res.json({ success: true, message: 'CMS page updated', data: updated });
    }

    inMemoryPages[slug] = {
      ...inMemoryPages[slug],
      slug,
      title: title || inMemoryPages[slug]?.title || slug,
      subtitle: subtitle || inMemoryPages[slug]?.subtitle,
      content: content || inMemoryPages[slug]?.content || '',
      metaTitle: metaTitle || inMemoryPages[slug]?.metaTitle,
      metaDescription: metaDescription || inMemoryPages[slug]?.metaDescription,
      isPublished: typeof isPublished === 'boolean' ? isPublished : true,
    };

    return res.json({ success: true, message: 'CMS page updated', data: inMemoryPages[slug] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update CMS page', error: error.message });
  }
});

// ==========================================
// 2. Homepage Sections Routes
// ==========================================

router.get('/sections', async (req, res) => {
  try {
    if (isDatabaseConnected()) {
      const sections = await prisma.homepageSection.findMany({
        where: { isVisible: true },
        orderBy: { sortOrder: 'asc' },
      });
      return res.json({ success: true, data: sections });
    }
    return res.json({ success: true, data: Object.values(inMemorySections) });
  } catch (error) {
    res.json({ success: true, data: Object.values(inMemorySections) });
  }
});

router.get('/sections/:key', async (req, res) => {
  try {
    const { key } = req.params;

    if (isDatabaseConnected()) {
      const section = await prisma.homepageSection.findUnique({ where: { sectionKey: key } });
      if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
      return res.json({ success: true, data: section });
    }

    const section = inMemorySections[key];
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    return res.json({ success: true, data: section });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve section', error: error.message });
  }
});

router.put('/sections/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { title, subtitle, contentJson, isVisible } = req.body;

    if (isDatabaseConnected()) {
      const updated = await prisma.homepageSection.upsert({
        where: { sectionKey: key },
        update: {
          title,
          subtitle,
          contentJson: contentJson || {},
          ...(typeof isVisible === 'boolean' ? { isVisible } : {}),
        },
        create: {
          sectionKey: key,
          title: title || key,
          subtitle,
          contentJson: contentJson || {},
          isVisible: isVisible !== false,
        },
      });
      return res.json({ success: true, message: 'Homepage section updated', data: updated });
    }

    inMemorySections[key] = {
      sectionKey: key,
      title: title || inMemorySections[key]?.title,
      subtitle: subtitle || inMemorySections[key]?.subtitle,
      contentJson: contentJson || inMemorySections[key]?.contentJson || {},
      isVisible: typeof isVisible === 'boolean' ? isVisible : true,
    };

    return res.json({ success: true, message: 'Homepage section updated', data: inMemorySections[key] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update section', error: error.message });
  }
});

// ==========================================
// 3. Website Settings Routes
// ==========================================

router.get('/settings', async (req, res) => {
  try {
    if (isDatabaseConnected()) {
      const settings = await prisma.websiteSetting.findMany();
      const mapped = {};
      settings.forEach((s) => {
        mapped[s.key] = s.value;
      });
      return res.json({ success: true, data: { ...inMemorySettings, ...mapped } });
    }
    return res.json({ success: true, data: inMemorySettings });
  } catch (error) {
    res.json({ success: true, data: inMemorySettings });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const updates = req.body; // { hotel_name: 'XYZ Hotel', phone: '...' }

    if (isDatabaseConnected()) {
      const promises = Object.entries(updates).map(([key, value]) =>
        prisma.websiteSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      );
      await Promise.all(promises);
    }

    Object.assign(inMemorySettings, updates);
    return res.json({ success: true, message: 'Settings saved successfully', data: inMemorySettings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save settings', error: error.message });
  }
});

module.exports = router;
