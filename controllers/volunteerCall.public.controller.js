// controllers/public/volunteerCall.public.controller.js
const VolunteerCall = require('../models/VolunteerCall.model');

// @desc    Get all published volunteer calls (public view)
// @route   GET /api/volunteer-calls
// @access  Public
exports.getPublishedVolunteerCalls = async (req, res) => {
  try {
    const { category, page = 1, limit = 12 } = req.query;
    
    const query = {
      isPublished: true,
      status: 'open',
      deadline: { $gte: new Date() }
    };
    
    if (category && category !== 'all') {
      query.category = category;
    }

    const calls = await VolunteerCall.find(query)
      .select('-applications -createdBy -lastUpdatedBy')
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

// @desc    Get single volunteer call (public view)
// @route   GET /api/volunteer-calls/:id
// @access  Public
exports.getPublicVolunteerCall = async (req, res) => {
  try {
    const call = await VolunteerCall.findOne({
      _id: req.params.id,
      isPublished: true
    }).select('-applications.user -createdBy -lastUpdatedBy');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer call not found'
      });
    }

    // Increment view count
    call.viewCount += 1;
    await call.save();

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

// @desc    Apply for volunteer opportunity
// @route   POST /api/volunteer-calls/:id/apply
// @access  Public
exports.applyForVolunteer = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, message } = req.body;

    const call = await VolunteerCall.findOne({
      _id: req.params.id,
      isPublished: true,
      status: 'open'
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer opportunity not found or no longer accepting applications'
      });
    }

    // Check if deadline has passed
    if (new Date() > new Date(call.deadline)) {
      return res.status(400).json({
        success: false,
        message: 'Application deadline has passed'
      });
    }

    // Check if user already applied (by email)
    const alreadyApplied = call.applications.some(app => app.email === email);
    if (alreadyApplied) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this opportunity'
      });
    }

    // Add application
    call.applications.push({
      user: req.user?.id || null, // If logged in
      fullName,
      email,
      phoneNumber,
      message,
      status: 'pending'
    });

    await call.save();

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        applicationId: call.applications[call.applications.length - 1]._id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};