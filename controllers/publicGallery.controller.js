const Gallery = require('../models/Gallery.model');

// @desc    Get all published galleries (public)
// @route   GET /api/galleries/public
// @access  Public
exports.getPublishedGalleries = async (req, res) => {
  try {
    const { category, page = 1, limit = 12 } = req.query;
    
    console.log('Query params:', { category, page, limit }); // Debug log
    
    const query = { isPublished: true };
    
    // Only add category filter if it exists and is not 'all'
    if (category && category !== 'all' && category.trim() !== '') {
      query.category = category;
    }

    console.log('MongoDB query:', query); // Debug log

    const galleries = await Gallery.find(query)
      .select('title description coverImage eventDate location category photoCount viewCount createdAt')
      .sort('-eventDate')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean(); // Add .lean() for better performance

    const count = await Gallery.countDocuments(query);

    console.log(`Found ${galleries.length} galleries out of ${count} total`); // Debug log

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
    console.error('Error in getPublishedGalleries:', error); // Detailed error
    res.status(500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Get featured galleries
// @route   GET /api/galleries/public/featured
// @access  Public
exports.getFeaturedGalleries = async (req, res) => {
  try {
    console.log('Fetching featured galleries...'); // Debug log
    
    const galleries = await Gallery.find({ isPublished: true })
      .select('title description coverImage eventDate location category photoCount viewCount')
      .sort('-eventDate')
      .limit(6)
      .lean();

    console.log(`Found ${galleries.length} featured galleries`); // Debug log

    res.json({
      success: true,
      data: { galleries }
    });
  } catch (error) {
    console.error('Error in getFeaturedGalleries:', error); // Detailed error
    res.status(500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Get single gallery with all photos (public)
// @route   GET /api/galleries/public/:id
// @access  Public
exports.getGalleryById = async (req, res) => {
  try {
    const gallery = await Gallery.findOne({
      _id: req.params.id,
      isPublished: true
    }).select('-createdBy -lastUpdatedBy');

    if (!gallery) {
      return res.status(404).json({
        success: false,
        message: 'Gallery not found'
      });
    }

    // Increment view count
    gallery.viewCount += 1;
    await gallery.save();

    // Sort photos by order
    if (gallery.photos && gallery.photos.length > 0) {
      gallery.photos.sort((a, b) => a.order - b.order);
    }

    res.json({
      success: true,
      data: { gallery }
    });
  } catch (error) {
    console.error('Error in getGalleryById:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get galleries by category
// @route   GET /api/galleries/public/category/:category
// @access  Public
exports.getGalleriesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 12 } = req.query;

    // Validate category
    const validCategories = ['farm_excursion', 'workshop', 'community_event', 'training', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    const galleries = await Gallery.find({
      isPublished: true,
      category
    })
      .select('title description coverImage eventDate location photoCount')
      .sort('-eventDate')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Gallery.countDocuments({ isPublished: true, category });

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
    console.error('Error in getGalleriesByCategory:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};