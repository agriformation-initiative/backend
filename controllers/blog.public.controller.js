const Blog = require('../models/Blog.model');

// @desc  Get all published posts (paginated)
// @route GET /api/blog
exports.getPublishedPosts = async (req, res) => {
  try {
    const { category, tag, page = 1, limit = 9 } = req.query;

    const query = { status: 'published' };
    if (category) query.category = category;
    if (tag) query.tags = tag;

    const posts = await Blog.find(query)
      .populate('author', 'fullName')
      .select('-content -contentImages')
      .sort('-publishedAt')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      data: { posts, total, totalPages: Math.ceil(total / limit), currentPage: Number(page) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get single published post by slug
// @route GET /api/blog/:slug
exports.getPost = async (req, res) => {
  try {
    const post = await Blog.findOneAndUpdate(
      { slug: req.params.slug, status: 'published' },
      { $inc: { viewCount: 1 } },
      { new: true }
    )
      .populate('author', 'fullName')
      .lean();

    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    // Fetch 3 related posts (same category, excluding this one)
    const related = await Blog.find({
      status: 'published',
      category: post.category,
      _id: { $ne: post._id },
    })
      .select('title slug excerpt coverImage publishedAt readTime')
      .sort('-publishedAt')
      .limit(3)
      .lean();

    res.json({ success: true, data: { post, related } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
