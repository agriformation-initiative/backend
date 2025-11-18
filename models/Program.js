const mongoose = require('mongoose');
const slugify = require('slugify');

const programSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Program title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Program description is required'],
    trim: true
  },
  type: {
    type: String,
    enum: [
      'school-gardens',
      'agri-clubs',
      'awareness-week',
      'teacher-training',
      'excursion',
      'workshop',
      'internship',
      'other'
    ],
    required: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  targetAudience: {
    type: String,
    enum: ['students', 'teachers', 'youth', 'community', 'mixed'],
    default: 'students'
  },
  expectedParticipants: {
    type: Number,
    min: 0
  },
  actualParticipants: {
    type: Number,
    min: 0,
    default: 0
  },
  location: {
    type: String,
    trim: true
  },
  schools: [{
    name: String,
    numberOfStudents: Number
  }],
  objectives: [{
    type: String,
    trim: true
  }],
  activities: [{
    name: String,
    description: String,
    date: Date
  }],
  status: {
    type: String,
    enum: ['planned', 'ongoing', 'completed', 'cancelled'],
    default: 'planned'
  },
  impact: {
    summary: String,
    studentsReached: Number,
    schoolsInvolved: Number,
    feedback: [String]
  },
  images: [{
    type: String // Paths to images
  }],
  documents: [{
    name: String,
    path: String,
    uploadedAt: Date
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create slug before saving
programSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now();
  }
  next();
});

// Validate end date is after start date
programSchema.pre('save', function(next) {
  if (this.endDate < this.startDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

module.exports = mongoose.model('Program', programSchema);