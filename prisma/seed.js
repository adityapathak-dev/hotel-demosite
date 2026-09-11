/**
 * XYZ Hotel — Database Seeder
 * Populates initial hotel inventory, rooms, suites, restaurants,
 * amenities, offers, reviews, CMS settings, and default admin user.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding XYZ Hotel database...');

  // 1. Seed Default Admin User
  const adminPasswordHash = await bcrypt.hash('Admin@XYZ2026', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@xyzhotel.com' },
    update: {},
    create: {
      email: 'admin@xyzhotel.com',
      name: 'General Manager',
      role: 'ADMIN',
      phone: '+91 123 456 7890',
      passwordHash: adminPasswordHash,
      isActive: true,
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // 2. Seed Room Categories
  const categories = [
    { name: 'Signature Luxury', slug: 'signature-luxury', description: 'Contemporary luxury with panoramic city vistas', sortOrder: 1 },
    { name: 'Executive Collection', slug: 'executive-collection', description: 'Grand suites with dedicated 24/7 personal butler service', sortOrder: 2 },
    { name: 'Private Haven', slug: 'private-haven', description: 'Secluded villas in lush private heritage gardens', sortOrder: 3 },
    { name: 'Crown Jewel', slug: 'crown-jewel', description: 'Ultra-exclusive 32nd floor penthouse royal residence', sortOrder: 4 },
  ];

  const categoryMap = {};
  for (const cat of categories) {
    const saved = await prisma.roomCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, sortOrder: cat.sortOrder },
      create: cat,
    });
    categoryMap[cat.name] = saved.id;
  }

  // 3. Seed Rooms & Suites
  const rooms = [
    {
      slug: 'deluxe',
      name: 'Deluxe King Room',
      type: 'Signature Luxury',
      price: 12500,
      capacity: 2,
      sizeSqm: 48,
      sizeSqft: 516,
      bedType: 'King Pillow-top Bed',
      viewType: 'Panoramic City Skyline',
      description: 'Spacious 48-square-meter layout featuring custom hardwood furnishings, a plush king pillow-top bed, and panoramic city views. An oasis of calm equipped with an Italian marble en-suite bathroom with deep soaking tub and rainforest shower.',
      overview: 'Refined sanctuary with dedicated work atelier, Nespresso coffee machine, and floor-to-ceiling soundproof acoustic windows.',
      images: [
        'images/room-deluxe.jpg',
        'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=80'
      ],
      amenities: ['King Pillow-top Bed', '48 m²', 'Skyline View', 'Marble Deep-Soak Bath', 'Free Wi-Fi 6', 'Nespresso Atelier'],
      features: ['48 m² / 516 sq.ft', 'Panoramic Skyline View', 'King Pillow-top Bed', 'Marble Deep-Soak Bath', 'Nespresso Coffee Atelier', 'High-Speed Wi-Fi 6'],
      isAvailable: true,
      isFeatured: true,
      totalUnits: 12,
      sortOrder: 1,
      categoryId: categoryMap['Signature Luxury'],
    },
    {
      slug: 'suite',
      name: 'Premier Skyline Suite',
      type: 'Executive Collection',
      price: 28000,
      capacity: 3,
      sizeSqm: 75,
      sizeSqft: 807,
      bedType: 'King Bed + Daybed',
      viewType: 'High-floor 180° Panoramic View',
      description: 'Spanning 75 square meters of pure grandeur, this suite features a distinct living salon, private bar, and master bedroom with walk-in wardrobe. Guests enjoy 24-hour dedicated butler service, complimentary evening cocktails, and priority dining reservations.',
      overview: 'Executive residence tailored for discerning guests seeking separate lounge spaces and privileged Club Lounge access.',
      images: [
        'images/room-suite.jpg',
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80'
      ],
      amenities: ['Separate Living Salon', '75 m²', '24/7 Butler Service', 'Club Lounge Privilege', 'Walk-in Wardrobe', 'Evening Cocktails'],
      features: ['75 m² / 807 sq.ft', 'Separate Living Salon', 'Dedicated 24/7 Butler', 'Evening Canapé Service', 'Walk-in Dressing Room', 'Club Lounge Privilege'],
      isAvailable: true,
      isFeatured: true,
      totalUnits: 6,
      sortOrder: 2,
      categoryId: categoryMap['Executive Collection'],
    },
    {
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
      overview: 'Complete garden privacy with heated plunge pool, teak sun deck, and complimentary daily champagne breakfast.',
      images: [
        'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=1200&q=80',
        'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=1200&q=80'
      ],
      amenities: ['Private Heated Pool', '95 m²', 'Heritage Garden', 'Outdoor Teak Deck', 'Champagne Breakfast', 'Full Spa Bath Menu'],
      features: ['95 m² / 1,022 sq.ft', 'Private Heated Plunge Pool', 'Private Botanical Garden', 'Outdoor Daybed & Deck', 'Daily Champagne Breakfast', 'Full Spa Bath Menu'],
      isAvailable: true,
      isFeatured: true,
      totalUnits: 4,
      sortOrder: 3,
      categoryId: categoryMap['Private Haven'],
    },
    {
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
      overview: 'The pinnacle of luxury hospitality with private chef, butler, boardroom, and airport Rolls-Royce Ghost transfers.',
      images: [
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80',
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80'
      ],
      amenities: ['180 m² Penthouse', 'Rooftop Terrace', 'Rolls-Royce Transfer', 'Private Chef & Butler', '10-Seat Dining Salon', 'Boardroom'],
      features: ['180 m² / 1,937 sq.ft', 'Private Rooftop Terrace', 'Chauffeur Airport Transfer', 'Private Chef & Butler', '10-Seat Dining Salon', 'Bespoke Fragrance Bar'],
      isAvailable: true,
      isFeatured: true,
      totalUnits: 2,
      sortOrder: 4,
      categoryId: categoryMap['Crown Jewel'],
    },
  ];

  for (const r of rooms) {
    await prisma.room.upsert({
      where: { slug: r.slug },
      update: r,
      create: r,
    });
  }
  console.log(`Seeded ${rooms.length} luxury rooms & suites.`);

  // 4. Seed Restaurants
  const restaurants = [
    {
      slug: 'saffron',
      name: 'The Saffron Pavilion',
      cuisine: 'Royal Awadhi Haute Cuisine',
      description: 'Celebrating the royal culinary legacy of the Nawabs, Saffron Pavilion crafts heirloom recipes slow-cooked in copper vessels and clay dum pots.',
      hours: 'Lunch: 12:30 PM – 3:30 PM | Dinner: 7:00 PM – 11:30 PM',
      atmosphere: 'Handcrafted jali screens & ambient classical sitar',
      dressCode: 'Smart Elegant / Traditional Formal',
      closedMondays: false,
      phone: '+91 123 456 7891',
      images: ['images/dining-fine.jpg'],
      sortOrder: 1,
    },
    {
      slug: 'sky-lounge',
      name: 'Aura Vista — Sky Lounge & Bar',
      cuisine: 'Modern Pan-Asian Robatayaki & Mixology',
      description: 'Perched on the 30th floor with 360-degree views, Aura Vista combines modern robatayaki skewers with bespoke botanical cocktails and acoustic jazz.',
      hours: 'Daily: 5:00 PM – 1:30 AM (Sundowners from 5:00 PM)',
      atmosphere: 'Open-air teak terrace with skyline fireplace pods',
      dressCode: 'Sophisticated Chic',
      closedMondays: false,
      phone: '+91 123 456 7892',
      images: ['images/dining-rooftop.jpg'],
      sortOrder: 2,
    },
    {
      slug: 'orangerie',
      name: "L'Orangerie & Curated Wine Cellar",
      cuisine: 'French Mediterranean Fine Dining',
      description: 'Led by Michelin-trained Chef Laurent Moreau, L\'Orangerie delivers refined Provençal dining paired with a cellar of over 1,200 rare Grand Cru vintages.',
      hours: 'Dinner Only: 6:30 PM – 11:00 PM (Closed Mondays)',
      atmosphere: 'Intimate candlelit salon with vaulted wine arches',
      dressCode: 'Formal Jacket Preferred',
      closedMondays: true,
      phone: '+91 123 456 7893',
      images: ['https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80'],
      sortOrder: 3,
    },
    {
      slug: 'conservatory',
      name: 'The Grand Conservatory',
      cuisine: 'All-Day Global Dining & Afternoon Tea',
      description: 'Bathed in natural daylight under a soaring glass atrium, enjoy champagne breakfast buffets, wood-fired artisanal pizzas, and Royal English High Tea.',
      hours: 'Open 24 Hours (Royal Afternoon Tea: 3:00 PM – 6:00 PM)',
      atmosphere: 'Sunlit botanical garden atrium with live harp',
      dressCode: 'Smart Casual',
      closedMondays: false,
      phone: '+91 123 456 7894',
      images: ['https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1200&q=80'],
      sortOrder: 4,
    },
  ];

  for (const rest of restaurants) {
    await prisma.restaurant.upsert({
      where: { slug: rest.slug },
      update: rest,
      create: rest,
    });
  }
  console.log(`Seeded ${restaurants.length} dining venues.`);

  // 5. Seed Amenities
  const amenities = [
    {
      slug: 'luxury-spa',
      name: 'Luxury Spa Sanctuary',
      category: 'Wellness',
      description: 'Ayurvedic treatments, Himalayan salt rooms, deep tissue massages, and holistic rejuvenation.',
      features: ['Ayurvedic Herbal Massages', 'Himalayan Pink Salt Inhalation Room', 'Private Hydrotherapy Pools', 'Organic Aromatherapy Oils'],
      hours: 'Daily: 7:00 AM – 10:00 PM',
      images: ['https://images.unsplash.com/photo-1540555700478-4be289fbec6c?w=1200&q=80'],
      sortOrder: 1,
    },
    {
      slug: 'infinity-pool',
      name: 'Skyline Heated Infinity Pool',
      category: 'Leisure',
      description: '30th-floor rooftop heated infinity pool overlooking the city skyline with private cabanas and poolside service.',
      features: ['Temperature-controlled year round', 'VIP Private Cabana Suites', 'Hydrotherapy massage loungers', 'Cocktails & light fare service'],
      hours: 'Daily: 6:00 AM – 9:00 PM (Adults only after 7:00 PM)',
      images: ['https://images.unsplash.com/photo-1582610116397-edb318620f90?w=1200&q=80'],
      sortOrder: 2,
    },
    {
      slug: 'fitness-centre',
      name: 'Technogym Fitness Atelier',
      category: 'Fitness',
      description: 'State-of-the-art cardiovascular and strength training equipment by Technogym, personal coaching, and yoga pavilions.',
      features: ['24/7 Keycard Access', 'Technogym Artis Line Equipment', 'Daily Yoga & Pilates Sessions', 'Certified Personal Trainers'],
      hours: 'Open 24 Hours',
      images: ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80'],
      sortOrder: 3,
    },
    {
      slug: 'business-centre',
      name: 'Executive Business Boardrooms',
      category: 'Business',
      description: 'High-tech corporate meeting suites, 4K telepresence video conferencing, translation suites, and private work pods.',
      features: ['4K Video Conferencing Boardrooms', 'High-Speed Secure Fiber Wi-Fi 6', 'Secretarial & Translation Support', 'Private soundproof pods'],
      hours: 'Open 24 Hours',
      images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80'],
      sortOrder: 4,
    },
  ];

  for (const a of amenities) {
    await prisma.amenity.upsert({
      where: { slug: a.slug },
      update: a,
      create: a,
    });
  }
  console.log(`Seeded ${amenities.length} hotel amenities.`);

  // 6. Seed Offers & Promo Codes
  const offers = [
    {
      slug: 'early-bird',
      title: 'Early Bird Special',
      badgeText: '20% OFF',
      discountPercent: 0.20,
      promoCode: 'EARLYBIRD20',
      description: 'Book 30 days in advance and enjoy up to 20% off on the best available rates with complimentary breakfast.',
      terms: 'Non-refundable after 48 hours of booking. Subject to availability.',
      imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80',
      isActive: true,
      sortOrder: 1,
    },
    {
      slug: 'spa-wellness-retreat',
      title: 'Spa & Wellness Retreat',
      badgeText: 'PACKAGE',
      discountPercent: 0.15,
      promoCode: 'XYZLUXURY',
      description: 'Immerse in a 2-night stay with daily spa treatments, wellness breakfast, and yoga sessions included.',
      terms: 'Requires minimum 2-night stay. Includes ₹8,500 couple spa credit.',
      imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbec6c?w=600&q=80',
      isActive: true,
      sortOrder: 2,
    },
    {
      slug: 'weekend-escape',
      title: 'Weekend Escape',
      badgeText: '15% OFF',
      discountPercent: 0.15,
      promoCode: 'WEEKEND15',
      description: 'Unwind over the weekend with 15% off, late checkout until 2 PM, and a complimentary dinner for two.',
      terms: 'Valid for stays checking in Friday or Saturday.',
      imageUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80',
      isActive: true,
      sortOrder: 3,
    },
  ];

  for (const off of offers) {
    await prisma.offer.upsert({
      where: { slug: off.slug },
      update: off,
      create: off,
    });
  }
  console.log(`Seeded ${offers.length} promotional offers.`);

  // 7. Seed Reviews
  const reviews = [
    {
      authorName: 'Alistair Finch-Hatton',
      location: 'London, UK',
      roomStayed: 'The Presidential Royal Suite',
      rating: 5,
      comment: 'An extraordinary sanctuary in the center of the capital. The Clefs d\'Or concierge arranged an unforgettable private heritage tour, and the penthouse terrace is magnificent.',
      isPublished: true,
      isFeatured: true,
      stayDate: 'January 2026',
    },
    {
      authorName: 'Meera & Siddharth Oberoi',
      location: 'Mumbai, India',
      roomStayed: 'Garden Plunge Pool Villa',
      rating: 5,
      comment: 'Our wedding anniversary at the Garden Villa exceeded every expectation. The heated plunge pool, champagne breakfast, and candlelit dinner at Saffron Pavilion were perfection.',
      isPublished: true,
      isFeatured: true,
      stayDate: 'February 2026',
    },
    {
      authorName: 'Elena Rostova',
      location: 'Geneva, Switzerland',
      roomStayed: 'Premier Skyline Suite',
      rating: 5,
      comment: 'Flawless five-star service. From the airport chauffeur to the 24/7 personal butler, every single detail felt tailored and discreet. Will return every year.',
      isPublished: true,
      isFeatured: true,
      stayDate: 'November 2025',
    },
  ];

  for (const rev of reviews) {
    const existing = await prisma.review.findFirst({
      where: { authorName: rev.authorName, roomStayed: rev.roomStayed },
    });
    if (!existing) {
      await prisma.review.create({ data: rev });
    }
  }
  console.log(`Seeded ${reviews.length} reviews.`);

  // 8. Seed Website Settings
  const settings = [
    { key: 'hotel_name', value: 'XYZ Hotel', group: 'general' },
    { key: 'tagline', value: 'The Benchmark of 5-Star Royal Hospitality', group: 'general' },
    { key: 'phone_tollfree', value: '1800 123 4567', group: 'contact' },
    { key: 'phone_direct', value: '+91 123 456 7890', group: 'contact' },
    { key: 'whatsapp_number', value: '+91 98765 43210', group: 'contact' },
    { key: 'email_reservations', value: 'reservations@xyzhotel.com', group: 'contact' },
    { key: 'email_concierge', value: 'concierge@xyzhotel.com', group: 'contact' },
    { key: 'address_street', value: '1 Royal Avenue, Central Diplomatic Enclave', group: 'contact' },
    { key: 'address_city', value: 'New Delhi, India 110001', group: 'contact' },
    { key: 'checkin_time', value: '2:00 PM', group: 'policies' },
    { key: 'checkout_time', value: '12:00 PM (Noon)', group: 'policies' },
  ];

  for (const s of settings) {
    await prisma.websiteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, group: s.group },
      create: s,
    });
  }
  console.log(`Seeded ${settings.length} website settings.`);

  // 9. Seed Homepage Sections
  const homepageSections = [
    {
      sectionKey: 'hero',
      title: 'A Legacy of Refined Elegance',
      subtitle: 'Discover unparalleled luxury in the diplomatic heart of the capital. Indulge in world-class dining, heated vitality pools, and exquisitely appointed penthouses.',
      contentJson: {
        ctaPrimaryText: 'Reserve Your Stay',
        ctaPrimaryLink: 'booking.html',
        ctaSecondaryText: 'Explore Rooms',
        ctaSecondaryLink: 'rooms.html',
        bgImage: 'images/hero-bg.jpg'
      },
      isVisible: true,
      sortOrder: 1
    },
    {
      sectionKey: 'about_stats',
      title: 'Timeless Heritage & Service',
      subtitle: 'Crafting unforgettable moments since 1987.',
      contentJson: {
        stat1_num: '38+',
        stat1_label: 'Years of Royal Heritage',
        stat2_num: '180',
        stat2_label: 'Bespoke Suites & Rooms',
        stat3_num: '4',
        stat3_label: 'Michelin-Calibre Dining Venues'
      },
      isVisible: true,
      sortOrder: 2
    }
  ];

  for (const h of homepageSections) {
    await prisma.homepageSection.upsert({
      where: { sectionKey: h.sectionKey },
      update: { title: h.title, subtitle: h.subtitle, contentJson: h.contentJson, isVisible: h.isVisible },
      create: h,
    });
  }
  console.log(`Seeded homepage sections.`);

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
