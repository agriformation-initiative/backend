const Inquiry = require('../models/Inquiry.model');
const emails = require('../utils/emails');

const str = (value) => (typeof value === 'string' ? value.trim() : '');
const EMAIL_RE = /^\S+@\S+\.\S+$/;

// @desc    Send a message, school request or partnership enquiry
// @route   POST /api/inquiries
// @access  Public
exports.createInquiry = async (req, res) => {
  try {
    const type = str(req.body.type);
    if (!['contact', 'school', 'partner'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Unknown enquiry type' });
    }

    // Honeypot: real visitors never fill this hidden field. Pretend success so bots move on.
    if (str(req.body.website)) {
      return res.status(201).json({ success: true, message: 'Thank you. We will be in touch.' });
    }

    const data = {
      type,
      name: str(req.body.name),
      email: str(req.body.email).toLowerCase(),
      phone: str(req.body.phone),
      organization: str(req.body.organization),
      location: str(req.body.location),
      studentCount: str(req.body.studentCount),
      subject: str(req.body.subject),
      message: str(req.body.message),
    };

    if (!data.name || !EMAIL_RE.test(data.email)) {
      return res.status(400).json({ success: false, message: 'Please provide your name and a valid email address' });
    }
    if (data.message.length < 10) {
      return res.status(400).json({ success: false, message: 'Please write a message of at least 10 characters' });
    }
    if (type !== 'contact' && !data.organization) {
      return res.status(400).json({ success: false, message: 'Please tell us the name of your school or organisation' });
    }

    const inquiry = await Inquiry.create(data);

    // Email is best effort and must not slow down or fail the request
    emails.inquiryReceived(inquiry);
    emails.acknowledge(inquiry.email, inquiry.name, { contact: 'message', school: 'school request', partner: 'partnership enquiry' }[type]);

    res.status(201).json({ success: true, message: 'Thank you. We will be in touch.' });
  } catch (error) {
    console.error('Error creating inquiry:', error);
    res.status(500).json({ success: false, message: 'We could not send your message. Please try again.' });
  }
};

// @desc    List enquiries
// @route   GET /api/admin/inquiries
// @access  Private (Admin, Superadmin)
exports.getInquiries = async (req, res) => {
  try {
    const query = {};
    if (['contact', 'school', 'partner'].includes(req.query.type)) query.type = req.query.type;
    if (['new', 'contacted', 'closed'].includes(req.query.status)) query.status = req.query.status;

    const inquiries = await Inquiry.find(query).sort('-createdAt').limit(200).lean();
    res.json({ success: true, data: { inquiries } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load enquiries' });
  }
};

// @desc    Update enquiry status
// @route   PUT /api/admin/inquiries/:id/status
// @access  Private (Admin, Superadmin)
exports.updateInquiryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'contacted', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!inquiry) return res.status(404).json({ success: false, message: 'Enquiry not found' });
    res.json({ success: true, data: { inquiry } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update enquiry' });
  }
};
