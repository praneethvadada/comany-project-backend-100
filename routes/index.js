const express = require('express');
const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const publicRoutes = require('./public');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Authentication routes
router.use('/auth', authRoutes);

// Admin routes (protected)
router.use('/admin', adminRoutes);

// Public routes
router.use('/public', publicRoutes);

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

module.exports = router;