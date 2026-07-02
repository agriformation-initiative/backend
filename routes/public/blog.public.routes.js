const express = require('express');
const { getPublishedPosts, getPost } = require('../../controllers/blog.public.controller');

const router = express.Router();

router.get('/', getPublishedPosts);
router.get('/:slug', getPost);

module.exports = router;
