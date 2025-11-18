const express = require('express');
const { register, login, getMe } = require('../controllers/auth.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Create admin (superadmin only)
router.post('/register-admin', protect, authorize('superadmin'), register);

module.exports = router;
