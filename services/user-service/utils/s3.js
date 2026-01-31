// S3 utilities for avatar upload
// Currently using local file storage via imageUpload.js
// This is a stub to maintain compatibility with existing code

const { processImage, deleteImage, getImageUrl } = require('./imageUpload');

/**
 * Upload avatar to storage (local file system)
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {String} userId - User ID
 * @returns {String} Avatar URL
 */
async function uploadAvatar(fileBuffer, userId) {
  // Use local file storage instead of S3
  const filename = `avatar-${userId}-${Date.now()}.jpg`;
  const filePath = await processImage(fileBuffer, filename);
  return getImageUrl(filename);
}

/**
 * Replace existing avatar with new one
 * @param {Buffer} fileBuffer - New image file buffer
 * @param {String} userId - User ID
 * @param {String} oldAvatarUrl - Old avatar URL to delete
 * @returns {String} New avatar URL
 */
async function replaceAvatar(fileBuffer, userId, oldAvatarUrl) {
  // Delete old avatar if exists
  if (oldAvatarUrl) {
    try {
      await deleteAvatar(oldAvatarUrl);
    } catch (err) {
      console.warn('Failed to delete old avatar:', err.message);
    }
  }
  
  // Upload new avatar
  return await uploadAvatar(fileBuffer, userId);
}

/**
 * Delete avatar from storage
 * @param {String} avatarUrl - Avatar URL to delete
 */
async function deleteAvatar(avatarUrl) {
  if (!avatarUrl) return;
  
  // Extract filename from URL
  const filename = avatarUrl.split('/').pop();
  
  try {
    await deleteImage(filename);
  } catch (err) {
    console.warn('Failed to delete avatar file:', err.message);
  }
}

module.exports = {
  uploadAvatar,
  replaceAvatar,
  deleteAvatar
};
