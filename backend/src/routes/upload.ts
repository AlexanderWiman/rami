import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for files/videos
  },
});

// POST /api/upload - Upload file/image/video to Cloudinary
router.post('/', authenticateToken, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(500).json({ error: 'Cloudinary not configured' });
    }

    const isImage = req.file.mimetype.startsWith('image/');
    const isVideo = req.file.mimetype.startsWith('video/');
    const resourceType = isImage ? 'image' : isVideo ? 'video' : 'raw';

    // Upload to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'rami-forum',
          resource_type: resourceType,
          transformation: isImage
            ? [
                { width: 1200, crop: 'limit' }, // Max width 1200px
                { quality: 'auto:good' }, // Auto quality
                { fetch_format: 'auto' }, // Auto format (webp, etc)
              ]
            : undefined,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file!.buffer);
    });

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      resource_type: result.resource_type,
      original_filename: result.original_filename,
      format: result.format,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// DELETE /api/upload/:public_id - Delete image from Cloudinary
router.delete('/:public_id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { public_id } = req.params;
    const resourceType = (req.query.resource_type as string) || 'image';

    // The public_id may contain slashes (folder/filename), so we need to reconstruct it
    const fullPublicId = `rami-forum/${public_id}`;

    await cloudinary.uploader.destroy(fullPublicId, { resource_type: resourceType });

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;
