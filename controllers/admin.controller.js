const Volunteer = require('../models/Volunteer.model');
const VolunteerApplication = require('../models/VolunteerApplication.model');
const User = require('../models/User.model');

// @desc    Get all volunteer applications
// @route   GET /api/admin/applications
// @access  Private (Admin, Superadmin)
exports.getApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = status ? { status } : {};
    
    const applications = await VolunteerApplication.find(query)
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('processedBy', 'fullName');

    const count = await VolunteerApplication.countDocuments(query);

    res.json({
      success: true,
      data: {
        applications,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
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

// @desc    Review volunteer application
// @route   PUT /api/admin/applications/:id/review
// @access  Private (Admin, Superadmin)
exports.reviewApplication = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const { id } = req.params;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either accepted or rejected'
      });
    }

    const application = await VolunteerApplication.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    application.status = status;
    application.notes = notes;
    application.processedBy = req.user.id;
    application.processedAt = Date.now();

    await application.save();

    // If accepted, create user and volunteer profile
    if (status === 'accepted') {
      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8);

      const user = await User.create({
        fullName: application.fullName,
        email: application.email,
        password: tempPassword,
        role: 'volunteer',
        createdBy: req.user.id
      });

      await Volunteer.create({
        user: user._id,
        preferredRole: application.preferredRole,
        aboutYourself: application.aboutYourself,
        status: 'approved',
        reviewedBy: req.user.id,
        reviewedAt: Date.now()
      });

      // TODO: Send email with credentials
    }

    res.json({
      success: true,
      message: `Application ${status} successfully`,
      data: { application }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all volunteers
// @route   GET /api/admin/volunteers
// @access  Private (Admin, Superadmin)
exports.getAllVolunteers = async (req, res) => {
  try {
    const { status, role, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (role) query.preferredRole = role;

    const volunteers = await Volunteer.find(query)
      .populate('user', 'fullName email phoneNumber isActive')
      .populate('reviewedBy', 'fullName')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Volunteer.countDocuments(query);

    res.json({
      success: true,
      data: {
        volunteers,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
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

// @desc    Get single volunteer details
// @route   GET /api/admin/volunteers/:id
// @access  Private (Admin, Superadmin)
exports.getVolunteerDetails = async (req, res) => {
  try {
    const volunteer = await Volunteer.findById(req.params.id)
      .populate('user', 'fullName email phoneNumber isActive createdAt')
      .populate('reviewedBy', 'fullName');

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer not found'
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

// @desc    Update volunteer status
// @route   PUT /api/admin/volunteers/:id/status
// @access  Private (Admin, Superadmin)
exports.updateVolunteerStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const { id } = req.params;

    const volunteer = await Volunteer.findByIdAndUpdate(
      id,
      { 
        status, 
        reviewNotes: notes,
        reviewedBy: req.user.id,
        reviewedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).populate('user', 'fullName email');

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer not found'
      });
    }

    res.json({
      success: true,
      message: 'Volunteer status updated successfully',
      data: { volunteer }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Assign volunteer to program
// @route   POST /api/admin/volunteers/:id/assign
// @access  Private (Admin, Superadmin)
exports.assignToProgram = async (req, res) => {
  try {
    const { programName, role, startDate, endDate } = req.body;
    const { id } = req.params;

    const volunteer = await Volunteer.findById(id);

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer not found'
      });
    }

    volunteer.assignedPrograms.push({
      programName,
      role,
      startDate,
      endDate,
      status: 'active'
    });

    await volunteer.save();

    res.json({
      success: true,
      message: 'Volunteer assigned to program successfully',
      data: { volunteer }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin, Superadmin)
exports.getDashboardStats = async (req, res) => {
  try {
    const totalVolunteers = await Volunteer.countDocuments();
    const activeVolunteers = await Volunteer.countDocuments({ status: 'approved' });
    const pendingApplications = await VolunteerApplication.countDocuments({ status: 'pending' });
    const totalHours = await Volunteer.aggregate([
      { $group: { _id: null, total: { $sum: '$hoursContributed' } } }
    ]);

    const recentApplications = await VolunteerApplication.find()
      .sort('-createdAt')
      .limit(5);

    res.json({
      success: true,
      data: {
        stats: {
          totalVolunteers,
          activeVolunteers,
          pendingApplications,
          totalHoursContributed: totalHours[0]?.total || 0
        },
        recentApplications
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// SUPERADMIN ONLY FUNCTIONS

// @desc    Get all users (including admins)
// @route   GET /api/admin/users
// @access  Private (Superadmin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { role, isActive, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query)
      .select('-password')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
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

// @desc    Create admin user
// @route   POST /api/admin/users/create-admin
// @access  Private (Superadmin only)
exports.createAdmin = async (req, res) => {
  try {
    const { fullName, email, password, phoneNumber } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const user = await User.create({
      fullName,
      email,
      password,
      phoneNumber,
      role: 'admin',
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role
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

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private (Superadmin only)
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!['admin', 'volunteer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Deactivate/Activate user
// @route   PUT /api/admin/users/:id/toggle-status
// @access  Private (Superadmin only)
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
