const express = require('express');
const {
  submitApplication,
  getProfile,
  updateProfile
} = require('../controllers/volunteer.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Public route
router.post('/apply', submitApplication);

// Protected routes (volunteers only)
router.get('/profile', protect, authorize('volunteer'), getProfile);
router.put('/profile', protect, authorize('volunteer'), updateProfile);

module.exports = router;
