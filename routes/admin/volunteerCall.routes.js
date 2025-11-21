// routes/admin/volunteerCall.routes.js
const express = require('express');
const {
  getAllVolunteerCalls,
  getVolunteerCallDetails,
  createVolunteerCall,
  updateVolunteerCall,
  togglePublishStatus,
  updateStatus,
  updateApplicationStatus,
  deleteVolunteerCall,
  getVolunteerCallStats,
  uploadMiddleware
} = require('../../controllers/volunteerCall.controller');
const { protect, authorize } = require('../../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication and admin/superadmin role
router.use(protect);
router.use(authorize('admin', 'superadmin'));

// Statistics route
router.get('/stats', getVolunteerCallStats);

// CRUD routes
router.route('/')
  .get(getAllVolunteerCalls)
  .post(uploadMiddleware, createVolunteerCall);

router.route('/:id')
  .get(getVolunteerCallDetails)
  .put(uploadMiddleware, updateVolunteerCall)
  .delete(deleteVolunteerCall);

// Publish/unpublish
router.put('/:id/publish', togglePublishStatus);

// Update status
router.put('/:id/status', updateStatus);

// Manage applications
router.put('/:id/applications/:applicationId', updateApplicationStatus);

module.exports = router;