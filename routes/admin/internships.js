// routes/admin/internships.js - Fixed for Current Validation Structure
const express = require('express');
const { authenticate, adminOnly } = require('../../middleware/auth');
const { validate } = require('../../middleware/validation');
const { internshipParamSchemas, internshipSchemas } = require('../../utils/internshipValidation');

const { 
  validateQuery, 
  validateParams,
  paramSchemas 
} = require('../../utils/validation');

// Import controllers with error handling
let branchController, internshipDomainController, internshipController, internshipLeadController, ratingController;

try {
  branchController = require('../../controllers/branchController');
  console.log('✅ Branch controller loaded');
} catch (error) {
  console.error('❌ Error loading branch controller:', error.message);
  branchController = {};
}

try {
  internshipDomainController = require('../../controllers/internshipDomainController');
  console.log('✅ InternshipDomain controller loaded');
} catch (error) {
  console.error('❌ Error loading internshipDomain controller:', error.message);
  internshipDomainController = {};
}

try {
  internshipController = require('../../controllers/internshipController');
  console.log('✅ Internship controller loaded');
} catch (error) {
  console.error('❌ Error loading internship controller:', error.message);
  internshipController = {};
}

try {
  internshipLeadController = require('../../controllers/internshipLeadController');
  console.log('✅ InternshipLead controller loaded');
} catch (error) {
  console.error('❌ Error loading internshipLead controller:', error.message);
  internshipLeadController = {};
}

try {
  ratingController = require('../../controllers/ratingController');
  console.log('✅ Rating controller loaded');
} catch (error) {
  console.error('❌ Error loading rating controller:', error.message);
  ratingController = {};
}

const router = express.Router();

// Apply authentication and admin middleware to all admin routes
router.use(authenticate);
router.use(adminOnly);

// Helper function to safely call controller methods
const safeRoute = (controller, method, description) => {
  return (req, res, next) => {
    if (controller && typeof controller[method] === 'function') {
      controller[method](req, res, next);
    } else {
      console.error(`❌ ${description}: Controller method not available`);
      res.status(500).json({
        success: false,
        message: `${description} is not available. Please check server configuration.`
      });
    }
  };
};

// =============================================================================
// BRANCH ROUTES
// =============================================================================
router.get('/branches',
  safeRoute(branchController, 'getAllBranches', 'Get all branches')
);

router.get('/branches/stats',
  safeRoute(branchController, 'getBranchStats', 'Get branch stats')
);

router.get('/branches/:id',
  validateParams(paramSchemas.id),
  safeRoute(branchController, 'getBranchById', 'Get branch by ID')
);

// router.post('/branches',
//   safeRoute(branchController, 'createBranch', 'Create branch')
// );

router.post('/branches',
  validate(internshipSchemas.createBranch),  // <-- This validates the request body
  safeRoute(branchController, 'createBranch', 'Create branch')
);

router.put('/branches/:id',
  validateParams(paramSchemas.id),
  safeRoute(branchController, 'updateBranch', 'Update branch')
);

router.delete('/branches/:id',
  validateParams(paramSchemas.id),
  safeRoute(branchController, 'deleteBranch', 'Delete branch')
);

// =============================================================================
// INTERNSHIP DOMAIN ROUTES
// =============================================================================
router.get('/internship-domains',
  safeRoute(internshipDomainController, 'getAllInternshipDomains', 'Get all internship domains')
);

router.get('/internship-domains/:id',
  validateParams(paramSchemas.id),
  safeRoute(internshipDomainController, 'getInternshipDomainById', 'Get internship domain by ID')
);

router.get('/branches/:branchId/internship-domains',
  safeRoute(internshipDomainController, 'getDomainsByBranch', 'Get domains by branch')
);

router.post('/internship-domains',
  validate(internshipSchemas.createInternshipDomain),
  safeRoute(internshipDomainController, 'createInternshipDomain', 'Create internship domain')
);

// Add these new routes
router.get('/branches/:branchId/structure',
  validateParams(paramSchemas.branchId),
  safeRoute(branchController, 'getBranchStructure', 'Get branch structure')
);

router.get('/branches/:branchId/internships',
  validateParams(paramSchemas.branchId),
  safeRoute(internshipController, 'getInternshipsByBranch', 'Get internships by branch')
);

router.get('/branches/:branchId/internship-domains',
  validateParams(internshipParamSchemas.branchId),  // <-- This validates the URL parameter
  safeRoute(internshipDomainController, 'getDomainsByBranch', 'Get domains by branch')
);

router.put('/internship-domains/:id',
  validateParams(paramSchemas.id),
  safeRoute(internshipDomainController, 'updateInternshipDomain', 'Update internship domain')
);

router.delete('/internship-domains/:id',
  validateParams(paramSchemas.id),
  safeRoute(internshipDomainController, 'deleteInternshipDomain', 'Delete internship domain')
);

// =============================================================================
// INTERNSHIP ROUTES
// =============================================================================
router.get('/internships',
  safeRoute(internshipController, 'getAllInternships', 'Get all internships')
);

router.post('/internships',
  validate(internshipSchemas.createInternship),  // <-- This validates internship data
  safeRoute(internshipController, 'createInternship', 'Create internship')
);
router.get('/internships/featured',
  safeRoute(internshipController, 'getFeaturedInternships', 'Get featured internships')
);

router.get('/internships/top-rated',
  safeRoute(internshipController, 'getTopRatedInternships', 'Get top rated internships')
);

router.get('/internships/search',
  safeRoute(internshipController, 'searchInternships', 'Search internships')
);

router.get('/internships/:id',
  validateParams(paramSchemas.id),
  safeRoute(internshipController, 'getInternshipById', 'Get internship by ID')
);

router.get('/internships/:id/stats',
  validateParams(paramSchemas.id),
  safeRoute(internshipController, 'getInternshipStats', 'Get internship stats')
);

router.get('/internship-domains/:domainId/internships',
  safeRoute(internshipController, 'getInternshipsByDomain', 'Get internships by domain')
);

router.post('/internships',
  safeRoute(internshipController, 'createInternship', 'Create internship')
);

router.put('/internships/:id',
  validateParams(paramSchemas.id),
  safeRoute(internshipController, 'updateInternship', 'Update internship')
);

router.put('/internships/bulk-update',
  safeRoute(internshipController, 'bulkUpdateInternships', 'Bulk update internships')
);

router.delete('/internships/:id',
  validateParams(paramSchemas.id),
  safeRoute(internshipController, 'deleteInternship', 'Delete internship')
);

// =============================================================================
// INTERNSHIP LEAD ROUTES
// =============================================================================
router.get('/internship-leads',
  safeRoute(internshipLeadController, 'getAllInternshipLeads', 'Get all internship leads')
);

router.get('/internship-leads/stats',
  safeRoute(internshipLeadController, 'getInternshipLeadStats', 'Get internship lead stats')
);

router.get('/internship-leads/export/csv',
  safeRoute(internshipLeadController, 'exportInternshipLeadsCSV', 'Export internship leads CSV')
);

router.get('/internship-leads/:id',
  validateParams(paramSchemas.id),
  safeRoute(internshipLeadController, 'getInternshipLeadById', 'Get internship lead by ID')
);

router.get('/internships/:internshipId/leads',
  safeRoute(internshipLeadController, 'getLeadsByInternship', 'Get leads by internship')
);

router.put('/internship-leads/:id',
  validateParams(paramSchemas.id),
  safeRoute(internshipLeadController, 'updateInternshipLead', 'Update internship lead')
);

router.put('/internship-leads/bulk-update',
  safeRoute(internshipLeadController, 'bulkUpdateInternshipLeads', 'Bulk update internship leads')
);

router.delete('/internship-leads/:id',
  validateParams(paramSchemas.id),
  safeRoute(internshipLeadController, 'deleteInternshipLead', 'Delete internship lead')
);

// =============================================================================
// RATING ROUTES
// =============================================================================
router.get('/ratings',
  safeRoute(ratingController, 'getAllRatings', 'Get all ratings')
);

router.get('/ratings/stats',
  safeRoute(ratingController, 'getRatingStats', 'Get rating stats')
);

router.get('/ratings/featured',
  safeRoute(ratingController, 'getFeaturedRatings', 'Get featured ratings')
);

router.get('/ratings/:id',
  validateParams(paramSchemas.id),
  safeRoute(ratingController, 'getRatingById', 'Get rating by ID')
);

router.get('/internships/:internshipId/ratings',
  safeRoute(ratingController, 'getRatingsByInternship', 'Get ratings by internship')
);

router.put('/ratings/:id',
  validateParams(paramSchemas.id),
  safeRoute(ratingController, 'updateRating', 'Update rating')
);

router.put('/ratings/:id/approve',
  validateParams(paramSchemas.id),
  safeRoute(ratingController, 'approveRating', 'Approve rating')
);

router.put('/ratings/bulk-approve',
  safeRoute(ratingController, 'bulkApproveRatings', 'Bulk approve ratings')
);

router.delete('/ratings/:id',
  validateParams(paramSchemas.id),
  safeRoute(ratingController, 'deleteRating', 'Delete rating')
);

module.exports = router;