/**
 * XYZ Hotel — Supabase Storage & Media Asset API Routes
 * Direct upload to Supabase Storage buckets, local fallback, and media asset registry.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadToSupabaseStorage, getStorageClient } = require('../supabase');
const { prisma, isDatabaseConnected } = require('../prisma');

// Multer memory storage configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|svg\+xml|svg/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype.toLowerCase();

    if (allowed.test(ext) || allowed.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Only image formats (JPG, PNG, WEBP, GIF, SVG) are supported.'));
    }
  },
});

// Ensure local uploads fallback folder exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    console.warn('Could not create local uploads directory:', err.message);
  }
}

/**
 * POST /api/storage/upload
 * Upload an asset to Supabase Storage (with fallback)
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const category = req.body.category || 'general';
    const originalName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const destinationPath = `${category}/${timestamp}_${originalName}`;

    let publicUrl = '';
    let storageType = 'supabase';

    // 1. Attempt Supabase Storage Upload
    try {
      const uploadResult = await uploadToSupabaseStorage({
        bucketName: 'hotel-assets',
        filePath: destinationPath,
        fileName: originalName,
        fileBuffer: req.file.buffer,
        contentType: req.file.mimetype,
      });

      if (uploadResult && (uploadResult.publicUrl || uploadResult.url)) {
        publicUrl = uploadResult.publicUrl || uploadResult.url;
      }
    } catch (supabaseError) {
      console.warn('Supabase storage upload failed or not configured, using local fallback:', supabaseError.message);
    }

    // 2. Fallback to local storage if Supabase failed or returned empty
    if (!publicUrl) {
      storageType = 'local';
      const localFileName = `${timestamp}_${originalName}`;
      const localFilePath = path.join(uploadsDir, localFileName);
      fs.writeFileSync(localFilePath, req.file.buffer);
      publicUrl = `/uploads/${localFileName}`;
    }

    // 3. Register media in database if connected
    if (isDatabaseConnected()) {
      try {
        const asset = await prisma.mediaAsset.create({
          data: {
            bucket: storageType === 'supabase' ? 'hotel-assets' : 'local',
            fileName: originalName,
            filePath: destinationPath,
            fileUrl: publicUrl,
            fileType: req.file.mimetype,
            altText: req.body.altText || originalName,
            sizeBytes: req.file.size,
            category,
          },
        });

        return res.status(201).json({
          success: true,
          message: 'Asset uploaded and registered successfully',
          data: {
            url: publicUrl,
            storageType,
            asset,
          },
        });
      } catch (dbErr) {
        console.warn('Could not record asset in Prisma:', dbErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Asset uploaded successfully',
      data: {
        url: publicUrl,
        storageType,
        fileName: originalName,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/storage/upload:', error);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
});

/**
 * GET /api/storage/assets
 * Retrieve list of registered media assets
 */
router.get('/assets', async (req, res) => {
  try {
    const { category } = req.query;

    if (isDatabaseConnected()) {
      const where = category ? { category } : {};
      const assets = await prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ success: true, data: assets });
    }

    return res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list media assets', error: error.message });
  }
});

module.exports = router;
