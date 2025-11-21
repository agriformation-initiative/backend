const express = require('express');
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  createVolunteerCall,
  updateVolunteerCall,
  getActiveCalls,
  getCallById,
  getAdminCalls,
  togglePublish,
  deleteVolunteerCall
} = require('../controllers/volunteerCall.controller');

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  }
});

// Public routes
router.get('/', getActiveCalls);
router.get('/:id', getCallById);

// Admin routes
router.use(protect);
router.use(authorize('admin', 'superadmin'));

router.post('/', upload.single('bannerImage'), createVolunteerCall);
router.put('/:id', upload.single('bannerImage'), updateVolunteerCall);
router.get('/admin/all', getAdminCalls);
router.patch('/:id/publish', togglePublish);
router.delete('/:id', deleteVolunteerCall);

module.exports = router;