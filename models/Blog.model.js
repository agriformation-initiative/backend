const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
  },
  excerpt: {
    type: String,
    required: [true, 'Excerpt is required'],
    trim: true,
    maxlength: [500, 'Excerpt cannot exceed 500 characters'],
  },
  content: {
    type: String,
    default: '',
  },
  coverImage: {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  contentImages: [{
    url: String,
    publicId: String,
    caption: String,
  }],
  category: {
    type: String,
    enum: ['news', 'education', 'agriculture', 'events', 'community', 'other'],
    default: 'other',
  },
  tags: [{ type: String, trim: true }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
  },
  publishedAt: Date,
  readTime: { type: Number, default: 1 },
  viewCount: { type: Number, default: 0 },
  gallery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gallery',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ slug: 1 });
blogSchema.index({ category: 1, status: 1 });

blogSchema.pre('save', async function (next) {
  // Auto-generate slug from title on first save
  if (this.isNew && !this.slug) {
    const base = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    let slug = base;
    let i = 1;
    while (await mongoose.model('Blog').findOne({ slug })) {
      slug = `${base}-${i++}`;
    }
    this.slug = slug;
  }

  // Recalculate read time when content changes (~200 words/min)
  if (this.isModified('content') && this.content) {
    const wordCount = this.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    this.readTime = Math.max(1, Math.ceil(wordCount / 200));
  }

  next();
});

module.exports = mongoose.model('Blog', blogSchema);
