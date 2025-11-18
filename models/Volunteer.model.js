const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  preferredRole: {
    type: String,
    required: [true, 'Preferred role is required'],
    enum: [
      'School Gardens Assistant',
      'Agri-Club Facilitator',
      'Media & Comms',
      'Fundraising & Partnerships',
      'Program Coordinator',
      'Other'
    ]
  },
  aboutYourself: {
    type: String,
    required: [true, 'Tell us about yourself'],
    minlength: 50
  },
  skills: [{
    type: String
  }],
  availability: {
    type: String,
    enum: ['weekdays', 'weekends', 'both', 'flexible']
  },
  location: {
    state: String,
    lga: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'on-hold'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewNotes: {
    type: String
  },
  assignedPrograms: [{
    programName: String,
    role: String,
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['active', 'completed', 'paused']
    }
  }],
  hoursContributed: {
    type: Number,
    default: 0
  },
  certificatesIssued: [{
    title: String,
    issuedDate: Date,
    fileUrl: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Volunteer', volunteerSchema);