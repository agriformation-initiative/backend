const express = require('express');
const {
  createPost,
  getPosts,
  getPost,
  updatePost,
  uploadContentImage,
  deleteContentImage,
  togglePublish,
  deletePost,
  upload,
} = require('../../controllers/blog.admin.controller');
const { protect, authorize } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'superadmin'));

router.route('/')
  .get(getPosts)
  .post(upload.single('coverImage'), createPost);

router.route('/:id')
  .get(getPost)
  .put(updatePost)
  .delete(deletePost);

router.put('/:id/publish', togglePublish);

router.route('/:id/images')
  .post(upload.single('image'), uploadContentImage);

router.delete('/:id/images/:imageId', deleteContentImage);

module.exports = router;
