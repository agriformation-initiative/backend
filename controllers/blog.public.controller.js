const Blog = require('../models/Blog.model');

const pageParams = (query, defaultLimit) => ({
  page: Math.max(parseInt(query.page) || 1, 1),
  limit: Math.min(Math.max(parseInt(query.limit) || defaultLimit, 1), 50),
});

// @desc  Get all published posts (paginated)
// @route GET /api/blog
exports.getPublishedPosts = async (req, res) => {
  try {
    const { category, tag } = req.query;
    const { page, limit } = pageParams(req.query, 9);

    const query = { status: 'published' };
    if (typeof category === 'string') query.category = category;
    if (typeof tag === 'string') query.tags = tag;

    const [posts, total] = await Promise.all([
      Blog.find(query)
        .populate('author', 'fullName')
        .select('-content -contentImages')
        .sort('-publishedAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Blog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: { posts, total, totalPages: Math.ceil(total / limit), currentPage: page },
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
