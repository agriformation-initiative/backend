const express = require('express');
const router = express.Router();
const {
  createProgram,
  getAllPrograms,
  getProgram,
  updateProgram,
  deleteProgram,
  getProgramStats
} = require('../controllers/programController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { uploadProgram } = require('../middleware/upload');

// Public routes
router.get('/', getAllPrograms);
router.get('/:identifier', getProgram);

// Protected routes (Admin & SuperAdmin)
router.post(
  '/',
  protect,
  authorize('admin', 'superadmin'),
  uploadProgram.array('images', 10),
  createProgram
);

router.put(
  '/:id',
  protect,
  authorize('admin', 'superadmin'),
  uploadProgram.array('images', 10),
  updateProgram
);

router.delete(
  '/:id',
  protect,
  authorize('admin', 'superadmin'),
  deleteProgram
);

// Statistics route
router.get(
  '/stats/overview',
  protect,
  authorize('admin', 'superadmin'),
  getProgramStats
);

module.exports = router;