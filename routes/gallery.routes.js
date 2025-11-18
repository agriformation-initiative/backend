const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const galleryController = require('../controllers/gallery.controller');
const publicGalleryController = require('../controllers/publicGallery.controller');

// ============================================
// PUBLIC ROUTES (no authentication required)
// ============================================

// IMPORTANT: Put specific routes BEFORE parameterized routes

// Get featured galleries (must be before /public/:id)
router.get(
  '/public/featured',
  publicGalleryController.getFeaturedGalleries
);

// Get galleries by category (must be before /public/:id)
router.get(
  '/public/category/:category',
  publicGalleryController.getGalleriesByCategory
);

// Get all published galleries
router.get(
  '/public',
  publicGalleryController.getPublishedGalleries
);

// Get single gallery details (parameterized route last)
router.get(
  '/public/:id',
  publicGalleryController.getGalleryById
);

// ============================================
// ADMIN ROUTES (authentication required)
// ============================================

// Apply authentication middleware to all routes below
router.use(protect);
router.use(authorize('admin', 'superadmin'));

// Gallery statistics (must be before /:id routes)
router.get(
  '/stats',
  galleryController.getGalleryStats
);

// Get all galleries (admin view)
router.get(
  '/',
  galleryController.getAllGalleries
);

// Create new gallery
router.post(
  '/',
  galleryController.createGallery
);

// Reorder photos (must be before /:id routes to avoid matching "reorder" as an id)
router.put(
  '/:id/photos/reorder',
  galleryController.reorderPhotos
);

// Upload photos to gallery
router.post(
  '/:id/photos',
  galleryController.uploadMiddleware,
  galleryController.uploadPhotos
);

// Update photo caption
router.put(
  '/:id/photos/:photoId',
  galleryController.updatePhotoCaption
);

// Delete photo from gallery
router.delete(
  '/:id/photos/:photoId',
  galleryController.deletePhoto
);

// Set cover image
router.put(
  '/:id/cover',
  galleryController.setCoverImage
);

// Publish/Unpublish gallery
router.put(
  '/:id/publish',
  galleryController.togglePublishStatus
);

// Get single gallery details (admin view)
router.get(
  '/:id',
  galleryController.getGalleryDetails
);

// Update gallery details
router.put(
  '/:id',
  galleryController.updateGallery
);

// Delete gallery
router.delete(
  '/:id',
  galleryController.deleteGallery
);

module.exports = router;