const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User.model');
const emails = require('../utils/emails');

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
    const { fullName, password, phoneNumber, role } = req.body;
    // Coerce to a string so a JSON object like {"$gt": ""} can never reach the query
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    if (!email || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Provide a valid email and a password of at least 6 characters'
      });
    }

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
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;

    if (!email || typeof password !== 'string' || !password) {
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

const sameResponse = {
  success: true,
  message: 'If an account exists for that email, a reset link is on its way.'
};

// @desc    Email a password reset link
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const user = email ? await User.findOne({ email, isActive: true }) : null;

    if (user) {
      const token = user.createPasswordResetToken(60);
      await user.save({ validateBeforeSave: false });
      emails.passwordReset(user, token);
    }

    // Same answer whether or not the account exists, so this cannot be used to find accounts
    res.json(sameResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

// @desc    Set a new password with an emailed token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (typeof token !== 'string' || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Provide a valid link and a password of at least 6 characters'
      });
    }

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() }
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'This link has expired or was already used. Request a new one.'
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password updated. You can sign in now.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

// @desc    Change password while signed in
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Enter your current password and a new password of at least 6 characters'
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Your current password is not correct' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};
