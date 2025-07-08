// utils/validation.js - Updated with Internship Validation Schemas
const Joi = require('joi');

// =============================================================================
// EXISTING VALIDATION SCHEMAS (Phase 1 - Projects)
// =============================================================================

// Authentication validation schemas
const authSchemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  signup: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
    fullName: Joi.string().min(2).max(100).required()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
  }),

  requestPasswordReset: Joi.object({
    email: Joi.string().email().required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
  }),

  verifyOTP: Joi.object({
    token: Joi.string().required(),
    otp: Joi.string().length(6).required()
  })
};

// Domain validation schemas
const domainSchemas = {
  create: Joi.object({
    title: Joi.string().min(2).max(200).required(),
    description: Joi.string().allow('').optional(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }),

  update: Joi.object({
    title: Joi.string().min(2).max(200).optional(),
    description: Joi.string().allow('').optional(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }).min(1)
};

// SubDomain validation schemas
const subDomainSchemas = {
  create: Joi.object({
    title: Joi.string().min(2).max(200).required(),
    description: Joi.string().allow('').optional(),
    domainId: Joi.number().integer().positive().required(),
    parentId: Joi.number().integer().positive().optional(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }),

  update: Joi.object({
    title: Joi.string().min(2).max(200).optional(),
    description: Joi.string().allow('').optional(),
    domainId: Joi.number().integer().positive().optional(),
    parentId: Joi.number().integer().positive().optional(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }).min(1)
};

// Project validation schemas
const projectSchemas = {
  create: Joi.object({
    title: Joi.string().min(3).max(300).required(),
    abstract: Joi.string().min(10).required(),
    specifications: Joi.string().min(10).required(),
    learningOutcomes: Joi.string().min(10).required(),
    subDomainId: Joi.number().integer().positive().required(),
    isActive: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }),

  update: Joi.object({
    title: Joi.string().min(3).max(300).optional(),
    abstract: Joi.string().min(10).optional(),
    specifications: Joi.string().min(10).optional(),
    learningOutcomes: Joi.string().min(10).optional(),
    subDomainId: Joi.number().integer().positive().optional(),
    isActive: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }).min(1),

  move: Joi.object({
    newSubDomainId: Joi.number().integer().positive().required()
  }),

  archive: Joi.object({
    isActive: Joi.boolean().required()
  }),

  bulkUpdate: Joi.object({
    projectIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
    updates: Joi.object({
      isActive: Joi.boolean().optional(),
      isFeatured: Joi.boolean().optional(),
      subDomainId: Joi.number().integer().positive().optional()
    }).min(1).required()
  }),

  delete: Joi.object({
    forceDelete: Joi.boolean().optional()
  })
};

// Lead validation schemas  
const leadSchemas = {
  create: Joi.object({
    fullName: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().pattern(/^[\d\s\-\(\)]{10,15}$/).required(),
    collegeName: Joi.string().min(2).max(200).required(),
    branch: Joi.string().min(2).max(100).required(),
    city: Joi.string().min(2).max(100).required(),
    projectId: Joi.number().integer().positive().required(),
    domainInterest: Joi.string().min(2).max(200).optional()
  }),

  update: Joi.object({
    status: Joi.string().valid('new', 'contacted', 'converted', 'closed').optional(),
    notes: Joi.string().max(2000).allow('').optional()
  }).min(1),

  bulkUpdate: Joi.object({
    leadIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
    updates: Joi.object({
      status: Joi.string().valid('new', 'contacted', 'converted', 'closed').optional(),
      notes: Joi.string().max(2000).allow('').optional()
    }).min(1).required()
  })
};

// Image validation schemas
const imageSchemas = {
  upload: Joi.object({
    entityType: Joi.string().valid('domain', 'subdomain', 'project', 'branch', 'internshipDomain', 'internship', 'certificate').required(),
    entityId: Joi.number().integer().positive().required(),
    isMain: Joi.boolean().optional(),
    alt: Joi.string().max(255).optional(),
    caption: Joi.string().max(255).optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }),

  update: Joi.object({
    isMain: Joi.boolean().optional(),
    alt: Joi.string().max(255).allow('').optional(),
    caption: Joi.string().max(255).allow('').optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }).min(1),

  reorder: Joi.object({
    imageIds: Joi.array().items(Joi.number().integer().positive()).min(1).required()
  })
};

// =============================================================================
// NEW VALIDATION SCHEMAS (Phase 2 - Internships)
// =============================================================================

// Branch validation schemas
const branchSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    code: Joi.string().min(2).max(20).required(),
    description: Joi.string().allow('').optional(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    code: Joi.string().min(2).max(20).optional(),
    description: Joi.string().allow('').optional(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }).min(1)
};

// Internship Domain validation schemas
const internshipDomainSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().allow('').optional(),
    branchId: Joi.number().integer().positive().required(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().allow('').optional(),
    branchId: Joi.number().integer().positive().optional(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }).min(1)
};

// Internship validation schemas
const internshipSchemas = {
  create: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(10).required(),
    shortDescription: Joi.string().max(500).optional(),
    learningOutcomes: Joi.string().min(10).required(),
    topBenefits: Joi.string().optional(),
    realTimeProjects: Joi.string().optional(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
    duration: Joi.string().optional(),
    price: Joi.number().min(0).precision(2).optional(),
    originalPrice: Joi.number().min(0).precision(2).optional(),
    maxLearners: Joi.number().integer().min(1).optional(),
    prerequisites: Joi.string().optional(),
    internshipDomainId: Joi.number().integer().positive().required(),
    isActive: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    isComingSoon: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }),

  update: Joi.object({
    title: Joi.string().min(3).max(200).optional(),
    description: Joi.string().min(10).optional(),
    shortDescription: Joi.string().max(500).optional(),
    learningOutcomes: Joi.string().min(10).optional(),
    topBenefits: Joi.string().optional(),
    realTimeProjects: Joi.string().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    duration: Joi.string().optional(),
    price: Joi.number().min(0).precision(2).optional(),
    originalPrice: Joi.number().min(0).precision(2).optional(),
    maxLearners: Joi.number().integer().min(1).optional(),
    prerequisites: Joi.string().optional(),
    internshipDomainId: Joi.number().integer().positive().optional(),
    isActive: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    isComingSoon: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }).min(1),

  bulkUpdate: Joi.object({
    internshipIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
    updates: Joi.object({
      isActive: Joi.boolean().optional(),
      isFeatured: Joi.boolean().optional(),
      isComingSoon: Joi.boolean().optional(),
      internshipDomainId: Joi.number().integer().positive().optional()
    }).min(1).required()
  })
};

// Internship Lead validation schemas
const internshipLeadSchemas = {
  create: Joi.object({
    fullName: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().pattern(/^[\d\s\-\(\)]{10,15}$/).required(),
    collegeName: Joi.string().min(2).max(200).required(),
    branch: Joi.string().min(2).max(100).required(),
    city: Joi.string().min(2).max(100).required(),
    yearOfStudy: Joi.string().max(50).optional(),
    previousExperience: Joi.string().max(1000).optional(),
    internshipId: Joi.number().integer().positive().required(),
    source: Joi.string().max(50).optional(),
    utmSource: Joi.string().max(100).optional(),
    utmMedium: Joi.string().max(100).optional(),
    utmCampaign: Joi.string().max(100).optional()
  }),

  update: Joi.object({
    status: Joi.string().valid('new', 'contacted', 'enrolled', 'completed', 'cancelled', 'rejected').optional(),
    notes: Joi.string().max(2000).allow('').optional(),
    enrollmentDate: Joi.date().iso().optional(),
    completionDate: Joi.date().iso().optional(),
    certificateIssued: Joi.boolean().optional()
  }).min(1),

  bulkUpdate: Joi.object({
    leadIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
    updates: Joi.object({
      status: Joi.string().valid('new', 'contacted', 'enrolled', 'completed', 'cancelled', 'rejected').optional(),
      notes: Joi.string().max(2000).allow('').optional()
    }).min(1).required()
  })
};

// Rating validation schemas
const ratingSchemas = {
  create: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    review: Joi.string().max(2000).optional(),
    reviewerName: Joi.string().min(2).max(100).required(),
    reviewerEmail: Joi.string().email().required(),
    reviewerDesignation: Joi.string().max(100).optional(),
    reviewerCompany: Joi.string().max(100).optional(),
    internshipId: Joi.number().integer().positive().required(),
    internshipLeadId: Joi.number().integer().positive().optional()
  }),

  update: Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional(),
    review: Joi.string().max(2000).optional(),
    reviewerName: Joi.string().min(2).max(100).optional(),
    reviewerDesignation: Joi.string().max(100).optional(),
    reviewerCompany: Joi.string().max(100).optional(),
    isApproved: Joi.boolean().optional(),
    isPublic: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional()
  }).min(1),

  approve: Joi.object({
    isApproved: Joi.boolean().required()
  }),

  bulkApprove: Joi.object({
    ratingIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
    isApproved: Joi.boolean().required()
  })
};

// // Query parameter validation schemas
// const querySchemas = {
//   pagination: Joi.object({
//     page: Joi.number().integer().min(1).default(1),
//     limit: Joi.number().integer().min(1).max(100).default(10),
//     sortBy: Joi.string().optional(),
//     sortOrder: Joi.string().valid('ASC', 'DESC').default('ASC')
//   }),

//   projectFilter: Joi.object({
//     page: Joi.number().integer().min(1).default(1),
//     limit: Joi.number().integer().min(1).max(100).default(10),
//     search: Joi.string().optional(),
//     domainId: Joi.number().integer().positive().optional(),
//     subDomainId: Joi.number().integer().positive().optional(),
//     isActive: Joi.boolean().optional(),
//     isFeatured: Joi.boolean().optional(),
//     isArchived: Joi.boolean().optional(),
//     sortBy: Joi.string().valid('id', 'title', 'createdAt', 'updatedAt', 'sortOrder').default('sortOrder'),
//     sortOrder: Joi.string().valid('ASC', 'DESC').default('ASC')
//   }),

//   leadFilter: Joi.object({
//     page: Joi.number().integer().min(1).default(1),
//     limit: Joi.number().integer().min(1).max(100).default(10),
//     search: Joi.string().optional(),
//     projectId: Joi.number().integer().positive().optional(),
//     status: Joi.string().valid('new', 'contacted', 'converted', 'closed').optional(),
//     startDate: Joi.date().iso().optional(),
//     endDate: Joi.date().iso().optional(),
//     sortBy: Joi.string().valid('id', 'fullName', 'email', 'createdAt', 'status').default('createdAt'),
//     sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
//   }),

//   // New query schemas for internships
//   branchFilter: Joi.object({
//     page: Joi.number().integer().min(1).default(1),
//     limit: Joi.number().integer().min(1).max(100).default(10),
//     search: Joi.string().optional(),
//     isActive: Joi.boolean().optional(),
//     sortBy: Joi.string().valid('id', 'name', 'code', 'sortOrder', 'createdAt').default('sortOrder'),
//     sortOrder: Joi.string().valid('ASC', 'DESC').default('ASC')
//   }),

//   internshipDomainFilter: Joi.object({
//     page: Joi.number().integer().min(1).default(1),
//     limit: Joi.number().integer().min(1).max(100).default(10),
//     search: Joi.string().optional(),
//     branchId: Joi.number().integer().positive().optional(),
//     isActive: Joi.boolean().optional(),
//     sortBy: Joi.string().valid('id', 'name', 'sortOrder', 'createdAt').default('sortOrder'),
//     sortOrder: Joi.string().valid('ASC', 'DESC').default('ASC')
//   }),

//   internshipFilter: Joi.object({
//     page: Joi.number().integer().min(1).default(1),
//     limit: Joi.number().integer().min(1).max(100).default(10),
//     search: Joi.string().optional(),
//     branchId: Joi.number().integer().positive().optional(),
//     internshipDomainId: Joi.number().integer().positive().optional(),
//     isActive: Joi.boolean().optional(),
//     isFeatured: Joi.boolean().optional(),
//     isComingSoon: Joi.boolean().optional(),
//     minRating: Joi.number().min(0).max(5).optional(),
//     maxPrice: Joi.number().min(0).optional(),
//     startDate: Joi.date().iso().optional(),
//     sortBy: Joi.string().valid('id', 'title', 'startDate', 'endDate', 'averageRating', 'sortOrder', 'createdAt').default('sortOrder'),
//     sortOrder: Joi.string().valid('ASC', 'DESC').default('ASC')
//   }),

//   internshipLeadFilter: Joi.object({
//     page: Joi.number().integer().min(1).default(1),
//     limit: Joi.number().integer().min(1).max(100).default(10),
//     search: Joi.string().optional(),
//     internshipId: Joi.number().integer().positive().optional(),
//     branchId: Joi.number().integer().positive().optional(),
//     status: Joi.string().valid('new', 'contacted', 'enrolled', 'completed', 'cancelled', 'rejected').optional(),
//     startDate: Joi.date().iso().optional(),
//     endDate: Joi.date().iso().optional(),
//     sortBy: Joi.string().valid('id', 'fullName', 'email', 'createdAt', 'status').default('createdAt'),
//     sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
//   }),

//   ratingFilter: Joi.object({
//     page: Joi.number().integer().min(1).default(1),
//     limit: Joi.number().integer().min(1).max(100).default(10),
//     search: Joi.string().optional(),
//     internshipId: Joi.number().integer().positive().optional(),
//     rating: Joi.number().integer().min(1).max(5).optional(),
//     isApproved: Joi.boolean().optional(),
//     isPublic: Joi.boolean().optional(),
//     isFeatured: Joi.boolean().optional(),
//     sortBy: Joi.string().valid('id', 'rating', 'createdAt', 'reviewerName').default('createdAt'),
//     sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
//   }),

//   searchInternships: Joi.object({
//     q: Joi.string().optional(),
//     branchId: Joi.number().integer().positive().optional(),
//     domainId: Joi.number().integer().positive().optional(),
//     minRating: Joi.number().min(0).max(5).optional(),
//     maxPrice: Joi.number().min(0).optional(),
//     startDate: Joi.date().iso().optional(),
//     limit: Joi.number().integer().min(1).max(50).default(10),
//     page: Joi.number().integer().min(1).default(1)
//   })
// };

// Add this to your utils/validation.js file in the querySchemas section
// Replace the existing domainFilter and subDomainFilter schemas

const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().allow('').max(255).optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('ASC', 'DESC').optional()
  }),

  // FIXED: Properly allow search parameter for domains
  domainFilter: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().allow('').max(255).optional(),
    sortBy: Joi.string().valid('sortOrder', 'title', 'createdAt', 'updatedAt').optional(),
    sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
    isActive: Joi.string().valid('true', 'false').optional()
  }),

  // FIXED: Properly allow search parameter for subdomains
  subDomainFilter: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().allow('').max(255).optional(),
    sortBy: Joi.string().valid('sortOrder', 'title', 'level', 'createdAt', 'updatedAt').optional(),
    sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
    domainId: Joi.number().integer().positive().optional(),
    parentId: Joi.alternatives().try(
      Joi.number().integer().positive(),
      Joi.string().valid('null')
    ).optional(),
    isLeaf: Joi.string().valid('true', 'false').optional(),
    level: Joi.number().integer().positive().optional()
  }),

  // FIXED: Properly allow search parameter for projects
  projectFilter: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().allow('').max(255).optional(),
    sortBy: Joi.string().valid('title', 'createdAt', 'updatedAt', 'sortOrder').optional(),
    sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
    subDomainId: Joi.number().integer().positive().optional(),
    domainId: Joi.number().integer().positive().optional(),
    isActive: Joi.string().valid('true', 'false').optional(),
    isFeatured: Joi.string().valid('true', 'false').optional(),
    isArchived: Joi.string().valid('true', 'false').optional()
  }),

  leadFilter: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().allow('').max(255).optional(),
    sortBy: Joi.string().valid('name', 'email', 'createdAt', 'updatedAt').optional(),
    sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
    status: Joi.string().valid('new', 'contacted', 'converted', 'closed').optional(),
    projectId: Joi.number().integer().positive().optional(),
    domainId: Joi.number().integer().positive().optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional()
  })
};

// Parameter validation schemas
const paramSchemas = {
  id: Joi.object({
    id: Joi.number().integer().positive().required()
  }),

  branchId: Joi.object({
    branchId: Joi.number().integer().positive().required()
  }),

  domainId: Joi.object({
    domainId: Joi.number().integer().positive().required()
  }),

  internshipId: Joi.object({
    internshipId: Joi.number().integer().positive().required()
  }),

  subDomainId: Joi.object({
    subDomainId: Joi.number().integer().positive().required()
  }),

  projectId: Joi.object({
    projectId: Joi.number().integer().positive().required()
  }),

  leadId: Joi.object({
    leadId: Joi.number().integer().positive().required()
  }),

  entityParams: Joi.object({
    entityType: Joi.string().valid('domain', 'subdomain', 'project', 'branch', 'internshipDomain', 'internship', 'certificate').required(),
    entityId: Joi.number().integer().positive().required()
  })
};

// Validation middleware functions
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Query validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    req.query = value;
    next();
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Parameter validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

module.exports = {
  // Middleware functions
  validate,
  validateQuery,
  validateParams,
  
  // Existing schemas (Phase 1)
  authSchemas,
  domainSchemas,
  subDomainSchemas,
  projectSchemas,
  leadSchemas,
  imageSchemas,
  
  // New schemas (Phase 2)
  branchSchemas,
  internshipDomainSchemas,
  internshipSchemas,
  internshipLeadSchemas,
  ratingSchemas,
  
  // Query and parameter schemas
  querySchemas,
  paramSchemas
};



// const Joi = require('joi');

// // Domain validation schemas
// const domainSchemas = {
//   create: Joi.object({
//     title: Joi.string().min(2).max(200).required(),
//     description: Joi.string().allow('').max(2000).optional(),
//     isActive: Joi.boolean().optional(),
//     sortOrder: Joi.number().integer().min(0).optional()
//   }),

//   update: Joi.object({
//     title: Joi.string().min(2).max(200).optional(),
//     description: Joi.string().allow('').max(2000).optional(),
//     isActive: Joi.boolean().optional(),
//     sortOrder: Joi.number().integer().min(0).optional()
//   }).min(1)
// };

// // SubDomain validation schemas
// const subDomainSchemas = {
//   create: Joi.object({
//     title: Joi.string().min(2).max(200).required(),
//     description: Joi.string().allow('').max(2000).optional(),
//     domainId: Joi.number().integer().positive().required(),
//     parentId: Joi.number().integer().positive().allow(null).optional(),
//     isActive: Joi.boolean().optional(),
//     sortOrder: Joi.number().integer().min(0).optional()
//   }),

//   update: Joi.object({
//     title: Joi.string().min(2).max(200).optional(),
//     description: Joi.string().allow('').max(2000).optional(),
//     isActive: Joi.boolean().optional(),
//     sortOrder: Joi.number().integer().min(0).optional(),
//     parentId: Joi.number().integer().positive().allow(null).optional()
//   }).min(1)
// };

// console.log('🔍 SCHEMA DEBUG - SubDomain create schema allows:', 
//   Object.keys(subDomainSchemas.create.describe().keys));

// // Project validation schemas
// // const projectSchemas = {
// //   create: Joi.object({
// //     title: Joi.string().min(2).max(300).required(),
// //     abstract: Joi.string().min(10).required(),
// //     specifications: Joi.string().min(10).required(),
// //     learningOutcomes: Joi.string().min(10).required(),
// //     subDomainId: Joi.number().integer().positive().required(),
// //     isActive: Joi.boolean().optional(),
// //     isFeatured: Joi.boolean().optional(),
// //     sortOrder: Joi.number().integer().min(0).optional()
// //   }),

// //   update: Joi.object({
// //     title: Joi.string().min(2).max(300).optional(),
// //     abstract: Joi.string().min(10).optional(),
// //     specifications: Joi.string().min(10).optional(),
// //     learningOutcomes: Joi.string().min(10).optional(),
// //     isActive: Joi.boolean().optional(),
// //     isFeatured: Joi.boolean().optional(),
// //     sortOrder: Joi.number().integer().min(0).optional()
// //   }).min(1),

// //   move: Joi.object({
// //     newSubDomainId: Joi.number().integer().positive().required(),
// //     reason: Joi.string().max(500).optional()
// //   }),

// //   archive: Joi.object({
// //     archive: Joi.boolean().required(),
// //     reason: Joi.string().max(500).optional()
// //   }),

// //   bulkUpdate: Joi.object({
// //     projectIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
// //     updates: Joi.object({
// //       isActive: Joi.boolean().optional(),
// //       isFeatured: Joi.boolean().optional(),
// //       sortOrder: Joi.number().integer().min(0).optional()
// //     }).min(1).required()
// //   }),

// //   delete: Joi.object({
// //     confirm: Joi.boolean().valid(true).required()
// //   })
// // };


// const projectSchemas = {
//   create: Joi.object({
//     title: Joi.string().min(2).max(300).required(),
//     abstract: Joi.string().min(10).required(),
//     specifications: Joi.string().min(10).required(),
//     learningOutcomes: Joi.string().min(10).required(),
//     subDomainId: Joi.number().integer().positive().required(),
//     isActive: Joi.boolean().optional(),
//     isFeatured: Joi.boolean().optional(),
//     sortOrder: Joi.number().integer().min(0).optional(),
//     // ✅ ADD THIS: Allow slug as optional (backend will auto-generate if not provided)
//     slug: Joi.string().min(2).max(300).optional()
//   }),

//   update: Joi.object({
//     title: Joi.string().min(2).max(300).optional(),
//     abstract: Joi.string().min(10).optional(),
//     specifications: Joi.string().min(10).optional(),
//     learningOutcomes: Joi.string().min(10).optional(),
//     isActive: Joi.boolean().optional(),
//     isFeatured: Joi.boolean().optional(),
//     sortOrder: Joi.number().integer().min(0).optional(),
//     // ✅ ADD THIS: Allow slug in updates too
//     slug: Joi.string().min(2).max(300).optional()
//   }).min(1),

//   move: Joi.object({
//     newSubDomainId: Joi.number().integer().positive().required(),
//     reason: Joi.string().max(500).optional()
//   }),

//   archive: Joi.object({
//     archive: Joi.boolean().required(),
//     reason: Joi.string().max(500).optional()
//   }),

//   bulkUpdate: Joi.object({
//     projectIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
//     updates: Joi.object({
//       isActive: Joi.boolean().optional(),
//       isFeatured: Joi.boolean().optional(),
//       sortOrder: Joi.number().integer().min(0).optional()
//     }).min(1).required()
//   }),

//   delete: Joi.object({
//     confirm: Joi.boolean().valid(true).required()
//   })
// };


// // Contact form validation schemas
// const contactSchemas = {
//   submit: Joi.object({
//     fullName: Joi.string().min(2).max(100).required(),
//     email: Joi.string().email().required(),
//     phoneNumber: Joi.string().pattern(/^[+]?[\d\s\-\(\)]{10,15}$/).required(),
//     collegeName: Joi.string().min(2).max(200).required(),
//     branch: Joi.string().min(2).max(100).required(),
//     city: Joi.string().min(2).max(100).required(),
//     projectId: Joi.number().integer().positive().required(),
//     domainInterest: Joi.string().min(2).max(200).optional()
//   })
// };

// // Lead management validation schemas
// const leadSchemas = {
//   update: Joi.object({
//     status: Joi.string().valid('new', 'contacted', 'converted', 'closed').optional(),
//     notes: Joi.string().max(2000).allow('').optional()
//   }).min(1),

//   bulkUpdate: Joi.object({
//     leadIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
//     updates: Joi.object({
//       status: Joi.string().valid('new', 'contacted', 'converted', 'closed').optional(),
//       notes: Joi.string().max(2000).allow('').optional()
//     }).min(1).required()
//   })
// };

// // Image validation schemas
// const imageSchemas = {
//   upload: Joi.object({
//     entityType: Joi.string().valid('domain', 'subdomain', 'project').required(),
//     entityId: Joi.number().integer().positive().required(),
//     isMain: Joi.boolean().optional(),
//     alt: Joi.string().max(255).optional(),
//     caption: Joi.string().max(255).optional(),
//     sortOrder: Joi.number().integer().min(0).optional()
//   }),

//   update: Joi.object({
//     isMain: Joi.boolean().optional(),
//     alt: Joi.string().max(255).allow('').optional(),
//     caption: Joi.string().max(255).allow('').optional(),
//     sortOrder: Joi.number().integer().min(0).optional()
//   }).min(1),

//   reorder: Joi.object({
//     imageIds: Joi.array().items(Joi.number().integer().positive()).min(1).required()
//   })
// };

// // Query parameter validation schemas
// const querySchemas = {
//   pagination: Joi.object({
//     page: Joi.number().integer().min(1).optional(),
//     limit: Joi.number().integer().min(1).max(100).optional(),
//     search: Joi.string().allow('').max(255).optional(),
//     sortBy: Joi.string().optional(),
//     sortOrder: Joi.string().valid('ASC', 'DESC').optional()
//   }),

//   // domainFilter: Joi.object({
//   //   page: Joi.number().integer().min(1).optional(),
//   //   limit: Joi.number().integer().min(1).max(100).optional(),
//   //   search: Joi.string().allow('').max(255).optional(),
//   //   sortBy: Joi.string().valid('sortOrder', 'title', 'createdAt', 'updatedAt').optional(),
//   //   sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
//   //   isActive: Joi.string().valid('true', 'false').optional()
//   // }),

//   // subDomainFilter: Joi.object({
//   //   page: Joi.number().integer().min(1).optional(),
//   //   limit: Joi.number().integer().min(1).max(100).optional(),
//   //   search: Joi.string().allow('').max(255).optional(),
//   //   sortBy: Joi.string().valid('sortOrder', 'title', 'level', 'createdAt', 'updatedAt').optional(),
//   //   sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
//   //   domainId: Joi.number().integer().positive().optional(),
//   //   parentId: Joi.alternatives().try(
//   //     Joi.number().integer().positive(),
//   //     Joi.string().valid('null')
//   //   ).optional(),
//   //   isLeaf: Joi.string().valid('true', 'false').optional(),
//   //   level: Joi.number().integer().positive().optional()
//   // }),



//   domainFilter: Joi.object({
//     page: Joi.number().integer().min(1).optional(),
//     limit: Joi.number().integer().min(1).max(100).optional(),
//     search: Joi.string().allow('').max(255).optional(),
//     sortBy: Joi.string().valid('sortOrder', 'title', 'createdAt', 'updatedAt').optional(),
//     sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
//     isActive: Joi.string().valid('true', 'false').optional()
//     // Remove any 'id' field here
//   }),

//   subDomainFilter: Joi.object({
//     page: Joi.number().integer().min(1).optional(),
//     limit: Joi.number().integer().min(1).max(100).optional(),
//     search: Joi.string().allow('').max(255).optional(),
//     sortBy: Joi.string().valid('sortOrder', 'title', 'level', 'createdAt', 'updatedAt').optional(),
//     sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
//     domainId: Joi.number().integer().positive().optional(),
//     parentId: Joi.alternatives().try(
//       Joi.number().integer().positive(),
//       Joi.string().valid('null')
//     ).optional(),
//     isLeaf: Joi.string().valid('true', 'false').optional(),
//     level: Joi.number().integer().positive().optional()
//   }),
  

//   projectFilter: Joi.object({
//     page: Joi.number().integer().min(1).optional(),
//     limit: Joi.number().integer().min(1).max(100).optional(),
//     search: Joi.string().allow('').max(255).optional(),
//     sortBy: Joi.string().valid('sortOrder', 'title', 'isFeatured', 'viewCount', 'leadCount', 'createdAt', 'updatedAt').optional(),
//     sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
//     subDomainId: Joi.number().integer().positive().optional(),
//     domainId: Joi.number().integer().positive().optional(),
//     isActive: Joi.string().valid('true', 'false').optional(),
//     isFeatured: Joi.string().valid('true', 'false').optional(),
//     isArchived: Joi.string().valid('true', 'false').optional()
//   }),

//   leadFilter: Joi.object({
//     page: Joi.number().integer().min(1).optional(),
//     limit: Joi.number().integer().min(1).max(100).optional(),
//     search: Joi.string().allow('').max(255).optional(),
//     sortBy: Joi.string().valid('createdAt', 'updatedAt', 'fullName', 'status').optional(),
//     sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
//     status: Joi.string().valid('new', 'contacted', 'converted', 'closed').optional(),
//     projectId: Joi.number().integer().positive().optional(),
//     domainId: Joi.number().integer().positive().optional(),
//     dateFrom: Joi.date().optional(),
//     dateTo: Joi.date().optional()
//   })
// };

// // Custom validation middleware
// const validateQuery = (schema) => {
//   return (req, res, next) => {
//     const { error } = schema.validate(req.query);
//     if (error) {
//       const message = error.details.map(detail => detail.message).join(', ');
//       return res.status(400).json({
//         success: false,
//         message: `Query validation error: ${message}`
//       });
//     }
//     next();
//   };
// };

// const validateParams = (schema) => {
//   return (req, res, next) => {
//     const { error } = schema.validate(req.params);
//     if (error) {
//       const message = error.details.map(detail => detail.message).join(', ');
//       return res.status(400).json({
//         success: false,
//         message: `Parameter validation error: ${message}`
//       });
//     }
//     next();
//   };
// };

// // Parameter schemas
// const paramSchemas = {
//   id: Joi.object({
//     id: Joi.number().integer().positive().required()
//   }),
  
//   slug: Joi.object({
//     slug: Joi.string().min(1).max(255).required()
//   }),

//   domainId: Joi.object({
//     domainId: Joi.number().integer().positive().required()
//   }),

//   subDomainId: Joi.object({
//     subDomainId: Joi.number().integer().positive().required()
//   }),

//   projectId: Joi.object({
//     projectId: Joi.number().integer().positive().required()
//   })
// };

// module.exports = {
//   domainSchemas,
//   subDomainSchemas,
//   projectSchemas,
//   contactSchemas,
//   leadSchemas,
//   imageSchemas,
//   querySchemas,
//   paramSchemas,
//   validateQuery,
//   validateParams
// };