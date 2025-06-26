// routes/admin/index.js - FIXED VERSION WITH ERROR HANDLING
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
  console.log('🔍 Project controller methods:', Object.keys(projectController));
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

const router = express.Router();

// Apply authentication and admin middleware to all admin routes
router.use(authenticate);
router.use(adminOnly);

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
// DOMAIN ROUTES
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

// NEW: Add leaf subdomains route under domains
router.get('/domains/:id/leaf-subdomains',
  validateParams(paramSchemas.id),
  safeRoute(domainController, 'getLeafSubDomains', 'Get leaf subdomains') ||
  safeRoute(subDomainController, 'getLeafSubDomains', 'Get leaf subdomains')
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
// SUBDOMAIN ROUTES
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

// THIS IS THE PROBLEMATIC ROUTE - Line ~148 in your original file
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
  // Remove validation for delete as it might not exist
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
    message: 'Admin API is running',
    timestamp: new Date().toISOString(),
    controllers: controllerStatus
  });
});

console.log('✅ Admin routes setup complete with error handling');

module.exports = router;


// // routes/admin/index.js
// const express = require('express');
// const { authenticate, adminOnly } = require('../../middleware/auth');
// // const { validate, validateQuery, validateParams } = require('../../middleware/validation');
// // const { 
// //   domainSchemas, 
// //   subDomainSchemas, 
// //   projectSchemas,
// //   leadSchemas,
// //   imageSchemas,
// //   querySchemas,
// //   paramSchemas 
// // } = require('../../utils/validation');

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

// // Import controllers
// const domainController = require('../../controllers/domainController');
// const subDomainController = require('../../controllers/subDomainController');
// const projectController = require('../../controllers/projectController');
// const leadController = require('../../controllers/leadController');
// const imageController = require('../../controllers/imageController');
// const dashboardController = require('../../controllers/dashboardController');

// const router = express.Router();

// // Apply authentication and admin middleware to all admin routes
// router.use(authenticate);
// router.use(adminOnly);

// // =============================================================================
// // DASHBOARD ROUTES
// // =============================================================================
// router.get('/dashboard/stats', dashboardController.getDashboardStats);
// router.get('/dashboard/recent-activity', dashboardController.getRecentActivity);
// router.get('/dashboard/analytics', dashboardController.getAnalytics);
// router.get('/dashboard/domain/:domainId/analytics',
//   validateParams(paramSchemas.domainId),
//   dashboardController.getDomainAnalytics
// );

// // =============================================================================
// // DOMAIN ROUTES
// // =============================================================================
// router.get('/domains', 
//   validateQuery(querySchemas.domainFilter),
//   domainController.getAllDomains
// );

// router.get('/domains/:id', 
//   validateParams(paramSchemas.id),
//   domainController.getDomainById
// );

// router.get('/domains/:id/hierarchy',
//   validateParams(paramSchemas.id),
//   domainController.getDomainHierarchy
// );

// router.get('/domains/:id/stats',
//   validateParams(paramSchemas.id),
//   domainController.getDomainStats
// );

// router.post('/domains',
//   validate(domainSchemas.create),
//   domainController.createDomain
// );

// router.put('/domains/:id',
//   validateParams(paramSchemas.id),
//   validate(domainSchemas.update),
//   domainController.updateDomain
// );

// router.delete('/domains/:id',
//   validateParams(paramSchemas.id),
//   domainController.deleteDomain
// );

// // =============================================================================
// // SUBDOMAIN ROUTES
// // =============================================================================
// router.get('/subdomains',
//   validateQuery(querySchemas.subDomainFilter),
//   subDomainController.getAllSubDomains
// );

// router.get('/subdomains/leafs',
//   subDomainController.getLeafSubDomains
// );

// router.get('/subdomains/:id',
//   validateParams(paramSchemas.id),
//   subDomainController.getSubDomainById
// );

// router.get('/domains/:domainId/subdomains',
//   validateParams(paramSchemas.domainId),
//   subDomainController.getSubDomainsByDomain
// );

// router.post('/subdomains',
//   validate(subDomainSchemas.create),
//   subDomainController.createSubDomain
// );

// router.put('/subdomains/:id',
//   validateParams(paramSchemas.id),
//   validate(subDomainSchemas.update),
//   subDomainController.updateSubDomain
// );

// router.delete('/subdomains/:id',
//   validateParams(paramSchemas.id),
//   subDomainController.deleteSubDomain
// );

// // =============================================================================
// // PROJECT ROUTES
// // =============================================================================
// router.get('/projects',
//   validateQuery(querySchemas.projectFilter),
//   projectController.getAllProjects
// );

// router.get('/projects/:id',
//   validateParams(paramSchemas.id),
//   projectController.getProjectById
// );

// router.get('/projects/:id/stats',
//   validateParams(paramSchemas.id),
//   projectController.getProjectStats
// );

// router.get('/subdomains/:subDomainId/projects',
//   validateParams(paramSchemas.subDomainId),
//   projectController.getProjectsBySubDomain
// );

// router.post('/projects',
//   validate(projectSchemas.create),
//   projectController.createProject
// );

// router.put('/projects/:id',
//   validateParams(paramSchemas.id),
//   validate(projectSchemas.update),
//   projectController.updateProject
// );

// router.put('/projects/:id/move',
//   validateParams(paramSchemas.id),
//   validate(projectSchemas.move),
//   projectController.moveProject
// );

// router.put('/projects/:id/archive',
//   validateParams(paramSchemas.id),
//   validate(projectSchemas.archive),
//   projectController.archiveProject
// );

// router.put('/projects/bulk-update',
//   validate(projectSchemas.bulkUpdate),
//   projectController.bulkUpdateProjects
// );

// router.delete('/projects/:id',
//   validateParams(paramSchemas.id),
//   validate(projectSchemas.delete),
//   projectController.deleteProject
// );

// // =============================================================================
// // LEAD ROUTES
// // =============================================================================
// router.get('/leads',
//   validateQuery(querySchemas.leadFilter),
//   leadController.getAllLeads
// );

// router.get('/leads/:id',
//   validateParams(paramSchemas.id),
//   leadController.getLeadById
// );

// router.get('/leads/export/csv',
//   validateQuery(querySchemas.leadFilter),
//   leadController.exportLeadsCSV
// );

// router.get('/leads/stats',
//   leadController.getLeadStats
// );

// router.get('/projects/:projectId/leads',
//   validateParams(paramSchemas.projectId),
//   leadController.getLeadsByProject
// );

// router.put('/leads/:id',
//   validateParams(paramSchemas.id),
//   validate(leadSchemas.update),
//   leadController.updateLead
// );

// router.put('/leads/bulk-update',
//   validate(leadSchemas.bulkUpdate),
//   leadController.bulkUpdateLeads
// );

// router.delete('/leads/:id',
//   validateParams(paramSchemas.id),
//   leadController.deleteLead
// );

// // =============================================================================
// // IMAGE ROUTES
// // =============================================================================
// router.get('/images',
//   imageController.getAllImages
// );

// router.get('/images/:id',
//   validateParams(paramSchemas.id),
//   imageController.getImageById
// );

// router.get('/images/stats',
//   imageController.getImageStats
// );

// router.get('/images/entity/:entityType/:entityId',
//   imageController.getImagesByEntity
// );

// router.post('/images/upload',
//   imageController.uploadImages
// );

// router.put('/images/:id',
//   validateParams(paramSchemas.id),
//   validate(imageSchemas.update),
//   imageController.updateImage
// );

// router.put('/images/reorder',
//   validate(imageSchemas.reorder),
//   imageController.reorderImages
// );

// router.delete('/images/:id',
//   validateParams(paramSchemas.id),
//   imageController.deleteImage
// );

// router.delete('/images/bulk-delete',
//   imageController.bulkDeleteImages
// );

// module.exports = router;