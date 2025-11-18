const Volunteer = require('../models/Volunteer.model');
const VolunteerApplication = require('../models/VolunteerApplication.model');
const User = require('../models/User.model');

// @desc    Submit volunteer application (public)
// @route   POST /api/volunteers/apply
// @access  Public
exports.submitApplication = async (req, res) => {
  try {
    const { fullName, email, preferredRole, aboutYourself } = req.body;

    // Check if email already has pending application
    const existingApp = await VolunteerApplication.findOne({ 
      email, 
      status: 'pending' 
    });

    if (existingApp) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending application'
      });
    }

    const application = await VolunteerApplication.create({
      fullName,
      email,
      preferredRole,
      aboutYourself
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully! We\'ll review it and get back to you soon.',
      data: { application }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get volunteer profile
// @route   GET /api/volunteers/profile
// @access  Private (Volunteer)
exports.getProfile = async (req, res) => {
  try {
    const volunteer = await Volunteer.findOne({ user: req.user.id })
      .populate('user', 'fullName email phoneNumber')
      .populate('reviewedBy', 'fullName');

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer profile not found'
      });
    }

    res.json({
      success: true,
      data: { volunteer }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update volunteer profile
// @route   PUT /api/volunteers/profile
// @access  Private (Volunteer)
exports.updateProfile = async (req, res) => {
  try {
    const allowedUpdates = ['preferredRole', 'aboutYourself', 'skills', 'availability', 'location'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const volunteer = await Volunteer.findOneAndUpdate(
      { user: req.user.id },
      updates,
      { new: true, runValidators: true }
    ).populate('user', 'fullName email phoneNumber');

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer profile not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { volunteer }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};