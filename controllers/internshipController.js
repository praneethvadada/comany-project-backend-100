// controllers/internshipController.js
const { Internship, InternshipDomain, Branch, InternshipLead, Rating, Image } = require('../models');
const { sendSuccess, sendError, sendBadRequest, sendNotFound, sendServerError } = require('../utils/responseHelper');
const { Op } = require('sequelize');

class InternshipController {

  // Add this method to internshipController
async getInternshipsByBranch(req, res) {
  try {
    const { branchId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      return sendNotFound(res, 'Branch not found');
    }

    const offset = (page - 1) * limit;

    if (branch.hasDomains) {
      // Return domains with their internships
      const domains = await InternshipDomain.findAll({
        where: { branchId },
        include: [
          {
            model: Internship,
            as: 'internships',
            where: { isActive: true },
            required: false,
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        ],
        order: [['sortOrder', 'ASC'], ['name', 'ASC']]
      });

      sendSuccess(res, 'Branch domains and internships fetched successfully', {
        branchType: 'withDomains',
        branch: {
          id: branch.id,
          name: branch.name,
          code: branch.code
        },
        domains
      });
    } else {
      // Return internships directly
      const { count, rows: internships } = await Internship.findAndCountAll({
        where: { 
          branchId,
          internshipDomainId: null,
          isActive: true
        },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']]
      });

      const totalPages = Math.ceil(count / limit);

      sendSuccess(res, 'Branch internships fetched successfully', {
        branchType: 'directInternships',
        branch: {
          id: branch.id,
          name: branch.name,
          code: branch.code
        },
        internships,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      });
    }
  } catch (error) {
    console.error('InternshipController: Get internships by branch error:', error);
    sendServerError(res, 'Failed to fetch branch internships');
  }
}

// Update the existing createInternship method
async createInternship(req, res) {
  try {
    const {
      title,
      description,
      shortDescription,
      learningOutcomes,
      topBenefits,
      realTimeProjects,
      startDate,
      endDate,
      duration,
      price,
      originalPrice,
      maxLearners,
      prerequisites,
      branchId,          // ✅ Add branchId as required
      internshipDomainId, // ✅ Make this optional
      isActive = true,
      isFeatured = false,
      isComingSoon = false,
      sortOrder = 0
    } = req.body;

    // Check if branch exists
    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      return sendBadRequest(res, 'Branch not found');
    }

    // Validate domain logic
    if (branch.hasDomains) {
      // Branch uses domains - domain is required
      if (!internshipDomainId) {
        return sendBadRequest(res, 'Internship domain is required for this branch');
      }
      
      const domain = await InternshipDomain.findByPk(internshipDomainId);
      if (!domain || domain.branchId !== parseInt(branchId)) {
        return sendBadRequest(res, 'Invalid internship domain for this branch');
      }
    } else {
      // Branch doesn't use domains - domain should be null
      if (internshipDomainId) {
        return sendBadRequest(res, 'This branch does not use domains. Remove internshipDomainId');
      }
    }

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return sendBadRequest(res, 'End date must be after start date');
    }

    const internship = await Internship.create({
      title,
      description,
      shortDescription,
      learningOutcomes,
      topBenefits,
      realTimeProjects,
      startDate,
      endDate,
      duration,
      price,
      originalPrice,
      maxLearners,
      prerequisites,
      branchId,                    // ✅ Always set branchId
      internshipDomainId: internshipDomainId || null, // ✅ Null for direct branch internships
      isActive,
      isFeatured,
      isComingSoon,
      sortOrder
    });

    // Fetch with relationships
    const internshipWithDetails = await Internship.findByPk(internship.id, {
      include: [
        {
          model: InternshipDomain,
          as: 'internshipDomain',
          required: false,
          include: [
            {
              model: Branch,
              as: 'branch'
            }
          ]
        },
        {
          model: Branch,
          as: 'branch'  // ✅ Add direct branch relationship
        }
      ]
    });

    sendSuccess(res, 'Internship created successfully', internshipWithDetails, 201);
  } catch (error) {
    console.error('InternshipController: Create internship error:', error);
    sendServerError(res, 'Failed to create internship');
  }
}

  // Get all internships with pagination and filtering
  async getAllInternships(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search, 
        branchId,
        internshipDomainId,
        isActive,
        isFeatured,
        isComingSoon,
        sortBy = 'sortOrder',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};
      const includeWhere = {};

      if (search) {
        whereClause[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { shortDescription: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      if (internshipDomainId) {
        whereClause.internshipDomainId = internshipDomainId;
      }

      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }

      if (isFeatured !== undefined) {
        whereClause.isFeatured = isFeatured === 'true';
      }

      if (isComingSoon !== undefined) {
        whereClause.isComingSoon = isComingSoon === 'true';
      }

      if (branchId) {
        includeWhere.branchId = branchId;
      }

      const { count, rows: internships } = await Internship.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: InternshipDomain,
            as: 'internshipDomain',
            ...(Object.keys(includeWhere).length > 0 ? { where: includeWhere } : {}),
            include: [
              {
                model: Branch,
                as: 'branch',
                attributes: ['id', 'name', 'code']
              }
            ]
          },
          {
            model: InternshipLead,
            as: 'internshipLeads',
            attributes: ['id', 'status'],
            required: false
          },
          {
            model: Rating,
            as: 'ratings',
            attributes: ['id', 'rating', 'isApproved'],
            where: { isApproved: true },
            required: false
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'internship' },
            order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
          },
          {
            model: Image,
            as: 'certificateImages',
            required: false,
            where: { entityType: 'certificate' },
            order: [['sortOrder', 'ASC']]
          }
        ],
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      });

      // Add lead counts and enrollment stats
      const internshipsWithStats = internships.map(internship => {
        const internshipData = internship.toJSON();
        internshipData.leadCount = internshipData.internshipLeads?.length || 0;
        internshipData.enrolledCount = internshipData.internshipLeads?.filter(lead => lead.status === 'enrolled').length || 0;
        internshipData.newLeadCount = internshipData.internshipLeads?.filter(lead => lead.status === 'new').length || 0;
        internshipData.ratingCount = internshipData.ratings?.length || 0;
        
        // Calculate average rating
        if (internshipData.ratings && internshipData.ratings.length > 0) {
          const totalRating = internshipData.ratings.reduce((sum, rating) => sum + rating.rating, 0);
          internshipData.calculatedAverageRating = (totalRating / internshipData.ratings.length).toFixed(2);
        } else {
          internshipData.calculatedAverageRating = 0;
        }
        
        return internshipData;
      });

      const totalPages = Math.ceil(count / limit);

      sendSuccess(res, 'Internships fetched successfully', {
        internships: internshipsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('InternshipController: Get internships error:', error);
      sendServerError(res, 'Failed to fetch internships');
    }
  }

  // Get internship by ID
  async getInternshipById(req, res) {
    try {
      const { id } = req.params;
      
      const internship = await Internship.findByPk(id, {
        include: [
          {
            model: InternshipDomain,
            as: 'internshipDomain',
            include: [
              {
                model: Branch,
                as: 'branch'
              }
            ]
          },
          {
            model: InternshipLead,
            as: 'internshipLeads',
            attributes: ['id', 'status', 'enrollmentDate', 'completionDate']
          },
          {
            model: Rating,
            as: 'ratings',
            where: { isApproved: true, isPublic: true },
            required: false,
            order: [['isFeatured', 'DESC'], ['createdAt', 'DESC']]
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'internship' },
            order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
          },
          {
            model: Image,
            as: 'certificateImages',
            required: false,
            where: { entityType: 'certificate' },
            order: [['sortOrder', 'ASC']]
          }
        ]
      });

      if (!internship) {
        return sendNotFound(res, 'Internship not found');
      }

      // Increment view count
      await internship.increment('viewCount');

      sendSuccess(res, 'Internship fetched successfully', internship);
    } catch (error) {
      console.error('InternshipController: Get internship error:', error);
      sendServerError(res, 'Failed to fetch internship');
    }
  }

  // Get internships by domain
  async getInternshipsByDomain(req, res) {
    try {
      const { domainId } = req.params;
      const { isActive = true, limit = 10, page = 1 } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = { internshipDomainId: domainId };
      
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }

      const internships = await Internship.findAll({
        where: whereClause,
        include: [
          {
            model: InternshipDomain,
            as: 'internshipDomain',
            include: [
              {
                model: Branch,
                as: 'branch',
                attributes: ['id', 'name', 'code']
              }
            ]
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'internship', isMain: true },
            limit: 1
          }
        ],
        order: [['isFeatured', 'DESC'], ['sortOrder', 'ASC'], ['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      sendSuccess(res, 'Domain internships fetched successfully', internships);
    } catch (error) {
      console.error('InternshipController: Get domain internships error:', error);
      sendServerError(res, 'Failed to fetch domain internships');
    }
  }

  // Create new internship
  async createInternship(req, res) {
    try {
      const {
        title,
        description,
        shortDescription,
        learningOutcomes,
        topBenefits,
        realTimeProjects,
        startDate,
        endDate,
        duration,
        price,
        originalPrice,
        maxLearners,
        prerequisites,
        internshipDomainId,
        isActive = true,
        isFeatured = false,
        isComingSoon = false,
        sortOrder = 0
      } = req.body;

      // Check if internship domain exists
      const domain = await InternshipDomain.findByPk(internshipDomainId);
      if (!domain) {
        return sendBadRequest(res, 'Internship domain not found');
      }

      // Validate dates
      if (new Date(startDate) >= new Date(endDate)) {
        return sendBadRequest(res, 'End date must be after start date');
      }

      const internship = await Internship.create({
        title,
        description,
        shortDescription,
        learningOutcomes,
        topBenefits,
        realTimeProjects,
        startDate,
        endDate,
        duration,
        price,
        originalPrice,
        maxLearners,
        prerequisites,
        internshipDomainId,
        isActive,
        isFeatured,
        isComingSoon,
        sortOrder
      });

      const internshipWithDetails = await Internship.findByPk(internship.id, {
        include: [
          {
            model: InternshipDomain,
            as: 'internshipDomain',
            include: [
              {
                model: Branch,
                as: 'branch'
              }
            ]
          }
        ]
      });

      sendSuccess(res, 'Internship created successfully', internshipWithDetails, 201);
    } catch (error) {
      console.error('InternshipController: Create internship error:', error);
      sendServerError(res, 'Failed to create internship');
    }
  }

  // Update internship
  async updateInternship(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const internship = await Internship.findByPk(id);
      if (!internship) {
        return sendNotFound(res, 'Internship not found');
      }

      // Check if internship domain exists (if being changed)
      if (updateData.internshipDomainId && updateData.internshipDomainId !== internship.internshipDomainId) {
        const domain = await InternshipDomain.findByPk(updateData.internshipDomainId);
        if (!domain) {
          return sendBadRequest(res, 'Internship domain not found');
        }
      }

      // Validate dates if being changed
      const newStartDate = updateData.startDate || internship.startDate;
      const newEndDate = updateData.endDate || internship.endDate;
      if (new Date(newStartDate) >= new Date(newEndDate)) {
        return sendBadRequest(res, 'End date must be after start date');
      }

      await internship.update(updateData);

      const updatedInternship = await Internship.findByPk(id, {
        include: [
          {
            model: InternshipDomain,
            as: 'internshipDomain',
            include: [
              {
                model: Branch,
                as: 'branch'
              }
            ]
          }
        ]
      });

      sendSuccess(res, 'Internship updated successfully', updatedInternship);
    } catch (error) {
      console.error('InternshipController: Update internship error:', error);
      sendServerError(res, 'Failed to update internship');
    }
  }

  // Delete internship
  async deleteInternship(req, res) {
    try {
      const { id } = req.params;

      const internship = await Internship.findByPk(id, {
        include: [
          {
            model: InternshipLead,
            as: 'internshipLeads'
          }
        ]
      });

      if (!internship) {
        return sendNotFound(res, 'Internship not found');
      }

      // Check if internship has enrolled students
      const enrolledLeads = internship.internshipLeads?.filter(lead => 
        ['enrolled', 'completed'].includes(lead.status)
      ) || [];

      if (enrolledLeads.length > 0) {
        return sendBadRequest(res, 'Cannot delete internship with enrolled students');
      }

      await internship.destroy();
      sendSuccess(res, 'Internship deleted successfully');
    } catch (error) {
      console.error('InternshipController: Delete internship error:', error);
      sendServerError(res, 'Failed to delete internship');
    }
  }

  // Get internship stats
  async getInternshipStats(req, res) {
    try {
      const { id } = req.params;

      const internship = await Internship.findByPk(id, {
        include: [
          {
            model: InternshipLead,
            as: 'internshipLeads',
            attributes: ['id', 'status', 'createdAt']
          },
          {
            model: Rating,
            as: 'ratings',
            attributes: ['id', 'rating', 'isApproved']
          }
        ]
      });

      if (!internship) {
        return sendNotFound(res, 'Internship not found');
      }

      const leads = internship.internshipLeads || [];
      const ratings = internship.ratings || [];

      const stats = {
        basic: {
          title: internship.title,
          viewCount: internship.viewCount,
          enrollmentCount: internship.enrollmentCount,
          currentLearners: internship.currentLearners,
          maxLearners: internship.maxLearners
        },
        leads: {
          total: leads.length,
          new: leads.filter(l => l.status === 'new').length,
          contacted: leads.filter(l => l.status === 'contacted').length,
          enrolled: leads.filter(l => l.status === 'enrolled').length,
          completed: leads.filter(l => l.status === 'completed').length,
          cancelled: leads.filter(l => l.status === 'cancelled').length,
          rejected: leads.filter(l => l.status === 'rejected').length
        },
        ratings: {
          total: ratings.length,
          approved: ratings.filter(r => r.isApproved).length,
          pending: ratings.filter(r => !r.isApproved).length,
          averageRating: internship.averageRating,
          ratingDistribution: {
            5: ratings.filter(r => r.rating === 5).length,
            4: ratings.filter(r => r.rating === 4).length,
            3: ratings.filter(r => r.rating === 3).length,
            2: ratings.filter(r => r.rating === 2).length,
            1: ratings.filter(r => r.rating === 1).length
          }
        },
        timeline: {
          startDate: internship.startDate,
          endDate: internship.endDate,
          duration: internship.duration,
          daysRemaining: Math.max(0, Math.ceil((new Date(internship.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
        }
      };

      sendSuccess(res, 'Internship stats fetched successfully', stats);
    } catch (error) {
      console.error('InternshipController: Get internship stats error:', error);
      sendServerError(res, 'Failed to fetch internship stats');
    }
  }

  // Get featured internships
  async getFeaturedInternships(req, res) {
    try {
      const { limit = 6 } = req.query;

      const internships = await Internship.findAll({
        where: {
          isActive: true,
          isFeatured: true
        },
        include: [
          {
            model: InternshipDomain,
            as: 'internshipDomain',
            include: [
              {
                model: Branch,
                as: 'branch',
                attributes: ['id', 'name', 'code']
              }
            ]
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'internship', isMain: true },
            limit: 1
          }
        ],
        order: [['sortOrder', 'ASC'], ['averageRating', 'DESC'], ['createdAt', 'DESC']],
        limit: parseInt(limit)
      });

      sendSuccess(res, 'Featured internships fetched successfully', internships);
    } catch (error) {
      console.error('InternshipController: Get featured internships error:', error);
      sendServerError(res, 'Failed to fetch featured internships');
    }
  }

  // Get top rated internships
  async getTopRatedInternships(req, res) {
    try {
      const { limit = 6 } = req.query;

      const internships = await Internship.findAll({
        where: {
          isActive: true,
          averageRating: { [Op.gte]: 4.0 },
          totalRatings: { [Op.gte]: 5 }
        },
        include: [
          {
            model: InternshipDomain,
            as: 'internshipDomain',
            include: [
              {
                model: Branch,
                as: 'branch',
                attributes: ['id', 'name', 'code']
              }
            ]
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'internship', isMain: true },
            limit: 1
          }
        ],
        order: [['averageRating', 'DESC'], ['totalRatings', 'DESC'], ['createdAt', 'DESC']],
        limit: parseInt(limit)
      });

      sendSuccess(res, 'Top rated internships fetched successfully', internships);
    } catch (error) {
      console.error('InternshipController: Get top rated internships error:', error);
      sendServerError(res, 'Failed to fetch top rated internships');
    }
  }

  // Search internships
  async searchInternships(req, res) {
    try {
      const { 
        q: searchQuery, 
        branchId, 
        domainId, 
        minRating, 
        maxPrice,
        startDate,
        limit = 10,
        page = 1 
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = { isActive: true };
      const includeWhere = {};

      if (searchQuery) {
        whereClause[Op.or] = [
          { title: { [Op.like]: `%${searchQuery}%` } },
          { shortDescription: { [Op.like]: `%${searchQuery}%` } },
          { description: { [Op.like]: `%${searchQuery}%` } },
          { learningOutcomes: { [Op.like]: `%${searchQuery}%` } }
        ];
      }

      if (domainId) {
        whereClause.internshipDomainId = domainId;
      }

      if (minRating) {
        whereClause.averageRating = { [Op.gte]: parseFloat(minRating) };
      }

      if (maxPrice) {
        whereClause.price = { [Op.lte]: parseFloat(maxPrice) };
      }

      if (startDate) {
        whereClause.startDate = { [Op.gte]: new Date(startDate) };
      }

      if (branchId) {
        includeWhere.branchId = branchId;
      }

      const internships = await Internship.findAll({
        where: whereClause,
        include: [
          {
            model: InternshipDomain,
            as: 'internshipDomain',
            ...(Object.keys(includeWhere).length > 0 ? { where: includeWhere } : {}),
            include: [
              {
                model: Branch,
                as: 'branch',
                attributes: ['id', 'name', 'code']
              }
            ]
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'internship', isMain: true },
            limit: 1
          }
        ],
        order: [['averageRating', 'DESC'], ['currentLearners', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      sendSuccess(res, 'Search results fetched successfully', {
        internships,
        searchQuery,
        totalResults: internships.length
      });
    } catch (error) {
      console.error('InternshipController: Search internships error:', error);
      sendServerError(res, 'Failed to search internships');
    }
  }
}

module.exports = new InternshipController();