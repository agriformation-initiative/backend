const Gallery = require('../models/Gallery.model');

const pageParams = (query, defaultLimit) => ({
  page: Math.max(parseInt(query.page) || 1, 1),
  limit: Math.min(Math.max(parseInt(query.limit) || defaultLimit, 1), 50),
});

// @desc    Get all published galleries (public)
// @route   GET /api/galleries/public
// @access  Public
exports.getPublishedGalleries = async (req, res) => {
  try {
    const { category } = req.query;
    const { page, limit } = pageParams(req.query, 12);


    const query = { isPublished: true };

    if (category && category !== 'all' && category.trim() !== '') {
      query.category = String(category);
    } else {
      // Blog-linked galleries are surfaced via the blog, not the main gallery
      query.category = { $ne: 'blog_post' };
    }


    const galleries = await Gallery.find(query)
      .select('title description coverImage eventDate location category photoCount viewCount createdAt')
      .sort('-eventDate')
      .limit(limit)
      .skip((page - 1) * limit)
      .lean(); // Add .lean() for better performance

    const count = await Gallery.countDocuments(query);


    res.json({
      success: true,
      data: {
        galleries,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });
  } catch (error) {
    console.error('Error in getPublishedGalleries:', error); // Detailed error
    res.status(500).json({
      success: false,
      message: error.message,
      
    });
  }
};

// @desc    Get featured galleries
// @route   GET /api/galleries/public/featured
// @access  Public
exports.getFeaturedGalleries = async (req, res) => {
  try {

    const galleries = await Gallery.find({ isPublished: true, category: { $ne: 'blog_post' } })
      .select('title description coverImage eventDate location category photoCount viewCount')
      .sort('-eventDate')
      .limit(6)
      .lean();


    res.json({
      success: true,
      data: { galleries }
    });
  } catch (error) {
    console.error('Error in getFeaturedGalleries:', error); // Detailed error
    res.status(500).json({
      success: false,
      message: error.message,
      
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
    const { page, limit } = pageParams(req.query, 12);

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
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const count = await Gallery.countDocuments({ isPublished: true, category });

    res.json({
      success: true,
      data: {
        galleries,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
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