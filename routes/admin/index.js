// routes/admin/index.js - CORRECTED VERSION WITH INTERNSHIP ROUTES
const express = require('express');
const { authenticate, adminOnly } = require('../../middleware/auth');

const { validate } = require('../../middleware/validation');
const { 
  validateQuery, 
  validateParams,
  domainSchemas, 
  subDomainSchemas, 
  projectSchemas,
  leadSchemas,
  imageSchemas,
  querySchemas,
  paramSchemas 
} = require('../../utils/validation');

// Import controllers with error handling
let domainController, subDomainController, projectController, leadController, imageController, dashboardController;

try {
  domainController = require('../../controllers/domainController');
  console.log('✅ Domain controller loaded');
} catch (error) {
  console.error('❌ Error loading domain controller:', error.message);
  domainController = {};
}

try {
  subDomainController = require('../../controllers/subDomainController');
  console.log('✅ SubDomain controller loaded');
} catch (error) {
  console.error('❌ Error loading subdomain controller:', error.message);
  subDomainController = {};
}

try {
  projectController = require('../../controllers/projectController');
  console.log('✅ Project controller loaded');
} catch (error) {
  console.error('❌ Error loading project controller:', error.message);
  projectController = {};
}

try {
  leadController = require('../../controllers/leadController');
  console.log('✅ Lead controller loaded');
} catch (error) {
  console.error('❌ Error loading lead controller:', error.message);
  leadController = {};
}

try {
  imageController = require('../../controllers/imageController');
  console.log('✅ Image controller loaded');
} catch (error) {
  console.error('❌ Error loading image controller:', error.message);
  imageController = {};
}

try {
  dashboardController = require('../../controllers/dashboardController');
  console.log('✅ Dashboard controller loaded');
} catch (error) {
  console.error('❌ Error loading dashboard controller:', error.message);
  dashboardController = {};
}

// *** CRITICAL ADDITION: Import internship routes ***
const internshipRoutes = require('./internships');
console.log('✅ Internship routes imported');

const router = express.Router();

// Apply authentication and admin middleware to all admin routes
router.use(authenticate);
router.use(adminOnly);

// *** CRITICAL ADDITION: Mount internship routes ***
router.use('/', internshipRoutes);
console.log('✅ Internship routes mounted');

// Helper function to safely use controller methods
const safeRoute = (controller, methodName, fallbackMessage = 'Method not implemented') => {
  if (controller && typeof controller[methodName] === 'function') {
    console.log(`✅ Route method found: ${methodName}`);
    return controller[methodName];
  } else {
    console.log(`⚠️ Route method missing: ${methodName}`);
    return (req, res) => {
      res.status(501).json({
        success: false,
        message: `${fallbackMessage}: ${methodName}`,
        error: 'Controller method not implemented'
      });
    };
  }
};

// =============================================================================
// DASHBOARD ROUTES
// =============================================================================
router.get('/dashboard/stats', safeRoute(dashboardController, 'getDashboardStats', 'Dashboard stats'));
router.get('/dashboard/recent-activity', safeRoute(dashboardController, 'getRecentActivity', 'Recent activity'));
router.get('/dashboard/analytics', safeRoute(dashboardController, 'getAnalytics', 'Dashboard analytics'));
router.get('/dashboard/domain/:domainId/analytics',
  validateParams(paramSchemas.domainId),
  safeRoute(dashboardController, 'getDomainAnalytics', 'Domain analytics')
);

// =============================================================================
// DOMAIN ROUTES - ENABLED (these were commented out before)
// =============================================================================
router.get('/domains', 
  validateQuery(querySchemas.domainFilter),
  safeRoute(domainController, 'getAllDomains', 'Get all domains')
);

router.get('/domains/:id', 
  validateParams(paramSchemas.id),
  safeRoute(domainController, 'getDomainById', 'Get domain by ID')
);

router.get('/domains/:id/hierarchy',
  validateParams(paramSchemas.id),
  safeRoute(domainController, 'getDomainHierarchy', 'Get domain hierarchy')
);

router.get('/domains/:id/stats',
  validateParams(paramSchemas.id),
  safeRoute(domainController, 'getDomainStats', 'Get domain stats')
);

router.post('/domains',
  validate(domainSchemas.create),
  safeRoute(domainController, 'createDomain', 'Create domain')
);

router.put('/domains/:id',
  validateParams(paramSchemas.id),
  validate(domainSchemas.update),
  safeRoute(domainController, 'updateDomain', 'Update domain')
);

router.delete('/domains/:id',
  validateParams(paramSchemas.id),
  safeRoute(domainController, 'deleteDomain', 'Delete domain')
);

// =============================================================================
// SUBDOMAIN ROUTES - ENABLED (these were commented out before)
// =============================================================================
router.get('/subdomains',
  validateQuery(querySchemas.subDomainFilter),
  safeRoute(subDomainController, 'getAllSubDomains', 'Get all subdomains')
);

router.get('/subdomains/leafs',
  safeRoute(subDomainController, 'getLeafSubDomains', 'Get leaf subdomains')
);

router.get('/subdomains/:id',
  validateParams(paramSchemas.id),
  safeRoute(subDomainController, 'getSubDomainById', 'Get subdomain by ID')
);

router.get('/domains/:domainId/subdomains',
  validateParams(paramSchemas.domainId),
  safeRoute(subDomainController, 'getSubDomainsByDomain', 'Get subdomains by domain')
);

router.post('/subdomains',
  validate(subDomainSchemas.create),
  safeRoute(subDomainController, 'createSubDomain', 'Create subdomain')
);

router.put('/subdomains/:id',
  validateParams(paramSchemas.id),
  validate(subDomainSchemas.update),
  safeRoute(subDomainController, 'updateSubDomain', 'Update subdomain')
);

router.delete('/subdomains/:id',
  validateParams(paramSchemas.id),
  safeRoute(subDomainController, 'deleteSubDomain', 'Delete subdomain')
);

// =============================================================================
// PROJECT ROUTES
// =============================================================================
router.get('/projects',
  validateQuery(querySchemas.projectFilter),
  safeRoute(projectController, 'getAllProjects', 'Get all projects')
);

router.get('/projects/:id',
  validateParams(paramSchemas.id),
  safeRoute(projectController, 'getProjectById', 'Get project by ID')
);

router.get('/projects/:id/stats',
  validateParams(paramSchemas.id),
  safeRoute(projectController, 'getProjectStats', 'Get project stats')
);

router.get('/subdomains/:subDomainId/projects',
  validateParams(paramSchemas.subDomainId),
  safeRoute(projectController, 'getProjectsBySubDomain', 'Get projects by subdomain')
);

router.post('/projects',
  validate(projectSchemas.create),
  safeRoute(projectController, 'createProject', 'Create project')
);

router.put('/projects/:id',
  validateParams(paramSchemas.id),
  validate(projectSchemas.update),
  safeRoute(projectController, 'updateProject', 'Update project')
);

router.put('/projects/:id/move',
  validateParams(paramSchemas.id),
  validate(projectSchemas.move),
  safeRoute(projectController, 'moveProject', 'Move project')
);

router.put('/projects/:id/archive',
  validateParams(paramSchemas.id),
  validate(projectSchemas.archive),
  safeRoute(projectController, 'archiveProject', 'Archive project')
);

router.put('/projects/bulk-update',
  validate(projectSchemas.bulkUpdate),
  safeRoute(projectController, 'bulkUpdateProjects', 'Bulk update projects')
);

router.delete('/projects/:id',
  validateParams(paramSchemas.id),
  safeRoute(projectController, 'deleteProject', 'Delete project')
);

// =============================================================================
// LEAD ROUTES
// =============================================================================
router.get('/leads',
  validateQuery(querySchemas.leadFilter),
  safeRoute(leadController, 'getAllLeads', 'Get all leads')
);

router.get('/leads/:id',
  validateParams(paramSchemas.id),
  safeRoute(leadController, 'getLeadById', 'Get lead by ID')
);

router.get('/leads/export/csv',
  validateQuery(querySchemas.leadFilter),
  safeRoute(leadController, 'exportLeadsCSV', 'Export leads CSV')
);

router.get('/leads/stats',
  safeRoute(leadController, 'getLeadStats', 'Get lead stats')
);

router.get('/projects/:projectId/leads',
  validateParams(paramSchemas.projectId),
  safeRoute(leadController, 'getLeadsByProject', 'Get leads by project')
);

router.put('/leads/:id',
  validateParams(paramSchemas.id),
  validate(leadSchemas.update),
  safeRoute(leadController, 'updateLead', 'Update lead')
);

router.put('/leads/bulk-update',
  validate(leadSchemas.bulkUpdate),
  safeRoute(leadController, 'bulkUpdateLeads', 'Bulk update leads')
);

router.delete('/leads/:id',
  validateParams(paramSchemas.id),
  safeRoute(leadController, 'deleteLead', 'Delete lead')
);

// =============================================================================
// IMAGE ROUTES
// =============================================================================
router.get('/images',
  safeRoute(imageController, 'getAllImages', 'Get all images')
);

router.get('/images/:id',
  validateParams(paramSchemas.id),
  safeRoute(imageController, 'getImageById', 'Get image by ID')
);

router.get('/images/stats',
  safeRoute(imageController, 'getImageStats', 'Get image stats')
);

router.get('/images/entity/:entityType/:entityId',
  safeRoute(imageController, 'getImagesByEntity', 'Get images by entity')
);

router.post('/images/upload',
  safeRoute(imageController, 'uploadImages', 'Upload images')
);

router.put('/images/:id',
  validateParams(paramSchemas.id),
  validate(imageSchemas.update),
  safeRoute(imageController, 'updateImage', 'Update image')
);

router.put('/images/reorder',
  validate(imageSchemas.reorder),
  safeRoute(imageController, 'reorderImages', 'Reorder images')
);

router.delete('/images/:id',
  validateParams(paramSchemas.id),
  safeRoute(imageController, 'deleteImage', 'Delete image')
);

router.delete('/images/bulk-delete',
  safeRoute(imageController, 'bulkDeleteImages', 'Bulk delete images')
);

// =============================================================================
// DEBUG/HEALTH ROUTES
// =============================================================================
router.get('/health', (req, res) => {
  const controllerStatus = {
    dashboard: {
      loaded: !!dashboardController,
      methods: dashboardController ? Object.keys(dashboardController) : []
    },
    domain: {
      loaded: !!domainController,
      methods: domainController ? Object.keys(domainController) : []
    },
    subDomain: {
      loaded: !!subDomainController,
      methods: subDomainController ? Object.keys(subDomainController) : []
    },
    project: {
      loaded: !!projectController,
      methods: projectController ? Object.keys(projectController) : []
    },
    lead: {
      loaded: !!leadController,
      methods: leadController ? Object.keys(leadController) : []
    },
    image: {
      loaded: !!imageController,
      methods: imageController ? Object.keys(imageController) : []
    }
  };

  res.json({
    success: true,
    message: 'Admin API is running with ALL FEATURES',
    timestamp: new Date().toISOString(),
    features: {
      phase1: 'Projects System (ENABLED)',
      phase2: 'Internships System (ENABLED)'
    },
    available_routes: {
      // Phase 1 Routes
      domains: 'GET|POST|PUT|DELETE /api/admin/domains',
      subdomains: 'GET|POST|PUT|DELETE /api/admin/subdomains', 
      projects: 'GET|POST|PUT|DELETE /api/admin/projects',
      leads: 'GET|PUT|DELETE /api/admin/leads',
      images: 'GET|POST|PUT|DELETE /api/admin/images',
      // Phase 2 Routes (from internships.js)
      branches: 'GET|POST|PUT|DELETE /api/admin/branches',
      internship_domains: 'GET|PUT|DELETE /api/admin/internship-domains',
      internships: 'GET|POST|PUT|DELETE /api/admin/internships',
      internship_leads: 'GET|PUT|DELETE /api/admin/internship-leads',
      ratings: 'GET|PUT|DELETE /api/admin/ratings'
    },
    controllers: controllerStatus
  });
});

console.log('✅ Admin routes setup complete with ALL ROUTES ENABLED (Phase 1 + Phase 2)');

module.exports = router;


// // routes/admin/index.js - FIXED VERSION WITH DOMAIN ROUTES ENABLED
// const express = require('express');
// const { authenticate, adminOnly } = require('../../middleware/auth');
// const internshipRoutes = require('./internships');
// // router.use('/', internshipRoutes);

// const { validate } = require('../../middleware/validation');
// const { 
//   validateQuery, 
//   validateParams,
//   domainSchemas, 
//   subDomainSchemas, 
//   projectSchemas,
//   leadSchemas,
//   imageSchemas,
//   querySchemas,
//   paramSchemas 
// } = require('../../utils/validation');

// // Import controllers with error handling
// let domainController, subDomainController, projectController, leadController, imageController, dashboardController;

// try {
//   domainController = require('../../controllers/domainController');
//   console.log('✅ Domain controller loaded');
// } catch (error) {
//   console.error('❌ Error loading domain controller:', error.message);
//   domainController = {};
// }

// try {
//   subDomainController = require('../../controllers/subDomainController');
//   console.log('✅ SubDomain controller loaded');
// } catch (error) {
//   console.error('❌ Error loading subdomain controller:', error.message);
//   subDomainController = {};
// }

// try {
//   projectController = require('../../controllers/projectController');
//   console.log('✅ Project controller loaded');
// } catch (error) {
//   console.error('❌ Error loading project controller:', error.message);
//   projectController = {};
// }

// try {
//   leadController = require('../../controllers/leadController');
//   console.log('✅ Lead controller loaded');
// } catch (error) {
//   console.error('❌ Error loading lead controller:', error.message);
//   leadController = {};
// }

// try {
//   imageController = require('../../controllers/imageController');
//   console.log('✅ Image controller loaded');
// } catch (error) {
//   console.error('❌ Error loading image controller:', error.message);
//   imageController = {};
// }

// try {
//   dashboardController = require('../../controllers/dashboardController');
//   console.log('✅ Dashboard controller loaded');
// } catch (error) {
//   console.error('❌ Error loading dashboard controller:', error.message);
//   dashboardController = {};
// }

// const router = express.Router();

// // Apply authentication and admin middleware to all admin routes
// router.use(authenticate);
// router.use(adminOnly);

// // Helper function to safely use controller methods
// const safeRoute = (controller, methodName, fallbackMessage = 'Method not implemented') => {
//   if (controller && typeof controller[methodName] === 'function') {
//     console.log(`✅ Route method found: ${methodName}`);
//     return controller[methodName];
//   } else {
//     console.log(`⚠️ Route method missing: ${methodName}`);
//     return (req, res) => {
//       res.status(501).json({
//         success: false,
//         message: `${fallbackMessage}: ${methodName}`,
//         error: 'Controller method not implemented'
//       });
//     };
//   }
// };

// // =============================================================================
// // DASHBOARD ROUTES
// // =============================================================================
// router.get('/dashboard/stats', safeRoute(dashboardController, 'getDashboardStats', 'Dashboard stats'));
// router.get('/dashboard/recent-activity', safeRoute(dashboardController, 'getRecentActivity', 'Recent activity'));
// router.get('/dashboard/analytics', safeRoute(dashboardController, 'getAnalytics', 'Dashboard analytics'));
// router.get('/dashboard/domain/:domainId/analytics',
//   validateParams(paramSchemas.domainId),
//   safeRoute(dashboardController, 'getDomainAnalytics', 'Domain analytics')
// );

// // =============================================================================
// // DOMAIN ROUTES - ENABLED (these were commented out before)
// // =============================================================================
// router.get('/domains', 
//   validateQuery(querySchemas.domainFilter),
//   safeRoute(domainController, 'getAllDomains', 'Get all domains')
// );

// router.get('/domains/:id', 
//   validateParams(paramSchemas.id),
//   safeRoute(domainController, 'getDomainById', 'Get domain by ID')
// );

// router.get('/domains/:id/hierarchy',
//   validateParams(paramSchemas.id),
//   safeRoute(domainController, 'getDomainHierarchy', 'Get domain hierarchy')
// );

// router.get('/domains/:id/stats',
//   validateParams(paramSchemas.id),
//   safeRoute(domainController, 'getDomainStats', 'Get domain stats')
// );

// router.post('/domains',
//   validate(domainSchemas.create),
//   safeRoute(domainController, 'createDomain', 'Create domain')
// );

// router.put('/domains/:id',
//   validateParams(paramSchemas.id),
//   validate(domainSchemas.update),
//   safeRoute(domainController, 'updateDomain', 'Update domain')
// );

// router.delete('/domains/:id',
//   validateParams(paramSchemas.id),
//   safeRoute(domainController, 'deleteDomain', 'Delete domain')
// );

// // =============================================================================
// // SUBDOMAIN ROUTES - ENABLED (these were commented out before)
// // =============================================================================
// router.get('/subdomains',
//   validateQuery(querySchemas.subDomainFilter),
//   safeRoute(subDomainController, 'getAllSubDomains', 'Get all subdomains')
// );

// router.get('/subdomains/leafs',
//   safeRoute(subDomainController, 'getLeafSubDomains', 'Get leaf subdomains')
// );

// router.get('/subdomains/:id',
//   validateParams(paramSchemas.id),
//   safeRoute(subDomainController, 'getSubDomainById', 'Get subdomain by ID')
// );

// router.get('/domains/:domainId/subdomains',
//   validateParams(paramSchemas.domainId),
//   safeRoute(subDomainController, 'getSubDomainsByDomain', 'Get subdomains by domain')
// );

// router.post('/subdomains',
//   validate(subDomainSchemas.create),
//   safeRoute(subDomainController, 'createSubDomain', 'Create subdomain')
// );

// router.put('/subdomains/:id',
//   validateParams(paramSchemas.id),
//   validate(subDomainSchemas.update),
//   safeRoute(subDomainController, 'updateSubDomain', 'Update subdomain')
// );

// router.delete('/subdomains/:id',
//   validateParams(paramSchemas.id),
//   safeRoute(subDomainController, 'deleteSubDomain', 'Delete subdomain')
// );

// // =============================================================================
// // PROJECT ROUTES
// // =============================================================================
// router.get('/projects',
//   validateQuery(querySchemas.projectFilter),
//   safeRoute(projectController, 'getAllProjects', 'Get all projects')
// );

// router.get('/projects/:id',
//   validateParams(paramSchemas.id),
//   safeRoute(projectController, 'getProjectById', 'Get project by ID')
// );

// router.get('/projects/:id/stats',
//   validateParams(paramSchemas.id),
//   safeRoute(projectController, 'getProjectStats', 'Get project stats')
// );

// router.get('/subdomains/:subDomainId/projects',
//   validateParams(paramSchemas.subDomainId),
//   safeRoute(projectController, 'getProjectsBySubDomain', 'Get projects by subdomain')
// );

// router.post('/projects',
//   validate(projectSchemas.create),
//   safeRoute(projectController, 'createProject', 'Create project')
// );

// router.put('/projects/:id',
//   validateParams(paramSchemas.id),
//   validate(projectSchemas.update),
//   safeRoute(projectController, 'updateProject', 'Update project')
// );

// router.put('/projects/:id/move',
//   validateParams(paramSchemas.id),
//   validate(projectSchemas.move),
//   safeRoute(projectController, 'moveProject', 'Move project')
// );

// router.put('/projects/:id/archive',
//   validateParams(paramSchemas.id),
//   validate(projectSchemas.archive),
//   safeRoute(projectController, 'archiveProject', 'Archive project')
// );

// router.put('/projects/bulk-update',
//   validate(projectSchemas.bulkUpdate),
//   safeRoute(projectController, 'bulkUpdateProjects', 'Bulk update projects')
// );

// router.delete('/projects/:id',
//   validateParams(paramSchemas.id),
//   safeRoute(projectController, 'deleteProject', 'Delete project')
// );

// // =============================================================================
// // LEAD ROUTES
// // =============================================================================
// router.get('/leads',
//   validateQuery(querySchemas.leadFilter),
//   safeRoute(leadController, 'getAllLeads', 'Get all leads')
// );

// router.get('/leads/:id',
//   validateParams(paramSchemas.id),
//   safeRoute(leadController, 'getLeadById', 'Get lead by ID')
// );

// router.get('/leads/export/csv',
//   validateQuery(querySchemas.leadFilter),
//   safeRoute(leadController, 'exportLeadsCSV', 'Export leads CSV')
// );

// router.get('/leads/stats',
//   safeRoute(leadController, 'getLeadStats', 'Get lead stats')
// );

// router.get('/projects/:projectId/leads',
//   validateParams(paramSchemas.projectId),
//   safeRoute(leadController, 'getLeadsByProject', 'Get leads by project')
// );

// router.put('/leads/:id',
//   validateParams(paramSchemas.id),
//   validate(leadSchemas.update),
//   safeRoute(leadController, 'updateLead', 'Update lead')
// );

// router.put('/leads/bulk-update',
//   validate(leadSchemas.bulkUpdate),
//   safeRoute(leadController, 'bulkUpdateLeads', 'Bulk update leads')
// );

// router.delete('/leads/:id',
//   validateParams(paramSchemas.id),
//   safeRoute(leadController, 'deleteLead', 'Delete lead')
// );

// // =============================================================================
// // IMAGE ROUTES
// // =============================================================================
// router.get('/images',
//   safeRoute(imageController, 'getAllImages', 'Get all images')
// );

// router.get('/images/:id',
//   validateParams(paramSchemas.id),
//   safeRoute(imageController, 'getImageById', 'Get image by ID')
// );

// router.get('/images/stats',
//   safeRoute(imageController, 'getImageStats', 'Get image stats')
// );

// router.get('/images/entity/:entityType/:entityId',
//   safeRoute(imageController, 'getImagesByEntity', 'Get images by entity')
// );

// router.post('/images/upload',
//   safeRoute(imageController, 'uploadImages', 'Upload images')
// );

// router.put('/images/:id',
//   validateParams(paramSchemas.id),
//   validate(imageSchemas.update),
//   safeRoute(imageController, 'updateImage', 'Update image')
// );

// router.put('/images/reorder',
//   validate(imageSchemas.reorder),
//   safeRoute(imageController, 'reorderImages', 'Reorder images')
// );

// router.delete('/images/:id',
//   validateParams(paramSchemas.id),
//   safeRoute(imageController, 'deleteImage', 'Delete image')
// );

// router.delete('/images/bulk-delete',
//   safeRoute(imageController, 'bulkDeleteImages', 'Bulk delete images')
// );

// // =============================================================================
// // DEBUG/HEALTH ROUTES
// // =============================================================================
// router.get('/health', (req, res) => {
//   const controllerStatus = {
//     dashboard: {
//       loaded: !!dashboardController,
//       methods: dashboardController ? Object.keys(dashboardController) : []
//     },
//     domain: {
//       loaded: !!domainController,
//       methods: domainController ? Object.keys(domainController) : []
//     },
//     subDomain: {
//       loaded: !!subDomainController,
//       methods: subDomainController ? Object.keys(subDomainController) : []
//     },
//     project: {
//       loaded: !!projectController,
//       methods: projectController ? Object.keys(projectController) : []
//     },
//     lead: {
//       loaded: !!leadController,
//       methods: leadController ? Object.keys(leadController) : []
//     },
//     image: {
//       loaded: !!imageController,
//       methods: imageController ? Object.keys(imageController) : []
//     }
//   };

//   res.json({
//     success: true,
//     message: 'Admin API is running',
//     timestamp: new Date().toISOString(),
//     controllers: controllerStatus
//   });
// });

// console.log('✅ Admin routes setup complete with ALL ROUTES ENABLED');

// module.exports = router;


// // // routes/admin/index.js - Updated Complete Admin Routes
// // const express = require('express');
// // const { authenticate, adminOnly } = require('../../middleware/auth');

// // const { validate } = require('../../middleware/validation');
// // const { 
// //   validateQuery, 
// //   validateParams,
// //   domainSchemas, 
// //   subDomainSchemas, 
// //   projectSchemas,
// //   leadSchemas,
// //   imageSchemas,
// //   querySchemas,
// //   paramSchemas 
// // } = require('../../utils/validation');

// // // Import existing controllers
// // let domainController, subDomainController, projectController, leadController, imageController, dashboardController;

// // try {
// //   domainController = require('../../controllers/domainController');
// //   console.log('✅ Domain controller loaded');
// // } catch (error) {
// //   console.error('❌ Error loading domain controller:', error.message);
// //   domainController = {};
// // }

// // try {
// //   subDomainController = require('../../controllers/subDomainController');
// //   console.log('✅ SubDomain controller loaded');
// // } catch (error) {
// //   console.error('❌ Error loading subdomain controller:', error.message);
// //   subDomainController = {};
// // }

// // try {
// //   projectController = require('../../controllers/projectController');
// //   console.log('✅ Project controller loaded');
// // } catch (error) {
// //   console.error('❌ Error loading project controller:', error.message);
// //   projectController = {};
// // }

// // try {
// //   leadController = require('../../controllers/leadController');
// //   console.log('✅ Lead controller loaded');
// // } catch (error) {
// //   console.error('❌ Error loading lead controller:', error.message);
// //   leadController = {};
// // }

// // try {
// //   imageController = require('../../controllers/imageController');
// //   console.log('✅ Image controller loaded');
// // } catch (error) {
// //   console.error('❌ Error loading image controller:', error.message);
// //   imageController = {};
// // }

// // try {
// //   dashboardController = require('../../controllers/dashboardController');
// //   console.log('✅ Dashboard controller loaded');
// // } catch (error) {
// //   console.error('❌ Error loading dashboard controller:', error.message);
// //   dashboardController = {};
// // }

// // // Import new internship route handlers
// // const internshipRoutes = require('./internships');

// // const router = express.Router();

// // // Apply authentication and admin middleware to all admin routes
// // router.use(authenticate);
// // router.use(adminOnly);

// // // Helper function to safely call controller methods
// // const safeRoute = (controller, method, description) => {
// //   return (req, res, next) => {
// //     if (controller && typeof controller[method] === 'function') {
// //       controller[method](req, res, next);
// //     } else {
// //       console.error(`❌ ${description}: Controller method not available`);
// //       res.status(500).json({
// //         success: false,
// //         message: `${description} is not available. Please check server configuration.`
// //       });
// //     }
// //   };
// // };

// // // =============================================================================
// // // EXISTING ROUTES (Phase 1 - Projects)
// // // =============================================================================

// // // Dashboard routes
// // router.get('/dashboard/stats', safeRoute(dashboardController, 'getDashboardStats', 'Get dashboard stats'));

// // // Domain routes
// // router.get('/domains',
// //   validateQuery(querySchemas.pagination),
// //   safeRoute(domainController, 'getAllDomains', 'Get all domains')
// // );

// // router.get('/domains/stats',
// //   safeRoute(domainController, 'getDomainStats', 'Get domain stats')
// // );

// // router.get('/domains/:id',
// //   validateParams(paramSchemas.id),
// //   safeRoute(domainController, 'getDomainById', 'Get domain by ID')
// // );

// // router.post('/domains',
// //   validate(domainSchemas.create),
// //   safeRoute(domainController, 'createDomain', 'Create domain')
// // );

// // router.put('/domains/:id',
// //   validateParams(paramSchemas.id),
// //   validate(domainSchemas.update),
// //   safeRoute(domainController, 'updateDomain', 'Update domain')
// // );

// // router.delete('/domains/:id',
// //   validateParams(paramSchemas.id),
// //   safeRoute(domainController, 'deleteDomain', 'Delete domain')
// // );

// // // SubDomain routes
// // router.get('/subdomains',
// //   validateQuery(querySchemas.pagination),
// //   safeRoute(subDomainController, 'getAllSubDomains', 'Get all subdomains')
// // );

// // router.get('/subdomains/stats',
// //   safeRoute(subDomainController, 'getSubDomainStats', 'Get subdomain stats')
// // );

// // router.get('/subdomains/:id',
// //   validateParams(paramSchemas.id),
// //   safeRoute(subDomainController, 'getSubDomainById', 'Get subdomain by ID')
// // );

// // router.get('/domains/:domainId/subdomains',
// //   validateParams(paramSchemas.domainId),
// //   safeRoute(subDomainController, 'getSubDomainsByDomain', 'Get subdomains by domain')
// // );

// // router.post('/subdomains',
// //   validate(subDomainSchemas.create),
// //   safeRoute(subDomainController, 'createSubDomain', 'Create subdomain')
// // );

// // router.put('/subdomains/:id',
// //   validateParams(paramSchemas.id),
// //   validate(subDomainSchemas.update),
// //   safeRoute(subDomainController, 'updateSubDomain', 'Update subdomain')
// // );

// // router.delete('/subdomains/:id',
// //   validateParams(paramSchemas.id),
// //   safeRoute(subDomainController, 'deleteSubDomain', 'Delete subdomain')
// // );

// // // Project routes
// // router.get('/projects',
// //   validateQuery(querySchemas.projectFilter),
// //   safeRoute(projectController, 'getAllProjects', 'Get all projects')
// // );

// // router.get('/projects/stats',
// //   safeRoute(projectController, 'getProjectStats', 'Get project stats')
// // );

// // router.get('/projects/:id',
// //   validateParams(paramSchemas.id),
// //   safeRoute(projectController, 'getProjectById', 'Get project by ID')
// // );

// // router.get('/projects/:id/stats',
// //   validateParams(paramSchemas.id),
// //   safeRoute(projectController, 'getProjectStats', 'Get project stats')
// // );

// // router.get('/subdomains/:subDomainId/projects',
// //   validateParams(paramSchemas.subDomainId),
// //   safeRoute(projectController, 'getProjectsBySubDomain', 'Get projects by subdomain')
// // );

// // router.post('/projects',
// //   validate(projectSchemas.create),
// //   safeRoute(projectController, 'createProject', 'Create project')
// // );

// // router.put('/projects/:id',
// //   validateParams(paramSchemas.id),
// //   validate(projectSchemas.update),
// //   safeRoute(projectController, 'updateProject', 'Update project')
// // );

// // router.put('/projects/:id/move',
// //   validateParams(paramSchemas.id),
// //   validate(projectSchemas.move),
// //   safeRoute(projectController, 'moveProject', 'Move project')
// // );

// // router.put('/projects/:id/archive',
// //   validateParams(paramSchemas.id),
// //   validate(projectSchemas.archive),
// //   safeRoute(projectController, 'archiveProject', 'Archive project')
// // );

// // router.put('/projects/bulk-update',
// //   validate(projectSchemas.bulkUpdate),
// //   safeRoute(projectController, 'bulkUpdateProjects', 'Bulk update projects')
// // );

// // router.delete('/projects/:id',
// //   validateParams(paramSchemas.id),
// //   validate(projectSchemas.delete),
// //   safeRoute(projectController, 'deleteProject', 'Delete project')
// // );

// // // Lead routes
// // router.get('/leads',
// //   validateQuery(querySchemas.leadFilter),
// //   safeRoute(leadController, 'getAllLeads', 'Get all leads')
// // );

// // router.get('/leads/stats',
// //   safeRoute(leadController, 'getLeadStats', 'Get lead stats')
// // );

// // router.get('/leads/export/csv',
// //   validateQuery(querySchemas.leadFilter),
// //   safeRoute(leadController, 'exportLeadsCSV', 'Export leads CSV')
// // );

// // router.get('/leads/:id',
// //   validateParams(paramSchemas.id),
// //   safeRoute(leadController, 'getLeadById', 'Get lead by ID')
// // );

// // router.get('/projects/:projectId/leads',
// //   validateParams(paramSchemas.projectId),
// //   safeRoute(leadController, 'getLeadsByProject', 'Get leads by project')
// // );

// // router.put('/leads/:id',
// //   validateParams(paramSchemas.id),
// //   validate(leadSchemas.update),
// //   safeRoute(leadController, 'updateLead', 'Update lead')
// // );

// // router.put('/leads/bulk-update',
// //   validate(leadSchemas.bulkUpdate),
// //   safeRoute(leadController, 'bulkUpdateLeads', 'Bulk update leads')
// // );

// // router.delete('/leads/:id',
// //   validateParams(paramSchemas.id),
// //   safeRoute(leadController, 'deleteLead', 'Delete lead')
// // );

// // // Image routes
// // router.get('/images',
// //   safeRoute(imageController, 'getAllImages', 'Get all images')
// // );

// // router.get('/images/:id',
// //   validateParams(paramSchemas.id),
// //   safeRoute(imageController, 'getImageById', 'Get image by ID')
// // );

// // router.get('/images/stats',
// //   safeRoute(imageController, 'getImageStats', 'Get image stats')
// // );

// // router.get('/images/entity/:entityType/:entityId',
// //   safeRoute(imageController, 'getImagesByEntity', 'Get images by entity')
// // );

// // router.post('/images/upload',
// //   safeRoute(imageController, 'uploadImages', 'Upload images')
// // );

// // router.put('/images/:id',
// //   validateParams(paramSchemas.id),
// //   validate(imageSchemas.update),
// //   safeRoute(imageController, 'updateImage', 'Update image')
// // );

// // router.put('/images/reorder',
// //   validate(imageSchemas.reorder),
// //   safeRoute(imageController, 'reorderImages', 'Reorder images')
// // );

// // router.delete('/images/:id',
// //   validateParams(paramSchemas.id),
// //   safeRoute(imageController, 'deleteImage', 'Delete image')
// // );

// // router.delete('/images/bulk-delete',
// //   safeRoute(imageController, 'bulkDeleteImages', 'Bulk delete images')
// // );

// // // =============================================================================
// // // NEW ROUTES (Phase 2 - Internships)
// // // =============================================================================

// // // Mount internship routes
// // router.use('/', internshipRoutes);

// // // =============================================================================
// // // HEALTH CHECK ROUTE
// // // =============================================================================
// // router.get('/health', (req, res) => {
// //   const controllerStatus = {
// //     dashboard: {
// //       loaded: !!dashboardController,
// //       methods: dashboardController ? Object.keys(dashboardController) : []
// //     },
// //     domain: {
// //       loaded: !!domainController,
// //       methods: domainController ? Object.keys(domainController) : []
// //     },
// //     subDomain: {
// //       loaded: !!subDomainController,
// //       methods: subDomainController ? Object.keys(subDomainController) : []
// //     },
// //     project: {
// //       loaded: !!projectController,
// //       methods: projectController ? Object.keys(projectController) : []
// //     },
// //     lead: {
// //       loaded: !!leadController,
// //       methods: leadController ? Object.keys(leadController) : []
// //     },
// //     image: {
// //       loaded: !!imageController,
// //       methods: imageController ? Object.keys(imageController) : []
// //     }
// //   };

// //   res.json({
// //     success: true,
// //     message: 'Admin API is running',
// //     timestamp: new Date().toISOString(),
// //     features: {
// //       phase1: 'Projects System',
// //       phase2: 'Internships System'
// //     },
// //     controllers: controllerStatus
// //   });
// // });

// // console.log('✅ Admin routes setup complete with error handling');

// // module.exports = router;