const mongoose = require('mongoose');

/** One collection for everything people send us: general messages, school requests and partner enquiries. */
const inquirySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['contact', 'school', 'partner'],
      required: true,
    },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 120 },
    email: { type: String, required: [true, 'Email is required'], lowercase: true, trim: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 40 },
    organization: { type: String, trim: true, maxlength: 160 },
    location: { type: String, trim: true, maxlength: 160 },
    studentCount: { type: String, trim: true, maxlength: 40 },
    subject: { type: String, trim: true, maxlength: 160 },
    message: { type: String, required: [true, 'Message is required'], trim: true, minlength: 10, maxlength: 4000 },
    status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' },
  },
  { timestamps: true }
);

inquirySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Inquiry', inquirySchema);
