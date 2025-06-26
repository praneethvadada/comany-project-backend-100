const Joi = require('joi');

// Domain validation schemas
const domainSchemas = {
  create: Joi.object({
    title: Joi.string().min(2).max(200).required(),
    description: Joi.string().allow('').max(2000).optional(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }),

  update: Joi.object({
    title: Joi.string().min(2).max(200).optional(),
    description: Joi.string().allow('').max(2000).optional(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }).min(1)
};

// SubDomain validation schemas
const subDomainSchemas = {
  create: Joi.object({
    title: Joi.string().min(2).max(200).required(),
    description: Joi.string().allow('').max(2000).optional(),
    domainId: Joi.number().integer().positive().required(),
    parentId: Joi.number().integer().positive().allow(null).optional(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }),

  update: Joi.object({
    title: Joi.string().min(2).max(200).optional(),
    description: Joi.string().allow('').max(2000).optional(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional(),
    parentId: Joi.number().integer().positive().allow(null).optional()
  }).min(1)
};

console.log('🔍 SCHEMA DEBUG - SubDomain create schema allows:', 
  Object.keys(subDomainSchemas.create.describe().keys));

// Project validation schemas
// const projectSchemas = {
//   create: Joi.object({
//     title: Joi.string().min(2).max(300).required(),
//     abstract: Joi.string().min(10).required(),
//     specifications: Joi.string().min(10).required(),
//     learningOutcomes: Joi.string().min(10).required(),
//     subDomainId: Joi.number().integer().positive().required(),
//     isActive: Joi.boolean().optional(),
//     isFeatured: Joi.boolean().optional(),
//     sortOrder: Joi.number().integer().min(0).optional()
//   }),

//   update: Joi.object({
//     title: Joi.string().min(2).max(300).optional(),
//     abstract: Joi.string().min(10).optional(),
//     specifications: Joi.string().min(10).optional(),
//     learningOutcomes: Joi.string().min(10).optional(),
//     isActive: Joi.boolean().optional(),
//     isFeatured: Joi.boolean().optional(),
//     sortOrder: Joi.number().integer().min(0).optional()
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


const projectSchemas = {
  create: Joi.object({
    title: Joi.string().min(2).max(300).required(),
    abstract: Joi.string().min(10).required(),
    specifications: Joi.string().min(10).required(),
    learningOutcomes: Joi.string().min(10).required(),
    subDomainId: Joi.number().integer().positive().required(),
    isActive: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional(),
    // ✅ ADD THIS: Allow slug as optional (backend will auto-generate if not provided)
    slug: Joi.string().min(2).max(300).optional()
  }),

  update: Joi.object({
    title: Joi.string().min(2).max(300).optional(),
    abstract: Joi.string().min(10).optional(),
    specifications: Joi.string().min(10).optional(),
    learningOutcomes: Joi.string().min(10).optional(),
    isActive: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional(),
    // ✅ ADD THIS: Allow slug in updates too
    slug: Joi.string().min(2).max(300).optional()
  }).min(1),

  move: Joi.object({
    newSubDomainId: Joi.number().integer().positive().required(),
    reason: Joi.string().max(500).optional()
  }),

  archive: Joi.object({
    archive: Joi.boolean().required(),
    reason: Joi.string().max(500).optional()
  }),

  bulkUpdate: Joi.object({
    projectIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
    updates: Joi.object({
      isActive: Joi.boolean().optional(),
      isFeatured: Joi.boolean().optional(),
      sortOrder: Joi.number().integer().min(0).optional()
    }).min(1).required()
  }),

  delete: Joi.object({
    confirm: Joi.boolean().valid(true).required()
  })
};


// Contact form validation schemas
const contactSchemas = {
  submit: Joi.object({
    fullName: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().pattern(/^[+]?[\d\s\-\(\)]{10,15}$/).required(),
    collegeName: Joi.string().min(2).max(200).required(),
    branch: Joi.string().min(2).max(100).required(),
    city: Joi.string().min(2).max(100).required(),
    projectId: Joi.number().integer().positive().required(),
    domainInterest: Joi.string().min(2).max(200).optional()
  })
};

// Lead management validation schemas
const leadSchemas = {
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
    entityType: Joi.string().valid('domain', 'subdomain', 'project').required(),
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

// Query parameter validation schemas
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().allow('').max(255).optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('ASC', 'DESC').optional()
  }),

  // domainFilter: Joi.object({
  //   page: Joi.number().integer().min(1).optional(),
  //   limit: Joi.number().integer().min(1).max(100).optional(),
  //   search: Joi.string().allow('').max(255).optional(),
  //   sortBy: Joi.string().valid('sortOrder', 'title', 'createdAt', 'updatedAt').optional(),
  //   sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
  //   isActive: Joi.string().valid('true', 'false').optional()
  // }),

  // subDomainFilter: Joi.object({
  //   page: Joi.number().integer().min(1).optional(),
  //   limit: Joi.number().integer().min(1).max(100).optional(),
  //   search: Joi.string().allow('').max(255).optional(),
  //   sortBy: Joi.string().valid('sortOrder', 'title', 'level', 'createdAt', 'updatedAt').optional(),
  //   sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
  //   domainId: Joi.number().integer().positive().optional(),
  //   parentId: Joi.alternatives().try(
  //     Joi.number().integer().positive(),
  //     Joi.string().valid('null')
  //   ).optional(),
  //   isLeaf: Joi.string().valid('true', 'false').optional(),
  //   level: Joi.number().integer().positive().optional()
  // }),



  domainFilter: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().allow('').max(255).optional(),
    sortBy: Joi.string().valid('sortOrder', 'title', 'createdAt', 'updatedAt').optional(),
    sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
    isActive: Joi.string().valid('true', 'false').optional()
    // Remove any 'id' field here
  }),

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
  

  projectFilter: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().allow('').max(255).optional(),
    sortBy: Joi.string().valid('sortOrder', 'title', 'isFeatured', 'viewCount', 'leadCount', 'createdAt', 'updatedAt').optional(),
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
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'fullName', 'status').optional(),
    sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
    status: Joi.string().valid('new', 'contacted', 'converted', 'closed').optional(),
    projectId: Joi.number().integer().positive().optional(),
    domainId: Joi.number().integer().positive().optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional()
  })
};

// Custom validation middleware
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: `Query validation error: ${message}`
      });
    }
    next();
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params);
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: `Parameter validation error: ${message}`
      });
    }
    next();
  };
};

// Parameter schemas
const paramSchemas = {
  id: Joi.object({
    id: Joi.number().integer().positive().required()
  }),
  
  slug: Joi.object({
    slug: Joi.string().min(1).max(255).required()
  }),

  domainId: Joi.object({
    domainId: Joi.number().integer().positive().required()
  }),

  subDomainId: Joi.object({
    subDomainId: Joi.number().integer().positive().required()
  }),

  projectId: Joi.object({
    projectId: Joi.number().integer().positive().required()
  })
};

module.exports = {
  domainSchemas,
  subDomainSchemas,
  projectSchemas,
  contactSchemas,
  leadSchemas,
  imageSchemas,
  querySchemas,
  paramSchemas,
  validateQuery,
  validateParams
};