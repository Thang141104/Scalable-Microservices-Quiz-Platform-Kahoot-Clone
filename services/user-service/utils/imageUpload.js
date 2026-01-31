const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

/**
 * Process and optimize uploaded image
 * @param {String} inputPath - Path to original uploaded file
 * @param {Object} options - Processing options
 * @returns {Promise<String>} - Path to processed file
 */
const processImage = async (inputPath, options = {}) => {
  const {
    width = 400,
    height = 400,
    quality = 80,
    format = 'jpeg'
  } = options;
  
  try {
    // Generate output filename
    const parsedPath = path.parse(inputPath);
    const outputPath = path.join(parsedPath.dir, `${parsedPath.name}-processed${parsedPath.ext}`);
    
    // Process image with Sharp
    await sharp(inputPath)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality, progressive: true })
      .toFile(outputPath);
    
    // Delete original file
    await fs.unlink(inputPath);
    
    return outputPath;
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error('Failed to process image');
  }
};

/**
 * Delete image file
 * @param {String} filePath - Path to file to delete
 */
const deleteImage = async (filePath) => {
  try {
    if (filePath) {
      await fs.unlink(filePath);
      console.log('  Deleted image:', filePath);
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw - just log the error
  }
};

/**
 * Get public URL for uploaded image
 * @param {String} filename - Filename of uploaded image
 * @returns {String} - Public URL
 */
const getImageUrl = (filename) => {
  if (!filename) return null;
  
  // For now, return relative path
  // In production, this would be a CDN URL or full server URL
  return `/uploads/avatars/${path.basename(filename)}`;
};

/**
 * Validate image file
 * @param {Object} file - Multer file object
 * @returns {Boolean}
 */
const validateImage = (file) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`);
  }
  
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
  }
  
  return true;
};

module.exports = {
  processImage,
  deleteImage,
  getImageUrl,
  validateImage
};
