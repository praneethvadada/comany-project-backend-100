// routes/public/index.js - CORRECTED VERSION FOR SLUG-BASED ROUTES
const express = require('express');
const { validate } = require('../../middleware/validation');
const Joi = require('joi');

// Define validation schemas specifically for public routes
const publicParamSchemas = {
  slug: Joi.object({
    slug: Joi.string().min(1).max(255).required()
  }),
  projectId: Joi.object({
    projectId: Joi.number().integer().positive().required()
  })
};

// Validation middleware for public routes
const validatePublicParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params);
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Parameter validation error',
        errors: errors
      });
    }
    next();
  };
};

// Contact form validation schema
const contactSchemas = {
  submit: Joi.object({
    fullName: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().pattern(/^[+]?[1-9]\d{1,14}$/).required(),
    collegeName: Joi.string().min(2).max(200).required(),
    branch: Joi.string().min(2).max(100).required(),
    city: Joi.string().min(2).max(100).required(),
    projectId: Joi.number().integer().positive().required(),
    domainInterest: Joi.string().max(200).optional()
  })
};

// Import public controllers (these should exist)
const {
  PublicDomainController, 
  PublicSubDomainController, 
  PublicProjectController, 
  ContactController 
} = require('../../controllers/publicController');

const router = express.Router();

// =============================================================================
// PUBLIC DOMAIN ROUTES (SLUG-BASED)
// =============================================================================

// Get all domains
router.get('/domains', 
  PublicDomainController.getAllDomains
);

// Get domain by slug (THIS IS THE ROUTE YOU NEED)
router.get('/domains/:slug',
  validatePublicParams(publicParamSchemas.slug),
  PublicDomainController.getDomainBySlug
);

// =============================================================================
// PUBLIC SUBDOMAIN ROUTES (SLUG-BASED)
// =============================================================================

// Get subdomain by slug
router.get('/subdomains/:slug',
  validatePublicParams(publicParamSchemas.slug),
  PublicSubDomainController.getSubDomainBySlug
);

// =============================================================================
// PUBLIC PROJECT ROUTES (SLUG-BASED)
// =============================================================================

// Get featured projects
router.get('/projects/featured',
  PublicProjectController.getFeaturedProjects
);

// Get project preview by slug
router.get('/projects/:slug',
  validatePublicParams(publicParamSchemas.slug),
  PublicProjectController.getProjectPreview
);

// =============================================================================
// CONTACT ROUTES
// =============================================================================

// Get contact form data for a project
router.get('/contact/project/:projectId',
  validatePublicParams(publicParamSchemas.projectId),
  ContactController.getContactFormData
);

// Submit contact form
router.post('/contact',
  validate(contactSchemas.submit),
  ContactController.submitContactForm
);

// =============================================================================
// HEALTH CHECK
// =============================================================================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Public API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      domains: 'GET /public/domains, GET /public/domains/:slug',
      subdomains: 'GET /public/subdomains/:slug',
      projects: 'GET /public/projects/featured, GET /public/projects/:slug',
      contact: 'GET /public/contact/project/:projectId, POST /public/contact'
    }
  });
});

module.exports = router;


// // routes/public/index.js - Simple Fix for Current Structure
// const express = require('express');
// const { validate } = require('../../middleware/validation');
// const { 
//   validateQuery, 
//   validateParams,
//   paramSchemas 
// } = require('../../utils/validation');

// // Import existing controllers
// let domainController, subDomainController, projectController, leadController;

// try {
//   domainController = require('../../controllers/domainController');
//   console.log('✅ Public: Domain controller loaded');
// } catch (error) {
//   console.error('❌ Public: Error loading domain controller:', error.message);
//   domainController = {};
// }

// try {
//   subDomainController = require('../../controllers/subDomainController');
//   console.log('✅ Public: SubDomain controller loaded');
// } catch (error) {
//   console.error('❌ Public: Error loading subdomain controller:', error.message);
//   subDomainController = {};
// }

// try {
//   projectController = require('../../controllers/projectController');
//   console.log('✅ Public: Project controller loaded');
// } catch (error) {
//   console.error('❌ Public: Error loading project controller:', error.message);
//   projectController = {};
// }

// try {
//   leadController = require('../../controllers/leadController');
//   console.log('✅ Public: Lead controller loaded');
// } catch (error) {
//   console.error('❌ Public: Error loading lead controller:', error.message);
//   leadController = {};
// }

// // Import new internship route handlers
// let internshipRoutes;
// try {
//   internshipRoutes = require('./internships');
//   console.log('✅ Public: Internship routes loaded');
// } catch (error) {
//   console.error('❌ Public: Error loading internship routes:', error.message);
//   // Create a dummy router if internship routes don't exist
//   internshipRoutes = express.Router();
//   internshipRoutes.get('*', (req, res) => {
//     res.status(503).json({
//       success: false,
//       message: 'Internship routes are not available yet'
//     });
//   });
// }

// const router = express.Router();

// // Helper function to safely call controller methods
// const safeRoute = (controller, method, description) => {
//   return (req, res, next) => {
//     if (controller && typeof controller[method] === 'function') {
//       controller[method](req, res, next);
//     } else {
//       console.error(`❌ Public ${description}: Controller method not available`);
//       res.status(500).json({
//         success: false,
//         message: `${description} is not available. Please check server configuration.`
//       });
//     }
//   };
// };

// // =============================================================================
// // EXISTING ROUTES (Phase 1 - Projects)
// // =============================================================================

// // Domain routes
// router.get('/domains',
//   safeRoute(domainController, 'getAllDomains', 'Get all domains')
// );

// router.get('/domains/:id',
//   validateParams(paramSchemas.id),
//   safeRoute(domainController, 'getDomainById', 'Get domain by ID')
// );

// // SubDomain routes  
// router.get('/domains/:domainId/subdomains',
//   validateParams(paramSchemas.domainId),
//   safeRoute(subDomainController, 'getSubDomainsByDomain', 'Get subdomains by domain')
// );

// router.get('/subdomains/:id',
//   validateParams(paramSchemas.id),
//   safeRoute(subDomainController, 'getSubDomainById', 'Get subdomain by ID')
// );

// // Project routes
// router.get('/projects',
//   safeRoute(projectController, 'getAllProjects', 'Get all projects')
// );

// router.get('/projects/featured',
//   safeRoute(projectController, 'getFeaturedProjects', 'Get featured projects')
// );

// router.get('/projects/:id',
//   validateParams(paramSchemas.id),
//   safeRoute(projectController, 'getProjectById', 'Get project by ID')
// );

// router.get('/subdomains/:subDomainId/projects',
//   validateParams(paramSchemas.subDomainId),
//   safeRoute(projectController, 'getProjectsBySubDomain', 'Get projects by subdomain')
// );

// // Lead routes (Contact form for projects) - Using your existing contactSchemas if available
// router.post('/projects/:projectId/contact',
//   validateParams(paramSchemas.projectId),
//   // Skip validation for now since contactSchemas might not exist
//   safeRoute(leadController, 'createLead', 'Create project lead')
// );

// // =============================================================================
// // NEW ROUTES (Phase 2 - Internships)
// // =============================================================================

// // Mount internship routes under /internships prefix
// router.use('/internships', internshipRoutes);

// // Alternative routes for compatibility - mount at root level too
// router.use('/', internshipRoutes);

// // =============================================================================
// // HEALTH CHECK ROUTE
// // =============================================================================
// router.get('/health', (req, res) => {
//   const controllerStatus = {
//     domain: {
//       loaded: !!domainController && Object.keys(domainController).length > 0,
//       methods: domainController ? Object.keys(domainController) : []
//     },
//     subDomain: {
//       loaded: !!subDomainController && Object.keys(subDomainController).length > 0,
//       methods: subDomainController ? Object.keys(subDomainController) : []
//     },
//     project: {
//       loaded: !!projectController && Object.keys(projectController).length > 0,
//       methods: projectController ? Object.keys(projectController) : []
//     },
//     lead: {
//       loaded: !!leadController && Object.keys(leadController).length > 0,
//       methods: leadController ? Object.keys(leadController) : []
//     }
//   };

//   res.json({
//     success: true,
//     message: 'Public API is running',
//     timestamp: new Date().toISOString(),
//     features: {
//       phase1: 'Projects System',
//       phase2: 'Internships System'
//     },
//     controllers: controllerStatus
//   });
// });

// console.log('✅ Public routes setup complete');

// module.exports = router;