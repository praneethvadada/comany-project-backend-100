// utils/internshipValidation.js - Additional Parameter Schemas for Internships
const Joi = require('joi');

// Additional parameter schemas for internship system
const internshipParamSchemas = {
  branchId: Joi.object({
    branchId: Joi.number().integer().positive().required()
  }),

  internshipId: Joi.object({
    internshipId: Joi.number().integer().positive().required()
  }),

  internshipDomainId: Joi.object({
    internshipDomainId: Joi.number().integer().positive().required()
  }),

  leadId: Joi.object({
    leadId: Joi.number().integer().positive().required()
  }),

  ratingId: Joi.object({
    ratingId: Joi.number().integer().positive().required()
  })
};

// Basic validation schemas for internship data
const internshipSchemas = {
  createBranch: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    code: Joi.string().min(2).max(20).required(),
    description: Joi.string().allow('').optional(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }),

  createInternshipDomain: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().allow('').optional(),
    branchId: Joi.number().integer().positive().required(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional()
  }),

  createInternship: Joi.object({
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

  createInternshipLead: Joi.object({
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

  createRating: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    review: Joi.string().max(2000).optional(),
    reviewerName: Joi.string().min(2).max(100).required(),
    reviewerEmail: Joi.string().email().required(),
    reviewerDesignation: Joi.string().max(100).optional(),
    reviewerCompany: Joi.string().max(100).optional(),
    internshipId: Joi.number().integer().positive().required(),
    internshipLeadId: Joi.number().integer().positive().optional()
  })
};

module.exports = {
  internshipParamSchemas,
  internshipSchemas
};