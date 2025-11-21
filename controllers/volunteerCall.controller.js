// controllers/volunteerCall.controller.js
const VolunteerCall = require('../models/VolunteerCall.model');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const { Readable } = require('stream');

// Configure multer for image upload
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

// Helper function to upload to Cloudinary
const uploadToCloudinary = (buffer, folder = 'volunteer-calls') => {
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

// @desc    Get all volunteer calls (admin view)
// @route   GET /api/admin/volunteer-calls
// @access  Private (Admin, Superadmin)
exports.getAllVolunteerCalls = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const calls = await VolunteerCall.find(query)
      .populate('createdBy', 'fullName email')
      .populate('lastUpdatedBy', 'fullName')
      .populate('applications.user', 'fullName email')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await VolunteerCall.countDocuments(query);

    res.json({
      success: true,
      data: {
        calls,
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

// @desc    Get single volunteer call details
// @route   GET /api/admin/volunteer-calls/:id
// @access  Private (Admin, Superadmin)
exports.getVolunteerCallDetails = async (req, res) => {
  try {
    const call = await VolunteerCall.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('lastUpdatedBy', 'fullName')
      .populate('applications.user', 'fullName email phoneNumber');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer call not found'
      });
    }

    res.json({
      success: true,
      data: { call }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new volunteer call
// @route   POST /api/admin/volunteer-calls
// @access  Private (Admin, Superadmin)
exports.createVolunteerCall = async (req, res) => {
  try {
    const {
      title,
      description,
      requirements,
      eventDate,
      location,
      numberOfVolunteers,
      deadline,
      category
    } = req.body;

    // Check if design image was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Design image is required'
      });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer);

    const call = await VolunteerCall.create({
      title,
      description,
      requirements,
      designImage: {
        url: result.secure_url,
        publicId: result.public_id
      },
      eventDate,
      location,
      numberOfVolunteers,
      deadline,
      category,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Volunteer call created successfully',
      data: { call }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update volunteer call
// @route   PUT /api/admin/volunteer-calls/:id
// @access  Private (Admin, Superadmin)
exports.updateVolunteerCall = async (req, res) => {
  try {
    const {
      title,
      description,
      requirements,
      eventDate,
      location,
      numberOfVolunteers,
      deadline,
      category
    } = req.body;

    const call = await VolunteerCall.findById(req.params.id);

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer call not found'
      });
    }

    const updateData = {
      title,
      description,
      requirements,
      eventDate,
      location,
      numberOfVolunteers,
      deadline,
      category,
      lastUpdatedBy: req.user.id
    };

    // If new image is uploaded, delete old one and upload new
    if (req.file) {
      await cloudinary.uploader.destroy(call.designImage.publicId);
      const result = await uploadToCloudinary(req.file.buffer);
      updateData.designImage = {
        url: result.secure_url,
        publicId: result.public_id
      };
    }

    const updatedCall = await VolunteerCall.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Volunteer call updated successfully',
      data: { call: updatedCall }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Publish/Unpublish volunteer call
// @route   PUT /api/admin/volunteer-calls/:id/publish
// @access  Private (Admin, Superadmin)
exports.togglePublishStatus = async (req, res) => {
  try {
    const call = await VolunteerCall.findById(req.params.id);

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer call not found'
      });
    }

    call.isPublished = !call.isPublished;
    if (call.isPublished && call.status === 'draft') {
      call.status = 'open';
    }
    call.lastUpdatedBy = req.user.id;
    await call.save();

    res.json({
      success: true,
      message: `Volunteer call ${call.isPublished ? 'published' : 'unpublished'} successfully`,
      data: { call }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update volunteer call status
// @route   PUT /api/admin/volunteer-calls/:id/status
// @access  Private (Admin, Superadmin)
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['draft', 'open', 'closed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const call = await VolunteerCall.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        lastUpdatedBy: req.user.id
      },
      { new: true }
    );

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer call not found'
      });
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: { call }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update application status
// @route   PUT /api/admin/volunteer-calls/:id/applications/:applicationId
// @access  Private (Admin, Superadmin)
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id, applicationId } = req.params;

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const call = await VolunteerCall.findById(id);

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer call not found'
      });
    }

    const application = call.applications.id(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    application.status = status;
    call.lastUpdatedBy = req.user.id;
    await call.save();

    res.json({
      success: true,
      message: 'Application status updated successfully',
      data: { call }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete volunteer call
// @route   DELETE /api/admin/volunteer-calls/:id
// @access  Private (Admin, Superadmin)
exports.deleteVolunteerCall = async (req, res) => {
  try {
    const call = await VolunteerCall.findById(req.params.id);

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer call not found'
      });
    }

    // Delete design image from Cloudinary
    await cloudinary.uploader.destroy(call.designImage.publicId);

    await call.deleteOne();

    res.json({
      success: true,
      message: 'Volunteer call deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get volunteer call statistics
// @route   GET /api/admin/volunteer-calls/stats
// @access  Private (Admin, Superadmin)
exports.getVolunteerCallStats = async (req, res) => {
  try {
    const totalCalls = await VolunteerCall.countDocuments();
    const openCalls = await VolunteerCall.countDocuments({ status: 'open', isPublished: true });
    const closedCalls = await VolunteerCall.countDocuments({ status: 'closed' });

    const totalApplications = await VolunteerCall.aggregate([
      { $unwind: '$applications' },
      { $count: 'total' }
    ]);

    const acceptedApplications = await VolunteerCall.aggregate([
      { $unwind: '$applications' },
      { $match: { 'applications.status': 'accepted' } },
      { $count: 'total' }
    ]);

    const categoryStats = await VolunteerCall.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalCalls,
          openCalls,
          closedCalls,
          totalApplications: totalApplications[0]?.total || 0,
          acceptedApplications: acceptedApplications[0]?.total || 0,
          categoryStats
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

// Export multer middleware
exports.uploadMiddleware = upload.single('designImage');