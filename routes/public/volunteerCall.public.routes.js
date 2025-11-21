// routes/public/volunteerCall.public.routes.js
const express = require('express');
const {
  getPublishedVolunteerCalls,
  getPublicVolunteerCall,
  applyForVolunteer
} = require('../../controllers/volunteerCall.public.controller');
const { optionalAuth } = require('../../middleware/auth.middleware');

const router = express.Router();

// Get all published calls
router.get('/', getPublishedVolunteerCalls);

// Get single call
router.get('/:id', getPublicVolunteerCall);

// Apply for opportunity (optionalAuth allows both logged in and guest users)
router.post('/:id/apply', optionalAuth, applyForVolunteer);

module.exports = router;