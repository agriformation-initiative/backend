const mongoose = require('mongoose');

const volunteerCallSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  requirements: {
    type: String,
    required: [true, 'Requirements are required']
  },
  designImage: {
    url: {
      type: String,
      required: [true, 'Design image is required']
    },
    publicId: {
      type: String,
      required: true
    }
  },
  eventDate: {
    type: Date,
    required: [true, 'Event date is required']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  numberOfVolunteers: {
    type: Number,
    required: [true, 'Number of volunteers needed is required'],
    min: 1
  },
  deadline: {
    type: Date,
    required: [true, 'Application deadline is required']
  },
  category: {
    type: String,
    enum: ['farm_work', 'event_support', 'community_outreach', 'training', 'workshop', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['draft', 'open', 'closed', 'cancelled'],
    default: 'draft'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  applications: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    fullName: String,
    email: String,
    phoneNumber: String,
    message: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
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

// Index for better query performance
volunteerCallSchema.index({ status: 1, isPublished: 1, deadline: 1 });
volunteerCallSchema.index({ eventDate: -1 });

// Virtual for applications count
volunteerCallSchema.virtual('applicationsCount').get(function() {
  return this.applications?.length || 0;
});

// Virtual for accepted applications count
volunteerCallSchema.virtual('acceptedCount').get(function() {
  return this.applications?.filter(app => app.status === 'accepted').length || 0;
});

module.exports = mongoose.model('VolunteerCall', volunteerCallSchema);