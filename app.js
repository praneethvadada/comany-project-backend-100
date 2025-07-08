// app.js - Updated Main Application File with Internship System
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use('/uploads', express.static('uploads'));

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');

// Route middleware
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Project Showcase Backend API',
    version: '2.0.0',
    features: {
      phase1: 'Projects Management System',
      phase2: 'Internships Management System'
    },
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      public: '/api/public'
    },
    documentation: {
      phase1_projects: {
        admin: {
          domains: '/api/admin/domains',
          subdomains: '/api/admin/subdomains',
          projects: '/api/admin/projects',
          leads: '/api/admin/leads',
          images: '/api/admin/images'
        },
        public: {
          domains: '/api/public/domains',
          projects: '/api/public/projects',
          contact: '/api/public/projects/:id/contact'
        }
      },
      phase2_internships: {
        admin: {
          branches: '/api/admin/branches',
          internship_domains: '/api/admin/internship-domains',
          internships: '/api/admin/internships',
          internship_leads: '/api/admin/internship-leads',
          ratings: '/api/admin/ratings'
        },
        public: {
          branches: '/api/public/branches',
          internships: '/api/public/internships',
          enroll: '/api/public/internships/:id/enroll',
          ratings: '/api/public/internships/:id/ratings'
        }
      }
    }
  });
});

// API Documentation route
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'API Documentation',
    version: '2.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        signup: 'POST /api/auth/signup',
        logout: 'POST /api/auth/logout',
        profile: 'GET /api/auth/profile',
        change_password: 'POST /api/auth/change-password',
        forgot_password: 'POST /api/auth/forgot-password',
        reset_password: 'POST /api/auth/reset-password'
      },
      phase1_admin: {
        dashboard: 'GET /api/admin/dashboard/stats',
        domains: 'GET|POST|PUT|DELETE /api/admin/domains',
        subdomains: 'GET|POST|PUT|DELETE /api/admin/subdomains',
        projects: 'GET|POST|PUT|DELETE /api/admin/projects',
        leads: 'GET|PUT|DELETE /api/admin/leads',
        images: 'GET|POST|PUT|DELETE /api/admin/images'
      },
      phase1_public: {
        domains: 'GET /api/public/domains',
        projects: 'GET /api/public/projects',
        project_details: 'GET /api/public/projects/:id',
        contact_form: 'POST /api/public/projects/:id/contact'
      },
      phase2_admin: {
        branches: 'GET|POST|PUT|DELETE /api/admin/branches',
        internship_domains: 'GET|POST|PUT|DELETE /api/admin/internship-domains',
        internships: 'GET|POST|PUT|DELETE /api/admin/internships',
        internship_leads: 'GET|PUT|DELETE /api/admin/internship-leads',
        ratings: 'GET|PUT|DELETE /api/admin/ratings',
        stats: 'GET /api/admin/branches/stats, /api/admin/internship-leads/stats, /api/admin/ratings/stats',
        export: 'GET /api/admin/internship-leads/export/csv'
      },
      phase2_public: {
        branches: 'GET /api/public/branches',
        domains_by_branch: 'GET /api/public/branches/:id/domains',
        internships: 'GET /api/public/internships',
        featured_internships: 'GET /api/public/internships/featured',
        top_rated_internships: 'GET /api/public/internships/top-rated',
        search_internships: 'GET /api/public/internships/search',
        internship_details: 'GET /api/public/internships/:id',
        enroll: 'POST /api/public/internships/:id/enroll',
        internship_ratings: 'GET /api/public/internships/:id/ratings',
        submit_rating: 'POST /api/public/internships/:id/ratings'
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    available_endpoints: {
      documentation: 'GET /',
      api_docs: 'GET /api',
      health_check: 'GET /api/admin/health or /api/public/health'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  // Sequelize validation errors
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.errors.map(err => err.message)
    });
  }
  
  // Sequelize unique constraint errors
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry error',
      field: error.errors[0]?.path
    });
  }
  
  // Sequelize foreign key constraint errors
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference - related record not found'
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  // JWT expired errors
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Multer errors (file upload)
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large'
    });
  }
  
  // Default error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      error: error.message,
      stack: error.stack 
    })
  });
});

module.exports = app;











































































// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');
// const session = require('express-session');
// const path = require('path');

// const routes = require('./routes');
// const errorHandler = require('./middleware/errorHandler');

// const app = express();

// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: process.env.NODE_ENV === 'production' ? 100 : 1000,
//   message: 'Too many requests from this IP'
// });

// app.use(limiter);
// app.use(helmet());
// app.use(cors());
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// app.use(session({
//   secret: process.env.JWT_SECRET || 'your-session-secret',
//   resave: false,
//   saveUninitialized: false,
//   cookie: { 
//     secure: process.env.NODE_ENV === 'production',
//     maxAge: 24 * 60 * 60 * 1000
//   }
// }));

// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// app.use('/api', routes);

// app.use(errorHandler);

// module.exports = app;
