const mongoose = require('mongoose');

const volunteerApplicationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
  },
  preferredRole: {
    type: String,
    required: [true, 'Preferred role is required']
  },
  aboutYourself: {
    type: String,
    required: [true, 'Please tell us about yourself'],
    minlength: 50
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'accepted', 'rejected'],
    default: 'pending'
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: {
    type: Date
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('VolunteerApplication', volunteerApplicationSchema);
