// controllers/branchController.js
const { Branch, InternshipDomain, Internship, Image } = require('../models');
const { sendSuccess, sendError, sendBadRequest, sendNotFound, sendServerError } = require('../utils/responseHelper');
const { Op } = require('sequelize');

class BranchController {
  // Add this new method to branchController
async getBranchStructure(req, res) {
  try {
    const { id } = req.params;
    
    const branch = await Branch.findByPk(id);
    if (!branch) {
      return sendNotFound(res, 'Branch not found');
    }

    let response = {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      hasDomains: branch.hasDomains
    };

    if (branch.hasDomains) {
      // Get domains with internship counts
      const domains = await InternshipDomain.findAll({
        where: { branchId: id },
        include: [
          {
            model: Internship,
            as: 'internships',
            attributes: ['id'],
            where: { isActive: true },
            required: false
          }
        ]
      });
      
      response.domains = domains.map(domain => ({
        id: domain.id,
        name: domain.name,
        description: domain.description,
        internshipCount: domain.internships ? domain.internships.length : 0
      }));
    } else {
      // Get direct internships count
      const internshipCount = await Internship.count({
        where: { 
          branchId: id,
          internshipDomainId: null,
          isActive: true
        }
      });
      
      response.directInternshipCount = internshipCount;
    }

    sendSuccess(res, 'Branch structure fetched successfully', response);
  } catch (error) {
    console.error('BranchController: Get branch structure error:', error);
    sendServerError(res, 'Failed to fetch branch structure');
  }
}


  // Get all branches with optional filters
  async getAllBranches(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search, 
        isActive,
        sortBy = 'sortOrder',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};

      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { code: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }

      const { count, rows: branches } = await Branch.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: InternshipDomain,
            as: 'internshipDomains',
            attributes: ['id', 'name', 'isActive'],
            include: [
              {
                model: Internship,
                as: 'internships',
                attributes: ['id'],
                required: false
              }
            ]
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'branch' },
            order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
          }
        ],
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      });

      // Add domain and internship counts
      const branchesWithCounts = branches.map(branch => {
        const branchData = branch.toJSON();
        branchData.domainCount = branchData.internshipDomains?.length || 0;
        branchData.internshipCount = branchData.internshipDomains?.reduce((total, domain) => {
          return total + (domain.internships?.length || 0);
        }, 0) || 0;
        return branchData;
      });

      const totalPages = Math.ceil(count / limit);

      sendSuccess(res, 'Branches fetched successfully', {
        branches: branchesWithCounts,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('BranchController: Get branches error:', error);
      sendServerError(res, 'Failed to fetch branches');
    }
  }

  // Get branch by ID
  async getBranchById(req, res) {
    try {
      const { id } = req.params;
      
      const branch = await Branch.findByPk(id, {
        include: [
          {
            model: InternshipDomain,
            as: 'internshipDomains',
            include: [
              {
                model: Internship,
                as: 'internships',
                where: { isActive: true },
                required: false
              }
            ]
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'branch' },
            order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
          }
        ]
      });

      if (!branch) {
        return sendNotFound(res, 'Branch not found');
      }

      sendSuccess(res, 'Branch fetched successfully', branch);
    } catch (error) {
      console.error('BranchController: Get branch error:', error);
      sendServerError(res, 'Failed to fetch branch');
    }
  }

  // Create new branch
  // async createBranch(req, res) {
  //   try {
  //     const { name, code, description, isActive = true, sortOrder = 0 } = req.body;

  //     // Check if branch with same code exists
  //     const existingBranch = await Branch.findOne({ where: { code } });
  //     if (existingBranch) {
  //       return sendBadRequest(res, 'Branch with this code already exists');
  //     }

  //     const branch = await Branch.create({
  //       name,
  //       code: code.toUpperCase(),
  //       description,
  //       isActive,
  //       sortOrder
  //     });

  //     sendSuccess(res, 'Branch created successfully', branch, 201);
  //   } catch (error) {
  //     console.error('BranchController: Create branch error:', error);
  //     sendServerError(res, 'Failed to create branch');
  //   }
  // }

  // REPLACE this method in your controllers/branchController.js
async createBranch(req, res) {
  try {
    const { name, code, description, isActive = true, sortOrder = 0 } = req.body;

    console.log('🏢 BRANCH CREATE - Input data:', { name, code, description, isActive, sortOrder });

    // Check if branch with same code exists
    const existingBranch = await Branch.findOne({ where: { code: code.toUpperCase() } });
    if (existingBranch) {
      return sendBadRequest(res, 'Branch with this code already exists');
    }

    // ✅ MANUALLY GENERATE SLUG (since hook isn't working)
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')           // Remove special characters except hyphens and underscores
      .replace(/[\s_-]+/g, '-')           // Replace spaces, underscores, and multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '');           // Remove leading and trailing hyphens

    console.log('🔗 BRANCH CREATE - Generated slug:', slug, 'from name:', name);

    const branch = await Branch.create({
      name,
      code: code.toUpperCase(),
      description,
      slug,                               // ✅ EXPLICITLY SET SLUG
      isActive,
      sortOrder
    });

    console.log('✅ BRANCH CREATE - Success:', branch.toJSON());
    sendSuccess(res, 'Branch created successfully', branch, 201);
  } catch (error) {
    console.error('❌ BRANCH CREATE - Error:', error);
    sendServerError(res, 'Failed to create branch');
  }
}

  // Update branch
  async updateBranch(req, res) {
    try {
      const { id } = req.params;
      const { name, code, description, isActive, sortOrder } = req.body;

      const branch = await Branch.findByPk(id);
      if (!branch) {
        return sendNotFound(res, 'Branch not found');
      }

      // Check if code is being changed and already exists
      if (code && code !== branch.code) {
        const existingBranch = await Branch.findOne({ 
          where: { 
            code: code.toUpperCase(),
            id: { [Op.ne]: id }
          } 
        });
        if (existingBranch) {
          return sendBadRequest(res, 'Branch with this code already exists');
        }
      }

      await branch.update({
        name: name || branch.name,
        code: code ? code.toUpperCase() : branch.code,
        description: description !== undefined ? description : branch.description,
        isActive: isActive !== undefined ? isActive : branch.isActive,
        sortOrder: sortOrder !== undefined ? sortOrder : branch.sortOrder
      });

      sendSuccess(res, 'Branch updated successfully', branch);
    } catch (error) {
      console.error('BranchController: Update branch error:', error);
      sendServerError(res, 'Failed to update branch');
    }
  }

  // Delete branch
  async deleteBranch(req, res) {
    try {
      const { id } = req.params;

      const branch = await Branch.findByPk(id, {
        include: [
          {
            model: InternshipDomain,
            as: 'internshipDomains'
          }
        ]
      });

      if (!branch) {
        return sendNotFound(res, 'Branch not found');
      }

      // Check if branch has domains
      if (branch.internshipDomains && branch.internshipDomains.length > 0) {
        return sendBadRequest(res, 'Cannot delete branch with existing domains');
      }

      await branch.destroy();
      sendSuccess(res, 'Branch deleted successfully');
    } catch (error) {
      console.error('BranchController: Delete branch error:', error);
      sendServerError(res, 'Failed to delete branch');
    }
  }

  // Get branch stats
  async getBranchStats(req, res) {
    try {
      const stats = await Branch.findAll({
        attributes: [
          'id',
          'name',
          'code',
          'isActive'
        ],
        include: [
          {
            model: InternshipDomain,
            as: 'internshipDomains',
            attributes: ['id'],
            include: [
              {
                model: Internship,
                as: 'internships',
                attributes: ['id', 'isActive', 'currentLearners']
              }
            ]
          }
        ]
      });

      const statsData = stats.map(branch => {
        const branchData = branch.toJSON();
        const domains = branchData.internshipDomains || [];
        const allInternships = domains.flatMap(domain => domain.internships || []);
        
        return {
          id: branchData.id,
          name: branchData.name,
          code: branchData.code,
          isActive: branchData.isActive,
          domainCount: domains.length,
          internshipCount: allInternships.length,
          activeInternshipCount: allInternships.filter(i => i.isActive).length,
          totalLearners: allInternships.reduce((sum, i) => sum + (i.currentLearners || 0), 0)
        };
      });

      sendSuccess(res, 'Branch stats fetched successfully', {
        branches: statsData,
        summary: {
          totalBranches: stats.length,
          activeBranches: stats.filter(b => b.isActive).length,
          totalDomains: statsData.reduce((sum, b) => sum + b.domainCount, 0),
          totalInternships: statsData.reduce((sum, b) => sum + b.internshipCount, 0),
          totalLearners: statsData.reduce((sum, b) => sum + b.totalLearners, 0)
        }
      });
    } catch (error) {
      console.error('BranchController: Get branch stats error:', error);
      sendServerError(res, 'Failed to fetch branch stats');
    }
  }
}

module.exports = new BranchController();

