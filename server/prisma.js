/**
 * XYZ Hotel — Prisma Client Singleton
 * Manages database connection pooling, error logging, and connection status.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

let prisma;
let isConnected = false;

try {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  // Verify connection asynchronously on startup
  prisma.$connect()
    .then(() => {
      isConnected = true;
      console.log('✓ Successfully connected to Supabase PostgreSQL database via Prisma ORM.');
    })
    .catch((err) => {
      isConnected = false;
      console.warn('⚠️ Notice: Prisma database connection could not be established immediately.');
      console.warn(`  Reason: ${err.message}`);
      console.warn('  Configure your valid DATABASE_URL in .env to connect to live Supabase PostgreSQL.');
    });
} catch (e) {
  console.warn('PrismaClient initialization warning:', e.message);
}

module.exports = {
  prisma,
  isDatabaseConnected: () => isConnected,
};
