const express = require('express');
const authRoutes = require('./auth');

const router = express.Router();

router.use('/auth', authRoutes);

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
