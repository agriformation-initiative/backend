const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const volunteerRoutes = require('./routes/volunteer.routes');
const adminRoutes = require('./routes/admin.routes');
const galleryRoutes = require('./routes/gallery.routes');
const adminVolunteerCallRoutes = require('./routes/admin/volunteerCall.routes');
const publicVolunteerCallRoutes = require('./routes/public/volunteerCall.public.routes');
const adminBlogRoutes = require('./routes/admin/blog.routes');
const publicBlogRoutes = require('./routes/public/blog.public.routes');
const inquiryRoutes = require('./routes/inquiry.routes');
const settingsRoutes = require('./routes/settings.routes');

const app = express();

// Middleware
app.use(helmet());
// CORS_ORIGINS is a comma-separated allow-list. Unset means any origin, which suits local development.
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : '*';
app.use(cors({
  origin: allowedOrigins,
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Throttle credential guessing and public form spam
const limiter = (max, windowMinutes) => rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please wait a few minutes and try again.' }
});
app.use('/api/auth/login', limiter(10, 15));
app.use('/api/auth/register', limiter(10, 60));
app.use('/api/volunteers/apply', limiter(10, 60));
app.use('/api/volunteer-calls/:id/apply', limiter(20, 60));
app.use('/api/auth/forgot-password', limiter(5, 60));
app.use('/api/auth/reset-password', limiter(10, 60));
app.use('/api/inquiries', limiter(10, 60));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/galleries', galleryRoutes);
app.use('/api/admin/volunteer-calls', adminVolunteerCallRoutes);
app.use('/api/volunteer-calls', publicVolunteerCallRoutes);
app.use('/api/admin/blog', adminBlogRoutes);
app.use('/api/blog', publicBlogRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'AgroNext API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});