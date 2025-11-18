const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Gallery title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Gallery description is required'],
    trim: true
  },
  coverImage: {
    url: String,
    publicId: String // For Cloudinary or similar services
  },
  eventDate: {
    type: Date,
    required: [true, 'Event date is required']
  },
  location: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['farm_excursion', 'workshop', 'community_event', 'training', 'school-garden', 'other'],
    default: 'farm_excursion'
  },
  photos: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      trim: true
    },
    order: {
      type: Number,
      default: 0
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster queries
gallerySchema.index({ isPublished: 1, eventDate: -1 });
gallerySchema.index({ category: 1, isPublished: 1 });

// Virtual for photo count
gallerySchema.virtual('photoCount').get(function() {
  return this.photos.length;
});

// Ensure virtuals are included in JSON
gallerySchema.set('toJSON', { virtuals: true });
gallerySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Gallery', gallerySchema);