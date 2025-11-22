import fs from 'fs';
import logger from './logger.js';

/**
 * Clean up uploaded files
 * @param {Array} files - Array of uploaded files (from multer)
 */
export function cleanupUploadedFiles(files) {
  if (!files || !Array.isArray(files) || files.length === 0) {
    return;
  }

  files.forEach(file => {
    try {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (err) {
      logger.error('Failed to delete file:', {
        path: file.path,
        error: err.message
      });
    }
  });
}
