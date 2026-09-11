/**
 * XYZ Hotel — Supabase SDK Client & Storage Service
 * Manages Supabase Storage uploads, bucket creation, and asset URL resolution.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const DEFAULT_BUCKET = 'hotel-assets';

let supabaseClient = null;
let supabaseAdmin = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('your-project')) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    if (SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_SERVICE_ROLE_KEY.includes('your-service-role')) {
      supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }
  } catch (err) {
    console.warn('Supabase client initialization warning:', err.message);
  }
}

/**
 * Ensures the target storage bucket exists and is publicly readable
 */
async function ensureBucket(bucketName = DEFAULT_BUCKET) {
  if (!supabaseAdmin) return false;
  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    if (error) throw error;

    const exists = buckets.some(b => b.name === bucketName);
    if (!exists) {
      const { error: createErr } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB limit
      });
      if (createErr) throw createErr;
      console.log(`✓ Created public Supabase Storage bucket: '${bucketName}'`);
    }
    return true;
  } catch (err) {
    console.warn(`Storage bucket '${bucketName}' check warning:`, err.message);
    return false;
  }
}

/**
 * Uploads a file buffer to Supabase Storage and returns its public URL
 */
async function uploadToSupabaseStorage({ fileBuffer, fileName, mimeType, folder = 'uploads' }) {
  if (!supabaseAdmin && !supabaseClient) {
    // Return relative URL for local development if Supabase credentials are placeholders
    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    return {
      success: true,
      url: `/images/${safeName}`,
      path: `${folder}/${safeName}`,
      isLocal: true,
    };
  }

  const client = supabaseAdmin || supabaseClient;
  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = `${folder}/${safeName}`;

  try {
    await ensureBucket(DEFAULT_BUCKET);

    const { data, error } = await client.storage
      .from(DEFAULT_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) throw error;

    const { data: publicUrlData } = client.storage
      .from(DEFAULT_BUCKET)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrlData.publicUrl,
      path: filePath,
      bucket: DEFAULT_BUCKET,
    };
  } catch (err) {
    console.error('Supabase storage upload error:', err);
    throw err;
  }
}

module.exports = {
  supabaseClient,
  supabaseAdmin,
  ensureBucket,
  uploadToSupabaseStorage,
  DEFAULT_BUCKET,
};
