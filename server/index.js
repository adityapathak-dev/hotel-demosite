/**
 * ==============================================================================
 * XYZ Hotel — Full-Stack Unified Server (Express + Prisma + Supabase)
 * ==============================================================================
 * Hosts all REST APIs, database queries, Supabase storage proxy,
 * and serves live frontend static pages.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { isDatabaseConnected } = require('./prisma');
const { getStorageClient } = require('./supabase');

const app = express();
const PORT = process.env.PORT || 5055;
const ROOT_DIR = path.resolve(__dirname, '..');

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Request logging (clean format)
app.use((req, res, next) => {
  if (!req.path.startsWith('/css') && !req.path.startsWith('/images') && !req.path.startsWith('/js')) {
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${req.method} ${req.path}`);
  }
  next();
});

// Static Assets Hosting
app.use(express.static(ROOT_DIR));
app.use('/uploads', express.static(path.join(ROOT_DIR, 'uploads')));

// ------------------------------------------------------------------------------
// REST API Route Mounts
// ------------------------------------------------------------------------------
const roomsRouter = require('./routes/rooms');
const bookingsRouter = require('./routes/bookings');
const diningRouter = require('./routes/dining');
const amenitiesRouter = require('./routes/amenities');
const offersRouter = require('./routes/offers');
const reviewsRouter = require('./routes/reviews');
const cmsRouter = require('./routes/cms');
const contactRouter = require('./routes/contact');
const newsletterRouter = require('./routes/newsletter');
const storageRouter = require('./routes/storage');
const { router: adminRouter } = require('./routes/admin');
const { router: authRouter } = require('./routes/auth');
const chatRouter = require('./routes/chat');

app.use('/api/rooms', roomsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/dining', diningRouter);
app.use('/api/amenities', amenitiesRouter);
app.use('/api/offers', offersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/cms', cmsRouter);
app.use('/api/contact', contactRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/storage', storageRouter);
app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);

// ------------------------------------------------------------------------------
// Health & Diagnostics Endpoint
// ------------------------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  const dbConnected = isDatabaseConnected();
  const supabaseStorageConfigured = Boolean(
    process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  );

  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'XYZ Hotel Full-Stack Supabase Engine',
    database: {
      connected: dbConnected,
      engine: 'PostgreSQL (Supabase) via Prisma ORM',
      pooler: process.env.DATABASE_URL ? 'Configured' : 'Missing',
      directUrl: process.env.DIRECT_URL ? 'Configured' : 'Missing',
    },
    storage: {
      configured: supabaseStorageConfigured,
      bucket: 'hotel-assets',
    },
    environment: {
      nodeVersion: process.version,
      port: PORT,
    },
  });
});

// Fallback for HTML pages routing
app.get('/admin', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'login.html'));
});

// 404 Handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `API endpoint ${req.method} ${req.baseUrl} not found.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred.',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`\n=============================================================`);
  console.log(`  XYZ Hotel Full-Stack Server Running`);
  console.log(`  Local URL:        http://localhost:${PORT}`);
  console.log(`  Admin CMS Portal: http://localhost:${PORT}/admin.html`);
  console.log(`  Health Status:    http://localhost:${PORT}/api/health`);
  console.log(`  Database Status:  ${isDatabaseConnected() ? 'CONNECTED (Supabase PostgreSQL)' : 'RESILIENT MODE (In-Memory Fallback Active)'}`);
  console.log(`=============================================================\n`);
});

// Graceful Shutdown
process.on('SIGINT', () => {
  server.close(() => {
    console.log('Server terminated safely.');
    process.exit(0);
  });
});

module.exports = app;
