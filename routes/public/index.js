const express = require('express');
// const { validateQuery, validateParams, validate } = require('../../middleware/validation');
// const { contactSchemas, paramSchemas } = require('../../utils/validation');
const { validate } = require('../../middleware/validation');
const { validateQuery, validateParams, contactSchemas, paramSchemas } = require('../../utils/validation');
const {
  PublicDomainController, 
  PublicSubDomainController, 
  PublicProjectController, 
  ContactController 
} = require('../../controllers/publicController');

const router = express.Router();

// =============================================================================
// PUBLIC DOMAIN ROUTES
// =============================================================================
router.get('/domains', 
  PublicDomainController.getAllDomains
);

router.get('/domains/:slug',
  validateParams(paramSchemas.slug),
  PublicDomainController.getDomainBySlug
);

// =============================================================================
// PUBLIC SUBDOMAIN ROUTES
// =============================================================================
router.get('/subdomains/:slug',
  validateParams(paramSchemas.slug),
  PublicSubDomainController.getSubDomainBySlug
);

// =============================================================================
// PUBLIC PROJECT ROUTES
// =============================================================================
router.get('/projects/featured',
  PublicProjectController.getFeaturedProjects
);

router.get('/projects/:slug',
  validateParams(paramSchemas.slug),
  PublicProjectController.getProjectPreview
);

// =============================================================================
// CONTACT ROUTES
// =============================================================================
router.get('/contact/project/:projectId',
  validateParams(paramSchemas.projectId),
  ContactController.getContactFormData
);

router.post('/contact',
  validate(contactSchemas.submit),
  ContactController.submitContactForm
);

module.exports = router;