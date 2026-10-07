// controllers/public/volunteerCall.public.controller.js
const VolunteerCall = require('../models/VolunteerCall.model');
const emails = require('../utils/emails');

// @desc    Get all published volunteer calls (public view)
// @route   GET /api/volunteer-calls
// @access  Public
exports.getPublishedVolunteerCalls = async (req, res) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);

    const query = {
      isPublished: true,
      status: { $in: ['open', 'closed'] } // Include both open and closed
    };

    // Only filter by category if it's provided and not 'all'
    if (category && category !== 'all') {
      query.category = category;
    }

    const [calls, count] = await Promise.all([
      VolunteerCall.find(query)
        .select('-applications -createdBy -lastUpdatedBy')
        .sort('-createdAt')
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(),
      VolunteerCall.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        calls,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });
  } catch (error) {
    console.error('Error fetching volunteer calls:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch volunteer calls'
    });
  }
};

// @desc    Get single volunteer call (public view)
// @route   GET /api/volunteer-calls/:id
// @access  Public
exports.getPublicVolunteerCall = async (req, res) => {
  try {
    // Applicant details are private: never send the applications array to the public
    const call = await VolunteerCall.findOneAndUpdate(
      { _id: req.params.id, isPublished: true },
      { $inc: { viewCount: 1 } },
      { new: true }
    )
      .select('-applications -createdBy -lastUpdatedBy')
      .lean();

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
    console.error('Error fetching volunteer call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch volunteer call'
    });
  }
};

// @desc    Apply for volunteer opportunity
// @route   POST /api/volunteer-calls/:id/apply
// @access  Public
exports.applyForVolunteer = async (req, res) => {
  try {
    const { fullName, phoneNumber, message } = req.body;
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    // Validate required fields
    if (!fullName || !email || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const call = await VolunteerCall.findOne({
      _id: req.params.id,
      isPublished: true
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer opportunity not found'
      });
    }

    // Only check status if it's explicitly closed
    if (call.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'This opportunity is no longer accepting applications'
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
    const alreadyApplied = call.applications.some(app => app.email?.toLowerCase() === email);
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
      message: message || '',
      status: 'pending'
    });

    await call.save();

    const saved = call.applications[call.applications.length - 1];
    emails.callApplicationReceived(call, saved);
    emails.acknowledge(saved.email, saved.fullName, 'volunteer application');

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        applicationId: call.applications[call.applications.length - 1]._id
      }
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application'
    });
  }
};