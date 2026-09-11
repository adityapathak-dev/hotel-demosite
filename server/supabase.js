/**
 * XYZ Hotel — Supabase SDK Client & Storage Service
 * Manages Supabase Storage uploads, bucket creation, and asset URL resolution.
 */

require('dotenv').config();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const DEFAULT_BUCKET = 'hotel-assets';

let supabaseClient = null;
let supabaseAdmin = null;

const isAnonValid = Boolean(SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('your-anon-key'));
const isServiceValid = Boolean(SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_SERVICE_ROLE_KEY.includes('your-service-role'));

if (SUPABASE_URL && !SUPABASE_URL.includes('your-project')) {
  try {
    if (isAnonValid) {
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    if (isServiceValid) {
      supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }
  } catch (err) {
    console.warn('Supabase client initialization warning:', err.message);
  }
}

function getStorageClient() {
  return supabaseAdmin || supabaseClient || null;
}

/**
 * Ensures the target storage bucket exists and is publicly readable
 */
async function ensureBucket(bucketName = DEFAULT_BUCKET) {
  if (!supabaseAdmin) return false;
  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    if (error) throw error;

    const exists = buckets && buckets.some((b) => b.name === bucketName);
    if (!exists) {
      const { error: createErr } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 15728640, // 15MB limit
      });
      if (createErr) throw createErr;
      console.log(`Created public Supabase Storage bucket: '${bucketName}'`);
    }
    return true;
  } catch (err) {
    console.warn(`Storage bucket '${bucketName}' check warning:`, err.message);
    return false;
  }
}

/**
 * Uploads a file buffer to Supabase Storage and returns its public URL.
 * Safely accepts { fileBuffer, fileName, filePath, mimeType, contentType, bucketName, folder }.
 */
async function uploadToSupabaseStorage(options = {}) {
  const {
    fileBuffer,
    fileName,
    filePath,
    mimeType,
    contentType,
    bucketName = DEFAULT_BUCKET,
    folder = 'uploads',
  } = options;

  const client = supabaseAdmin || supabaseClient;
  if (!client) {
    // Supabase keys are not configured or are placeholders — signal caller to use local storage
    return null;
  }

  const actualMime = contentType || mimeType || 'image/jpeg';
  const rawName = fileName || (filePath ? path.basename(filePath) : `asset_${Date.now()}.jpg`);
  const safeName = rawName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const targetPath = filePath || `${folder}/${Date.now()}_${safeName}`;

  try {
    await ensureBucket(bucketName);

    const { data, error } = await client.storage
      .from(bucketName)
      .upload(targetPath, fileBuffer, {
        contentType: actualMime,
        upsert: true,
      });

    if (error) throw error;

    const { data: publicUrlData } = client.storage
      .from(bucketName)
      .getPublicUrl(targetPath);

    const publicUrl = publicUrlData ? publicUrlData.publicUrl : '';

    return {
      success: true,
      url: publicUrl,
      publicUrl: publicUrl,
      path: targetPath,
      bucket: bucketName,
    };
  } catch (err) {
    console.warn('Supabase storage upload failed:', err.message);
    throw err;
  }
}

module.exports = {
  supabaseClient,
  supabaseAdmin,
  getStorageClient,
  ensureBucket,
  uploadToSupabaseStorage,
  DEFAULT_BUCKET,
};
