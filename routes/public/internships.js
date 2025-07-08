// routes/public/internships.js - Fixed for Current Validation Structure
const express = require('express');
const { validate } = require('../../middleware/validation');
const { validateParams, paramSchemas } = require('../../utils/validation');

// Import controllers with error handling
let branchController, internshipDomainController, internshipController, internshipLeadController, ratingController;

try {
  branchController = require('../../controllers/branchController');
  console.log('✅ Public: Branch controller loaded');
} catch (error) {
  console.error('❌ Public: Error loading branch controller:', error.message);
  branchController = {};
}

try {
  internshipDomainController = require('../../controllers/internshipDomainController');
  console.log('✅ Public: InternshipDomain controller loaded');
} catch (error) {
  console.error('❌ Public: Error loading internshipDomain controller:', error.message);
  internshipDomainController = {};
}

try {
  internshipController = require('../../controllers/internshipController');
  console.log('✅ Public: Internship controller loaded');
} catch (error) {
  console.error('❌ Public: Error loading internship controller:', error.message);
  internshipController = {};
}

try {
  internshipLeadController = require('../../controllers/internshipLeadController');
  console.log('✅ Public: InternshipLead controller loaded');
} catch (error) {
  console.error('❌ Public: Error loading internshipLead controller:', error.message);
  internshipLeadController = {};
}

try {
  ratingController = require('../../controllers/ratingController');
  console.log('✅ Public: Rating controller loaded');
} catch (error) {
  console.error('❌ Public: Error loading rating controller:', error.message);
  ratingController = {};
}

const router = express.Router();

// Helper function to safely call controller methods
const safeRoute = (controller, method, description) => {
  return (req, res, next) => {
    if (controller && typeof controller[method] === 'function') {
      controller[method](req, res, next);
    } else {
      console.error(`❌ Public ${description}: Controller method not available`);
      res.status(500).json({
        success: false,
        message: `${description} is not available. Please check server configuration.`
      });
    }
  };
};

// =============================================================================
// PUBLIC BRANCH ROUTES
// =============================================================================
router.get('/branches',
  safeRoute(branchController, 'getAllBranches', 'Get all branches')
);

router.get('/branches/:id',
  validateParams(paramSchemas.id),
  safeRoute(branchController, 'getBranchById', 'Get branch by ID')
);

// =============================================================================
// PUBLIC INTERNSHIP DOMAIN ROUTES
// =============================================================================
router.get('/branches/:branchId/domains',
  safeRoute(internshipDomainController, 'getDomainsByBranch', 'Get domains by branch')
);

router.get('/internship-domains/:id',
  validateParams(paramSchemas.id),
  safeRoute(internshipDomainController, 'getInternshipDomainById', 'Get internship domain by ID')
);

// =============================================================================
// PUBLIC INTERNSHIP ROUTES
// =============================================================================
router.get('/internships',
  safeRoute(internshipController, 'getAllInternships', 'Get all internships')
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

router.get('/domains/:domainId/internships',
  safeRoute(internshipController, 'getInternshipsByDomain', 'Get internships by domain')
);

// =============================================================================
// PUBLIC INTERNSHIP ENROLLMENT ROUTES
// =============================================================================
router.post('/internships/:internshipId/enroll',
  safeRoute(internshipLeadController, 'createInternshipLead', 'Create internship enrollment')
);

// =============================================================================
// PUBLIC RATING ROUTES
// =============================================================================
router.get('/internships/:internshipId/ratings',
  safeRoute(ratingController, 'getRatingsByInternship', 'Get ratings by internship')
);

router.get('/ratings/featured',
  safeRoute(ratingController, 'getFeaturedRatings', 'Get featured ratings')
);

router.post('/internships/:internshipId/ratings',
  safeRoute(ratingController, 'createRating', 'Create rating')
);

module.exports = router;