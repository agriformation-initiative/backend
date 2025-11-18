const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// Generate JWT Token
const generateToken = (id) => {
  const expiresIn = process.env.JWT_EXPIRES || '7d'; // fallback to 7 days

  // Extra safety: ensure it's a valid format
  if (!expiresIn || expiresIn.trim() === '') {
    console.warn('JWT_EXPIRES not set, using default 7d');
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public (for volunteers) / Private (for admins creating other admins)
exports.register = async (req, res) => {
  try {
    const { fullName, email, password, phoneNumber, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // If registering as admin/superadmin, must be done by superadmin
    if (role && role !== 'volunteer') {
      if (!req.user || req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Only superadmin can create admin accounts'
        });
      }
    }

    const user = await User.create({
      fullName,
      email,
      password,
      phoneNumber,
      role: role || 'volunteer',
      createdBy: req.user ? req.user._id : null
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};