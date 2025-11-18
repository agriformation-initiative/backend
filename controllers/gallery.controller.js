const Gallery = require('../models/Gallery.model');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const { Readable } = require('stream');


// Add this to verify Cloudinary config
console.log('Cloudinary config loaded:', {
  cloud_name: cloudinary.config().cloud_name,
  api_key: cloudinary.config().api_key ? '***' + cloudinary.config().api_key.slice(-4) : 'missing'
});

// Configure multer to use memory storage
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.'), false);
    }
  }
});

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder = 'organization-galleries') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        transformation: [
          { width: 1200, height: 1200, crop: 'limit', quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const bufferStream = Readable.from(buffer);
    bufferStream.pipe(uploadStream);
  });
};

// @desc    Get all galleries (admin view)
// @route   GET /api/admin/galleries
// @access  Private (Admin, Superadmin)
exports.getAllGalleries = async (req, res) => {
  try {
    const { category, isPublished, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (category) query.category = category;
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';

    const galleries = await Gallery.find(query)
      .populate('createdBy', 'fullName email')
      .populate('lastUpdatedBy', 'fullName')
      .sort('-eventDate')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Gallery.countDocuments(query);

    res.json({
      success: true,
      data: {
        galleries,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single gallery details
// @route   GET /api/admin/galleries/:id
// @access  Private (Admin, Superadmin)
exports.getGalleryDetails = async (req, res) => {
  try {
    const gallery = await Gallery.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('lastUpdatedBy', 'fullName');

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: 'Gallery not found'
      });
    }

    res.json({
      success: true,
      data: { gallery }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new gallery
// @route   POST /api/admin/galleries
// @access  Private (Admin, Superadmin)
exports.createGallery = async (req, res) => {
  try {
    const { title, description, eventDate, location, category } = req.body;

    const gallery = await Gallery.create({
      title,
      description,
      eventDate,
      location,
      category,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Gallery created successfully',
      data: { gallery }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update gallery details
// @route   PUT /api/admin/galleries/:id
// @access  Private (Admin, Superadmin)
exports.updateGallery = async (req, res) => {
  try {
    const { title, description, eventDate, location, category } = req.body;

    const gallery = await Gallery.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        eventDate,
        location,
        category,
        lastUpdatedBy: req.user.id
      },
      { new: true, runValidators: true }
    );

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: 'Gallery not found'
      });
    }

    res.json({
      success: true,
      message: 'Gallery updated successfully',
      data: { gallery }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Upload photos to gallery
// @route   POST /api/admin/galleries/:id/photos
// @access  Private (Admin, Superadmin)
// In gallery.controller.js - uploadPhotos function
// In gallery.controller.js - uploadPhotos function
exports.uploadPhotos = async (req, res) => {
  try {
    console.log('Request params:', req.params);
    console.log('Request files:', req.files);
    console.log('Request body:', req.body);
    
    const gallery = await Gallery.findById(req.params.id);

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: 'Gallery not found'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    console.log('Starting Cloudinary upload for', req.files.length, 'files');

    // Upload all files to Cloudinary
    const uploadPromises = req.files.map(async (file, index) => {
      try {
        console.log(`Uploading file ${index + 1}:`, file.originalname);
        const result = await uploadToCloudinary(file.buffer);
        console.log(`File ${index + 1} uploaded successfully:`, result.public_id);
        return {
          url: result.secure_url,
          publicId: result.public_id,
          caption: req.body.caption || '',
          order: gallery.photos.length + index
        };
      } catch (uploadError) {
        console.error(`Error uploading file ${index + 1}:`, uploadError);
        throw uploadError;
      }
    });

    const uploadedPhotos = await Promise.all(uploadPromises);
    console.log('All files uploaded successfully');
    
    gallery.photos.push(...uploadedPhotos);
    gallery.lastUpdatedBy = req.user.id;

    await gallery.save();

    res.json({
      success: true,
      message: `${uploadedPhotos.length} photo(s) uploaded successfully`,
      data: { gallery }
    });
  } catch (error) {
    console.error('Upload error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
// @desc    Update photo caption
// @route   PUT /api/admin/galleries/:id/photos/:photoId
// @access  Private (Admin, Superadmin)
exports.updatePhotoCaption = async (req, res) => {
  try {
    const { caption } = req.body;
    const { id, photoId } = req.params;

    const gallery = await Gallery.findById(id);

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: 'Gallery not found'
      });
    }

    const photo = gallery.photos.id(photoId);

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    photo.caption = caption;
    gallery.lastUpdatedBy = req.user.id;
    await gallery.save();

    res.json({
      success: true,
      message: 'Photo caption updated successfully',
      data: { gallery }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Reorder photos in gallery
// @route   PUT /api/admin/galleries/:id/photos/reorder
// @access  Private (Admin, Superadmin)
exports.reorderPhotos = async (req, res) => {
  try {
    const { photoOrders } = req.body; // Array of { photoId, order }

    const gallery = await Gallery.findById(req.params.id);

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: 'Gallery not found'
      });
    }

    photoOrders.forEach(({ photoId, order }) => {
      const photo = gallery.photos.id(photoId);
      if (photo) {
        photo.order = order;
      }
    });

    gallery.lastUpdatedBy = req.user.id;
    await gallery.save();

    res.json({
      success: true,
      message: 'Photos reordered successfully',
      data: { gallery }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete photo from gallery
// @route   DELETE /api/admin/galleries/:id/photos/:photoId
// @access  Private (Admin, Superadmin)
exports.deletePhoto = async (req, res) => {
  try {
    const { id, photoId } = req.params;

    const gallery = await Gallery.findById(id);

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: 'Gallery not found'
      });
    }

    const photo = gallery.photos.id(photoId);

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(photo.publicId);

    // Remove from gallery
    gallery.photos.pull(photoId);
    gallery.lastUpdatedBy = req.user.id;
    await gallery.save();

    res.json({
      success: true,
      message: 'Photo deleted successfully',
      data: { gallery }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Set cover image for gallery
// @route   PUT /api/admin/galleries/:id/cover
// @access  Private (Admin, Superadmin)
exports.setCoverImage = async (req, res) => {
  try {
    const { photoId } = req.body;
    const gallery = await Gallery.findById(req.params.id);

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: 'Gallery not found'
      });
    }

    const photo = gallery.photos.id(photoId);

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found'
      });
    }

    gallery.coverImage = {
      url: photo.url,
      publicId: photo.publicId
    };
    gallery.lastUpdatedBy = req.user.id;

    await gallery.save();

    res.json({
      success: true,
      message: 'Cover image set successfully',
      data: { gallery }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Publish/Unpublish gallery
// @route   PUT /api/admin/galleries/:id/publish
// @access  Private (Admin, Superadmin)
exports.togglePublishStatus = async (req, res) => {
  try {
    const gallery = await Gallery.findById(req.params.id);

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: 'Gallery not found'
      });
    }

    gallery.isPublished = !gallery.isPublished;
    gallery.lastUpdatedBy = req.user.id;
    await gallery.save();

    res.json({
      success: true,
      message: `Gallery ${gallery.isPublished ? 'published' : 'unpublished'} successfully`,
      data: { gallery }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete entire gallery
// @route   DELETE /api/admin/galleries/:id
// @access  Private (Admin, Superadmin)
exports.deleteGallery = async (req, res) => {
  try {
    const gallery = await Gallery.findById(req.params.id);

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: 'Gallery not found'
      });
    }

    // Delete all photos from Cloudinary
    const deletePromises = gallery.photos.map(photo => 
      cloudinary.uploader.destroy(photo.publicId)
    );
    await Promise.all(deletePromises);

    // Delete cover image if exists
    if (gallery.coverImage?.publicId) {
      await cloudinary.uploader.destroy(gallery.coverImage.publicId);
    }

    await gallery.deleteOne();

    res.json({
      success: true,
      message: 'Gallery deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get gallery statistics
// @route   GET /api/admin/galleries/stats
// @access  Private (Admin, Superadmin)
exports.getGalleryStats = async (req, res) => {
  try {
    const totalGalleries = await Gallery.countDocuments();
    const publishedGalleries = await Gallery.countDocuments({ isPublished: true });
    
    const totalPhotos = await Gallery.aggregate([
      { $project: { photoCount: { $size: '$photos' } } },
      { $group: { _id: null, total: { $sum: '$photoCount' } } }
    ]);

    const totalViews = await Gallery.aggregate([
      { $group: { _id: null, total: { $sum: '$viewCount' } } }
    ]);

    const categoryCounts = await Gallery.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalGalleries,
          publishedGalleries,
          totalPhotos: totalPhotos[0]?.total || 0,
          totalViews: totalViews[0]?.total || 0,
          categoryCounts
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Export multer upload middleware
exports.uploadMiddleware = upload.array('photos', 20); // Max 20 photos per upload