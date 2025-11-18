const express = require('express');
const {
  getApplications,
  reviewApplication,
  getAllVolunteers,
  getVolunteerDetails,
  updateVolunteerStatus,
  assignToProgram,
  getDashboardStats,
  getAllUsers,
  createAdmin,
  updateUserRole,
  toggleUserStatus
} = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Admin & Superadmin routes
router.get('/applications', authorize('admin', 'superadmin'), getApplications);
router.put('/applications/:id/review', authorize('admin', 'superadmin'), reviewApplication);
router.get('/volunteers', authorize('admin', 'superadmin'), getAllVolunteers);
router.get('/volunteers/:id', authorize('admin', 'superadmin'), getVolunteerDetails);
router.put('/volunteers/:id/status', authorize('admin', 'superadmin'), updateVolunteerStatus);
router.post('/volunteers/:id/assign', authorize('admin', 'superadmin'), assignToProgram);
router.get('/dashboard/stats', authorize('admin', 'superadmin'), getDashboardStats);

// Superadmin only routes
router.get('/users', authorize('superadmin'), getAllUsers);
router.post('/users/create-admin', authorize('superadmin'), createAdmin);
router.put('/users/:id/role', authorize('superadmin'), updateUserRole);
router.put('/users/:id/toggle-status', authorize('superadmin'), toggleUserStatus);

module.exports = router;