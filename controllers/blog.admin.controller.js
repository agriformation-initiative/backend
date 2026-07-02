const Blog = require('../models/Blog.model');
const Gallery = require('../models/Gallery.model');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const { Readable } = require('stream');

// ── Multer ──────────────────────────────────────────────────────────────────
const storage = multer.memoryStorage();
exports.upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG and WebP images are allowed.'), false);
  },
});

// ── Cloudinary helper ────────────────────────────────────────────────────────
const uploadToCloudinary = (buffer, folder = 'agriformation-blog') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }] },
      (error, result) => { if (error) reject(error); else resolve(result); }
    );
    Readable.from(buffer).pipe(stream);
  });
};

// Creates a Gallery document that mirrors a blog post's images
const syncGallery = async (post, userId, existingGalleryId = null) => {
  const galleryData = {
    title: post.title,
    description: post.excerpt,
    eventDate: post.publishedAt || post.createdAt || new Date(),
    category: 'blog_post',
    coverImage: post.coverImage,
    isPublished: post.status === 'published',
    source: 'blog',
    blogPost: post._id,
    lastUpdatedBy: userId,
  };

  if (existingGalleryId) {
    return Gallery.findByIdAndUpdate(existingGalleryId, galleryData, { new: true });
  }

  return Gallery.create({ ...galleryData, photos: [], createdBy: userId });
};

// ── Create post ──────────────────────────────────────────────────────────────
exports.createPost = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Cover image is required' });

    const { title, excerpt, category, tags } = req.body;

    const uploaded = await uploadToCloudinary(req.file.buffer);

    const post = await Blog.create({
      title,
      excerpt,
      category: category || 'other',
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      coverImage: { url: uploaded.secure_url, publicId: uploaded.public_id },
      author: req.user._id || req.user.id,
      status: 'draft',
    });

    // Auto-create linked gallery
    const gallery = await syncGallery(post, req.user._id || req.user.id);
    post.gallery = gallery._id;
    await post.save();

    res.status(201).json({ success: true, data: { post } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── List posts ───────────────────────────────────────────────────────────────
exports.getPosts = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 12 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const posts = await Blog.find(query)
      .populate('author', 'fullName')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Blog.countDocuments(query);

    res.json({
      success: true,
      data: { posts, total, totalPages: Math.ceil(total / limit), currentPage: Number(page) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get single post ──────────────────────────────────────────────────────────
exports.getPost = async (req, res) => {
  try {
    const post = await Blog.findById(req.params.id)
      .populate('author', 'fullName email')
      .populate('gallery', 'title isPublished photos');

    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    res.json({ success: true, data: { post } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Update post metadata ─────────────────────────────────────────────────────
exports.updatePost = async (req, res) => {
  try {
    const { title, excerpt, content, category, tags } = req.body;

    const post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    if (title !== undefined) post.title = title;
    if (excerpt !== undefined) post.excerpt = excerpt;
    if (content !== undefined) post.content = content;
    if (category !== undefined) post.category = category;
    if (tags !== undefined) post.tags = tags.split(',').map((t) => t.trim()).filter(Boolean);

    await post.save();

    // Keep gallery title/description in sync
    if (post.gallery && (title !== undefined || excerpt !== undefined)) {
      await syncGallery(post, req.user._id || req.user.id, post.gallery);
    }

    res.json({ success: true, data: { post } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Upload content image ─────────────────────────────────────────────────────
// Returns { url, imageId } so the frontend can insert <img src="url"> into content
exports.uploadContentImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Image file is required' });

    const post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const uploaded = await uploadToCloudinary(req.file.buffer);
    const caption = req.body.caption || '';

    const imageEntry = { url: uploaded.secure_url, publicId: uploaded.public_id, caption };
    post.contentImages.push(imageEntry);
    await post.save();

    const savedImage = post.contentImages[post.contentImages.length - 1];

    // Add to linked gallery as a photo
    if (post.gallery) {
      await Gallery.findByIdAndUpdate(post.gallery, {
        $push: {
          photos: {
            url: uploaded.secure_url,
            publicId: uploaded.public_id,
            caption,
            order: 0,
          },
        },
      });
    }

    res.json({ success: true, data: { url: uploaded.secure_url, imageId: savedImage._id } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Delete content image ─────────────────────────────────────────────────────
exports.deleteContentImage = async (req, res) => {
  try {
    const post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const image = post.contentImages.id(req.params.imageId);
    if (!image) return res.status(404).json({ success: false, message: 'Image not found' });

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(image.publicId);

    // Remove from gallery photos
    if (post.gallery) {
      await Gallery.findByIdAndUpdate(post.gallery, {
        $pull: { photos: { publicId: image.publicId } },
      });
    }

    post.contentImages.pull(req.params.imageId);
    await post.save();

    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Toggle publish ───────────────────────────────────────────────────────────
exports.togglePublish = async (req, res) => {
  try {
    const post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    post.status = post.status === 'published' ? 'draft' : 'published';
    if (post.status === 'published' && !post.publishedAt) {
      post.publishedAt = new Date();
    }
    await post.save();

    // Sync gallery publish state
    if (post.gallery) {
      await Gallery.findByIdAndUpdate(post.gallery, {
        isPublished: post.status === 'published',
        eventDate: post.publishedAt || new Date(),
      });
    }

    res.json({ success: true, data: { post } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Delete post ──────────────────────────────────────────────────────────────
exports.deletePost = async (req, res) => {
  try {
    const post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    // Delete cover image from Cloudinary
    if (post.coverImage?.publicId) {
      await cloudinary.uploader.destroy(post.coverImage.publicId).catch(() => {});
    }

    // Delete content images from Cloudinary
    for (const img of post.contentImages) {
      if (img.publicId) await cloudinary.uploader.destroy(img.publicId).catch(() => {});
    }

    // Delete linked gallery (its photos were already added alongside the blog images)
    if (post.gallery) {
      const gallery = await Gallery.findById(post.gallery);
      if (gallery) {
        for (const photo of gallery.photos) {
          await cloudinary.uploader.destroy(photo.publicId).catch(() => {});
        }
        await gallery.deleteOne();
      }
    }

    await post.deleteOne();

    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
