// controllers/internshipDomainController.js
const { InternshipDomain, Branch, Internship, Image } = require('../models');
const { sendSuccess, sendError, sendBadRequest, sendNotFound, sendServerError } = require('../utils/responseHelper');
const { Op } = require('sequelize');

class InternshipDomainController {
  // Get all internship domains with optional filters
  async getAllInternshipDomains(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search, 
        branchId,
        isActive,
        sortBy = 'sortOrder',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};

      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      if (branchId) {
        whereClause.branchId = branchId;
      }

      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }

      const { count, rows: domains } = await InternshipDomain.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'code']
          },
          {
            model: Internship,
            as: 'internships',
            attributes: ['id', 'title', 'isActive', 'currentLearners'],
            required: false
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'internshipDomain' },
            order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
          }
        ],
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      });

      // Add internship counts
      const domainsWithCounts = domains.map(domain => {
        const domainData = domain.toJSON();
        domainData.internshipCount = domainData.internships?.length || 0;
        domainData.activeInternshipCount = domainData.internships?.filter(i => i.isActive).length || 0;
        domainData.totalLearners = domainData.internships?.reduce((sum, i) => sum + (i.currentLearners || 0), 0) || 0;
        return domainData;
      });

      const totalPages = Math.ceil(count / limit);

      sendSuccess(res, 'Internship domains fetched successfully', {
        domains: domainsWithCounts,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('InternshipDomainController: Get domains error:', error);
      sendServerError(res, 'Failed to fetch internship domains');
    }
  }

  // Get domains by branch
  async getDomainsByBranch(req, res) {
    try {
      const { branchId } = req.params;
      const { isActive = true } = req.query;

      const whereClause = { branchId };
      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }

      const domains = await InternshipDomain.findAll({
        where: whereClause,
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'code']
          },
          {
            model: Internship,
            as: 'internships',
            attributes: ['id', 'title', 'isActive'],
            where: { isActive: true },
            required: false
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'internshipDomain' },
            order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
          }
        ],
        order: [['sortOrder', 'ASC'], ['name', 'ASC']]
      });

      sendSuccess(res, 'Branch domains fetched successfully', domains);
    } catch (error) {
      console.error('InternshipDomainController: Get domains by branch error:', error);
      sendServerError(res, 'Failed to fetch branch domains');
    }
  }

  // Get domain by ID
  async getInternshipDomainById(req, res) {
    try {
      const { id } = req.params;
      
      const domain = await InternshipDomain.findByPk(id, {
        include: [
          {
            model: Branch,
            as: 'branch'
          },
          {
            model: Internship,
            as: 'internships',
            where: { isActive: true },
            required: false
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'internshipDomain' },
            order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
          }
        ]
      });

      if (!domain) {
        return sendNotFound(res, 'Internship domain not found');
      }

      sendSuccess(res, 'Internship domain fetched successfully', domain);
    } catch (error) {
      console.error('InternshipDomainController: Get domain error:', error);
      sendServerError(res, 'Failed to fetch internship domain');
    }
  }

  // Create new internship domain
  // async createInternshipDomain(req, res) {
  //   try {
  //     const { name, description, branchId, isActive = true, sortOrder = 0 } = req.body;

  //     // Check if branch exists
  //     const branch = await Branch.findByPk(branchId);
  //     if (!branch) {
  //       return sendBadRequest(res, 'Branch not found');
  //     }

  //     // Check if domain with same name exists in this branch
  //     const existingDomain = await InternshipDomain.findOne({ 
  //       where: { 
  //         name,
  //         branchId
  //       } 
  //     });
  //     if (existingDomain) {
  //       return sendBadRequest(res, 'Domain with this name already exists in this branch');
  //     }

  //     const domain = await InternshipDomain.create({
  //       name,
  //       description,
  //       branchId,
  //       isActive,
  //       sortOrder
  //     });

  //     const domainWithBranch = await InternshipDomain.findByPk(domain.id, {
  //       include: [
  //         {
  //           model: Branch,
  //           as: 'branch'
  //         }
  //       ]
  //     });

  //     sendSuccess(res, 'Internship domain created successfully', domainWithBranch, 201);
  //   } catch (error) {
  //     console.error('InternshipDomainController: Create domain error:', error);
  //     sendServerError(res, 'Failed to create internship domain');
  //   }
  // }



  //  async createInternshipDomain(req, res) {
  //   try {
  //     console.log('🔄 Creating internship domain with data:', req.body);
      
  //     const { name, description, branchId, isActive = true, sortOrder = 0 } = req.body;

  //     // Check if branch exists
  //     const branch = await Branch.findByPk(branchId);
  //     if (!branch) {
  //       console.log('❌ Branch not found:', branchId);
  //       return sendBadRequest(res, 'Branch not found');
  //     }

  //     // Check if domain with same name exists in this branch
  //     const existingDomain = await InternshipDomain.findOne({ 
  //       where: { 
  //         name,
  //         branchId
  //       } 
  //     });
      
  //     if (existingDomain) {
  //       console.log('❌ Domain already exists:', name, 'in branch:', branchId);
  //       return sendBadRequest(res, 'Domain with this name already exists in this branch');
  //     }

  //     // Create the domain
  //     const domain = await InternshipDomain.create({
  //       name,
  //       description,
  //       branchId,
  //       isActive,
  //       sortOrder
  //     });

  //     console.log('✅ Domain created successfully:', domain.id);

  //     // Fetch the domain with branch info
  //     const domainWithBranch = await InternshipDomain.findByPk(domain.id, {
  //       include: [
  //         {
  //           model: Branch,
  //           as: 'branch'
  //         }
  //       ]
  //     });

  //     sendSuccess(res, 'Internship domain created successfully', domainWithBranch, 201);
  //   } catch (error) {
  //     console.error('❌ InternshipDomainController: Create domain error:', error);
  //     console.error('❌ Error stack:', error.stack);
  //     sendServerError(res, 'Failed to create internship domain');
  //   }
  // }


//   async createInternshipDomain(req, res) {
//   try {
//     console.log('🔄 Creating internship domain with data:', req.body);
    
//     const { name, description, branchId, isActive = true, sortOrder = 0 } = req.body;

//     // Check if branch exists
//     const branch = await Branch.findByPk(branchId);
//     if (!branch) {
//       console.log('❌ Branch not found:', branchId);
//       return sendBadRequest(res, 'Branch not found');
//     }

//     // ✅ GENERATE SLUG FROM NAME
//     const generateSlug = (text) => {
//       return text
//         .toLowerCase()
//         .trim()
//         .replace(/[^\w\s-]/g, '') // Remove special characters
//         .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
//         .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
//     };

//     const baseSlug = generateSlug(name);
//     let slug = baseSlug;

//     // ✅ ENSURE SLUG IS UNIQUE WITHIN THE BRANCH
//     let counter = 1;
//     while (true) {
//       const existingDomainWithSlug = await InternshipDomain.findOne({
//         where: { 
//           slug,
//           branchId
//         }
//       });
      
//       if (!existingDomainWithSlug) {
//         break; // Slug is unique
//       }
      
//       slug = `${baseSlug}-${counter}`;
//       counter++;
//     }

//     // Check if domain with same name exists in this branch
//     const existingDomain = await InternshipDomain.findOne({ 
//       where: { 
//         name,
//         branchId
//       } 
//     });
    
//     if (existingDomain) {
//       console.log('❌ Domain already exists:', name, 'in branch:', branchId);
//       return sendBadRequest(res, 'Domain with this name already exists in this branch');
//     }

//     // ✅ CREATE THE DOMAIN WITH SLUG
//     const domain = await InternshipDomain.create({
//       name,
//       description,
//       slug, // ✅ Include the generated slug
//       branchId,
//       isActive,
//       sortOrder
//     });

//     console.log('✅ Domain created successfully with slug:', domain.id, '- slug:', slug);

//     // Fetch the domain with branch info
//     const domainWithBranch = await InternshipDomain.findByPk(domain.id, {
//       include: [
//         {
//           model: Branch,
//           as: 'branch'
//         }
//       ]
//     });

//     sendSuccess(res, 'Internship domain created successfully', domainWithBranch, 201);
//   } catch (error) {
//     console.error('❌ InternshipDomainController: Create domain error:', error);
//     console.error('❌ Error stack:', error.stack);
//     sendServerError(res, 'Failed to create internship domain');
//   }
// }


// async createInternshipDomain(req, res) {
//   try {
//     console.log('🔄 Creating internship domain with data:', req.body);
    
//     const { name, description, branchId, isActive = true, sortOrder = 0 } = req.body;

//     // Check if branch exists
//     const branch = await Branch.findByPk(branchId);
//     if (!branch) {
//       console.log('❌ Branch not found:', branchId);
//       return sendBadRequest(res, 'Branch not found');
//     }

//     // ✅ GENERATE UNIQUE SLUG (handles duplication automatically)
//     const generateSlug = (text) => {
//       return text
//         .toLowerCase()
//         .trim()
//         .replace(/[^\w\s-]/g, '') 
//         .replace(/[\s_-]+/g, '-') 
//         .replace(/^-+|-+$/g, '');
//     };

//     const baseSlug = generateSlug(name);
//     let slug = baseSlug;
//     let counter = 1;

//     // Ensure slug is unique within the branch
//     while (true) {
//       const existingDomainWithSlug = await InternshipDomain.findOne({
//         where: { slug, branchId }
//       });
      
//       if (!existingDomainWithSlug) {
//         break; // Slug is unique
//       }
      
//       slug = `${baseSlug}-${counter}`;
//       counter++;
//     }

//     // ✅ REMOVED: Name duplication check - allow duplicate names
//     // This allows users to create "AI", "AI" (becomes ai-1), "AI" (becomes ai-2)
    
//     // Create the domain with unique slug
//     const domain = await InternshipDomain.create({
//       name,
//       description,
//       slug,
//       branchId,
//       isActive,
//       sortOrder
//     });

//     console.log('✅ Domain created successfully:', domain.id, 'with slug:', slug);

//     // Fetch the domain with branch info
//     const domainWithBranch = await InternshipDomain.findByPk(domain.id, {
//       include: [{ model: Branch, as: 'branch' }]
//     });

//     sendSuccess(res, 'Internship domain created successfully', domainWithBranch, 201);
//   } catch (error) {
//     console.error('❌ InternshipDomainController: Create domain error:', error);
//     sendServerError(res, 'Failed to create internship domain');
//   }
// }


async createInternshipDomain(req, res) {
  try {
    console.log('🔄 Creating internship domain with data:', req.body);
    
    const { name, description, branchId, isActive = true, sortOrder = 0 } = req.body;

    // Check if branch exists
    const branch = await Branch.findByPk(branchId);
    if (!branch) {
      console.log('❌ Branch not found:', branchId);
      return sendBadRequest(res, 'Branch not found');
    }

    // ✅ GENERATE UNIQUE SLUG (handles duplication automatically)
    const generateSlug = (text) => {
      return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') 
        .replace(/[\s_-]+/g, '-') 
        .replace(/^-+|-+$/g, '');
    };

    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug is unique within the branch
    while (true) {
      const existingDomainWithSlug = await InternshipDomain.findOne({
        where: { slug, branchId }
      });
      
      if (!existingDomainWithSlug) {
        break; // Slug is unique
      }
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // ✅ REMOVED: Name duplication check - allow duplicate names
    
    // Create the domain with unique slug
    const domain = await InternshipDomain.create({
      name,
      description,
      slug,
      branchId,
      isActive,
      sortOrder
    });

    console.log('✅ Domain created successfully:', domain.id, 'with slug:', slug);

    // Fetch the domain with branch info
    const domainWithBranch = await InternshipDomain.findByPk(domain.id, {
      include: [{ model: Branch, as: 'branch' }]
    });

    sendSuccess(res, 'Internship domain created successfully', domainWithBranch, 201);
  } catch (error) {
    console.error('❌ InternshipDomainController: Create domain error:', error);
    sendServerError(res, 'Failed to create internship domain');
  }
}



  // Update internship domain
  async updateInternshipDomain(req, res) {
    try {
      const { id } = req.params;
      const { name, description, branchId, isActive, sortOrder } = req.body;

      const domain = await InternshipDomain.findByPk(id);
      if (!domain) {
        return sendNotFound(res, 'Internship domain not found');
      }

      // Check if branch exists (if branchId is being changed)
      if (branchId && branchId !== domain.branchId) {
        const branch = await Branch.findByPk(branchId);
        if (!branch) {
          return sendBadRequest(res, 'Branch not found');
        }
      }

      // Check if name is being changed and already exists in the branch
      if (name && name !== domain.name) {
        const existingDomain = await InternshipDomain.findOne({ 
          where: { 
            name,
            branchId: branchId || domain.branchId,
            id: { [Op.ne]: id }
          } 
        });
        if (existingDomain) {
          return sendBadRequest(res, 'Domain with this name already exists in this branch');
        }
      }

      await domain.update({
        name: name || domain.name,
        description: description !== undefined ? description : domain.description,
        branchId: branchId || domain.branchId,
        isActive: isActive !== undefined ? isActive : domain.isActive,
        sortOrder: sortOrder !== undefined ? sortOrder : domain.sortOrder
      });

      const updatedDomain = await InternshipDomain.findByPk(id, {
        include: [
          {
            model: Branch,
            as: 'branch'
          }
        ]
      });

      sendSuccess(res, 'Internship domain updated successfully', updatedDomain);
    } catch (error) {
      console.error('InternshipDomainController: Update domain error:', error);
      sendServerError(res, 'Failed to update internship domain');
    }
  }

  // Delete internship domain
  async deleteInternshipDomain(req, res) {
    try {
      const { id } = req.params;

      const domain = await InternshipDomain.findByPk(id, {
        include: [
          {
            model: Internship,
            as: 'internships'
          }
        ]
      });

      if (!domain) {
        return sendNotFound(res, 'Internship domain not found');
      }

      // Check if domain has internships
      if (domain.internships && domain.internships.length > 0) {
        return sendBadRequest(res, 'Cannot delete domain with existing internships');
      }

      await domain.destroy();
      sendSuccess(res, 'Internship domain deleted successfully');
    } catch (error) {
      console.error('InternshipDomainController: Delete domain error:', error);
      sendServerError(res, 'Failed to delete internship domain');
    }
  }
}

module.exports = new InternshipDomainController();