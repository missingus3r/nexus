import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import crypto from 'crypto';
import logger from '../utils/logger.js';

// Initialize S3 client
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  }
});

const BUCKET_NAME = process.env.S3_BUCKET || 'nexus-media';

/**
 * Generate presigned URL for direct upload
 * @param {String} fileType - File MIME type
 * @param {String} userId - User ID
 * @returns {Object} { uploadUrl, fileKey }
 */
export async function generatePresignedUploadUrl(fileType, userId) {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    if (!allowedTypes.includes(fileType)) {
      throw new Error('Invalid file type');
    }

    // Generate unique file key
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const extension = fileType.split('/')[1];
    const fileKey = `uploads/${userId}/${timestamp}-${random}.${extension}`;

    // Create presigned URL (valid for 5 minutes)
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    logger.info('Generated presigned URL', { userId, fileKey });

    return {
      uploadUrl,
      fileKey,
      expiresIn: 300
    };
  } catch (error) {
    logger.error('Error generating presigned URL:', error);
    throw error;
  }
}

/**
 * Strip EXIF data from image buffer
 * @param {Buffer} imageBuffer - Original image buffer
 * @returns {Buffer} Image buffer without EXIF
 */
export async function stripExif(imageBuffer) {
  try {
    // Use sharp to remove metadata
    const stripped = await sharp(imageBuffer)
      .rotate() // Auto-rotate based on EXIF (before removing)
      .withMetadata(false) // Remove all metadata
      .toBuffer();

    return stripped;
  } catch (error) {
    logger.error('Error stripping EXIF:', error);
    throw error;
  }
}

/**
 * Generate SHA-256 hash of file
 * @param {Buffer} buffer - File buffer
 * @returns {String} Hex hash
 */
export function generateFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Validate and process uploaded media
 * @param {String} fileKey - S3 file key
 * @param {String} fileType - File MIME type
 * @returns {Object} { url, hash, processedAt }
 */
export async function processUploadedMedia(fileKey, fileType) {
  try {
    // For images, we would fetch, strip EXIF, and re-upload
    // For now, just return the public URL
    const url = `https://${BUCKET_NAME}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com/${fileKey}`;

    logger.info('Media processed', { fileKey, url });

    return {
      url,
      type: fileType.startsWith('image/') ? 'image' : 'video',
      uploadedAt: new Date()
    };
  } catch (error) {
    logger.error('Error processing media:', error);
    throw error;
  }
}

/**
 * Generate thumbnail for image
 * @param {Buffer} imageBuffer - Original image
 * @param {Number} width - Thumbnail width
 * @returns {Buffer} Thumbnail buffer
 */
export async function generateThumbnail(imageBuffer, width = 200) {
  try {
    const thumbnail = await sharp(imageBuffer)
      .resize(width, null, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();

    return thumbnail;
  } catch (error) {
    logger.error('Error generating thumbnail:', error);
    throw error;
  }
}
