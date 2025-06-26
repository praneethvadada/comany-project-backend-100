const { Domain, SubDomain, Project, Image } = require('../models');
const { 
  sendSuccess, 
  sendCreated, 
  sendBadRequest, 
  sendNotFound,
  sendServerError 
} = require('../utils/responseHelper');
const { Op } = require('sequelize');

// Helper function to generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

class DomainController {
  // Get all domains with pagination and search
  async getAllDomains(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        sortBy = 'sortOrder',
        sortOrder = 'ASC',
        isActive 
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};

      if (search) {
        whereClause[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      if (isActive !== undefined) {
        whereClause.isActive = isActive === 'true';
      }

      const { count, rows: domains } = await Domain.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'domain' },
            order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
          },
          {
            model: SubDomain,
            as: 'subDomains',
            where: { isActive: true },
            required: false,
            attributes: ['id', 'title', 'isLeaf'],
            include: [
              {
                model: Project,
                as: 'projects',
                where: { isActive: true },
                required: false,
                attributes: ['id']
              }
            ]
          }
        ],
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      });

      // Add project counts
      const domainsWithCounts = domains.map(domain => {
        const domainData = domain.toJSON();
        domainData.subDomainCount = domainData.subDomains?.length || 0;
        domainData.projectCount = domainData.subDomains?.reduce((acc, sub) => 
          acc + (sub.projects?.length || 0), 0) || 0;
        return domainData;
      });

      const totalPages = Math.ceil(count / limit);

      sendSuccess(res, 'Domains fetched successfully', {
        domains: domainsWithCounts,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Get domains error:', error);
      sendServerError(res, 'Failed to fetch domains');
    }
  }

  // Get domain by ID with full hierarchy
  async getDomainById(req, res) {
    try {
      const { id } = req.params;

      const domain = await Domain.findByPk(id, {
        include: [
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'domain' },
            order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
          },
          {
            model: SubDomain,
            as: 'subDomains',
            required: false,
            include: [
              {
                model: Image,
                as: 'images',
                required: false,
                where: { entityType: 'subdomain' }
              },
              {
                model: SubDomain,
                as: 'children',
                required: false
              },
              {
                model: Project,
                as: 'projects',
                required: false,
                where: { isActive: true }
              }
            ]
          }
        ]
      });

      if (!domain) {
        return sendNotFound(res, 'Domain not found');
      }

      sendSuccess(res, 'Domain fetched successfully', domain);
    } catch (error) {
      console.error('Get domain by ID error:', error);
      sendServerError(res, 'Failed to fetch domain');
    }
  }

  // Get domain hierarchy (tree structure)
  async getDomainHierarchy(req, res) {
    try {
      const { id } = req.params;

      const domain = await Domain.findByPk(id);
      if (!domain) {
        return sendNotFound(res, 'Domain not found');
      }

      // Get all subdomains for this domain
      const subDomains = await SubDomain.findAll({
        where: { domainId: id },
        include: [
          {
            model: Project,
            as: 'projects',
            required: false,
            where: { isActive: true },
            attributes: ['id', 'title', 'slug', 'isActive', 'isFeatured']
          }
        ],
        order: [['level', 'ASC'], ['sortOrder', 'ASC']]
      });

      // Build tree structure
      const buildTree = (parentId = null, level = 1) => {
        return subDomains
          .filter(sub => sub.parentId === parentId && sub.level === level)
          .map(sub => ({
            ...sub.toJSON(),
            children: buildTree(sub.id, level + 1)
          }));
      };

      const hierarchy = {
        ...domain.toJSON(),
        subDomains: buildTree()
      };

      sendSuccess(res, 'Domain hierarchy fetched successfully', hierarchy);
    } catch (error) {
      console.error('Get domain hierarchy error:', error);
      sendServerError(res, 'Failed to fetch domain hierarchy');
    }
  }


async createDomain(req, res) {
  try {
    const { title, description, isActive = true, sortOrder = 0 } = req.body;

    // Generate slug from title
    const slug = generateSlug(title);

    // Check if domain with this title already exists
    const existingDomain = await Domain.findOne({ 
      where: { title: { [Op.like]: title } } 
    });

    if (existingDomain) {
      return sendBadRequest(res, 'Domain with this title already exists');
    }

    // Check if slug already exists
    const existingSlug = await Domain.findOne({ 
      where: { slug } 
    });

    if (existingSlug) {
      return sendBadRequest(res, 'Domain with similar name already exists');
    }

    const domain = await Domain.create({
      title,
      slug,  // Add this line!
      description,
      isActive,
      sortOrder
    });

    sendCreated(res, 'Domain created successfully', domain);
  } catch (error) {
    console.error('Create domain error:', error);
    sendServerError(res, 'Failed to create domain');
  }
}

  // Update domain
  async updateDomain(req, res) {
    try {
      const { id } = req.params;
      const { title, description, isActive, sortOrder } = req.body;

      const domain = await Domain.findByPk(id);
      if (!domain) {
        return sendNotFound(res, 'Domain not found');
      }

      // Check if another domain with this title exists
      if (title && title !== domain.title) {
        const existingDomain = await Domain.findOne({ 
          where: { 
            title: { [Op.like]: title },
            id: { [Op.ne]: id }
          } 
        });

        if (existingDomain) {
          return sendBadRequest(res, 'Domain with this title already exists');
        }
      }

      await domain.update({
        title: title || domain.title,
        description: description !== undefined ? description : domain.description,
        isActive: isActive !== undefined ? isActive : domain.isActive,
        sortOrder: sortOrder !== undefined ? sortOrder : domain.sortOrder
      });

      const updatedDomain = await Domain.findByPk(id, {
        include: [
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'domain' }
          }
        ]
      });

      sendSuccess(res, 'Domain updated successfully', updatedDomain);
    } catch (error) {
      console.error('Update domain error:', error);
      sendServerError(res, 'Failed to update domain');
    }
  }

  // Delete domain
  async deleteDomain(req, res) {
    try {
      const { id } = req.params;

      const domain = await Domain.findByPk(id, {
        include: [
          {
            model: SubDomain,
            as: 'subDomains',
            include: [
              {
                model: Project,
                as: 'projects'
              }
            ]
          }
        ]
      });

      if (!domain) {
        return sendNotFound(res, 'Domain not found');
      }

      // Check if domain has subdomains or projects
      const hasSubDomains = domain.subDomains && domain.subDomains.length > 0;
      const hasProjects = domain.subDomains?.some(sub => sub.projects && sub.projects.length > 0);

      if (hasSubDomains || hasProjects) {
        return sendBadRequest(res, 'Cannot delete domain that contains subdomains or projects. Please move or delete them first.');
      }

      // Delete associated images first
      await Image.destroy({
        where: {
          entityType: 'domain',
          entityId: id
        }
      });

      await domain.destroy();

      sendSuccess(res, 'Domain deleted successfully');
    } catch (error) {
      console.error('Delete domain error:', error);
      sendServerError(res, 'Failed to delete domain');
    }
  }

  // Get domain statistics
  async getDomainStats(req, res) {
    try {
      const { id } = req.params;

      const domain = await Domain.findByPk(id);
      if (!domain) {
        return sendNotFound(res, 'Domain not found');
      }

      // Get counts
      const subDomainCount = await SubDomain.count({
        where: { domainId: id, isActive: true }
      });

      const leafSubDomainCount = await SubDomain.count({
        where: { domainId: id, isLeaf: true, isActive: true }
      });

      const projectCount = await Project.count({
        include: [
          {
            model: SubDomain,
            as: 'subDomain',
            where: { domainId: id },
            required: true
          }
        ],
        where: { isActive: true }
      });

      const featuredProjectCount = await Project.count({
        include: [
          {
            model: SubDomain,
            as: 'subDomain',
            where: { domainId: id },
            required: true
          }
        ],
        where: { isActive: true, isFeatured: true }
      });

      const stats = {
        domain: {
          id: domain.id,
          title: domain.title,
          isActive: domain.isActive
        },
        counts: {
          subDomains: subDomainCount,
          leafSubDomains: leafSubDomainCount,
          projects: projectCount,
          featuredProjects: featuredProjectCount
        }
      };

      sendSuccess(res, 'Domain statistics fetched successfully', stats);
    } catch (error) {
      console.error('Get domain stats error:', error);
      sendServerError(res, 'Failed to fetch domain statistics');
    }
  }
}

module.exports = new DomainController();


// const { Domain, SubDomain, Project, Image } = require('../models');
// const { 
//   sendSuccess, 
//   sendCreated, 
//   sendBadRequest, 
//   sendNotFound,
//   sendServerError 
// } = require('../utils/responseHelper');
// const { Op } = require('sequelize');

// class DomainController {
//   // Get all domains with pagination and search
//   async getAllDomains(req, res) {
//     try {
//       const { 
//         page = 1, 
//         limit = 10, 
//         search = '', 
//         sortBy = 'sortOrder',
//         sortOrder = 'ASC',
//         isActive 
//       } = req.query;

//       const offset = (page - 1) * limit;
//       const whereClause = {};

//       if (search) {
//         whereClause[Op.or] = [
//           { title: { [Op.like]: `%${search}%` } },
//           { description: { [Op.like]: `%${search}%` } }
//         ];
//       }

//       if (isActive !== undefined) {
//         whereClause.isActive = isActive === 'true';
//       }

//       const { count, rows: domains } = await Domain.findAndCountAll({
//         where: whereClause,
//         include: [
//           {
//             model: Image,
//             as: 'images',
//             required: false,
//             where: { entityType: 'domain' },
//             order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
//           },
//           {
//             model: SubDomain,
//             as: 'subDomains',
//             where: { isActive: true },
//             required: false,
//             attributes: ['id', 'title', 'isLeaf'],
//             include: [
//               {
//                 model: Project,
//                 as: 'projects',
//                 where: { isActive: true },
//                 required: false,
//                 attributes: ['id']
//               }
//             ]
//           }
//         ],
//         order: [[sortBy, sortOrder]],
//         limit: parseInt(limit),
//         offset: parseInt(offset),
//         distinct: true
//       });

//       // Add project counts
//       const domainsWithCounts = domains.map(domain => {
//         const domainData = domain.toJSON();
//         domainData.subDomainCount = domainData.subDomains?.length || 0;
//         domainData.projectCount = domainData.subDomains?.reduce((acc, sub) => 
//           acc + (sub.projects?.length || 0), 0) || 0;
//         return domainData;
//       });

//       const totalPages = Math.ceil(count / limit);

//       sendSuccess(res, 'Domains fetched successfully', {
//         domains: domainsWithCounts,
//         pagination: {
//           currentPage: parseInt(page),
//           totalPages,
//           totalItems: count,
//           itemsPerPage: parseInt(limit)
//         }
//       });
//     } catch (error) {
//       console.error('Get domains error:', error);
//       sendServerError(res, 'Failed to fetch domains');
//     }
//   }

//   // Get domain by ID with full hierarchy
//   async getDomainById(req, res) {
//     try {
//       const { id } = req.params;

//       const domain = await Domain.findByPk(id, {
//         include: [
//           {
//             model: Image,
//             as: 'images',
//             required: false,
//             where: { entityType: 'domain' },
//             order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
//           },
//           {
//             model: SubDomain,
//             as: 'subDomains',
//             required: false,
//             include: [
//               {
//                 model: Image,
//                 as: 'images',
//                 required: false,
//                 where: { entityType: 'subdomain' }
//               },
//               {
//                 model: SubDomain,
//                 as: 'children',
//                 required: false
//               },
//               {
//                 model: Project,
//                 as: 'projects',
//                 required: false,
//                 where: { isActive: true }
//               }
//             ]
//           }
//         ]
//       });

//       if (!domain) {
//         return sendNotFound(res, 'Domain not found');
//       }

//       sendSuccess(res, 'Domain fetched successfully', domain);
//     } catch (error) {
//       console.error('Get domain by ID error:', error);
//       sendServerError(res, 'Failed to fetch domain');
//     }
//   }

//   // Get domain hierarchy (tree structure)
//   async getDomainHierarchy(req, res) {
//     try {
//       const { id } = req.params;

//       const domain = await Domain.findByPk(id);
//       if (!domain) {
//         return sendNotFound(res, 'Domain not found');
//       }

//       // Get all subdomains for this domain
//       const subDomains = await SubDomain.findAll({
//         where: { domainId: id },
//         include: [
//           {
//             model: Project,
//             as: 'projects',
//             required: false,
//             where: { isActive: true },
//             attributes: ['id', 'title', 'slug', 'isActive', 'isFeatured']
//           }
//         ],
//         order: [['level', 'ASC'], ['sortOrder', 'ASC']]
//       });

//       // Build tree structure
//       const buildTree = (parentId = null, level = 1) => {
//         return subDomains
//           .filter(sub => sub.parentId === parentId && sub.level === level)
//           .map(sub => ({
//             ...sub.toJSON(),
//             children: buildTree(sub.id, level + 1)
//           }));
//       };

//       const hierarchy = {
//         ...domain.toJSON(),
//         subDomains: buildTree()
//       };

//       sendSuccess(res, 'Domain hierarchy fetched successfully', hierarchy);
//     } catch (error) {
//       console.error('Get domain hierarchy error:', error);
//       sendServerError(res, 'Failed to fetch domain hierarchy');
//     }
//   }

//   // Create new domain
//   async createDomain(req, res) {
//     try {
//       const { title, description, isActive = true, sortOrder = 0 } = req.body;

//       // Check if domain with this title already exists
//       const existingDomain = await Domain.findOne({ 
//         where: { title: { [Op.like]: title } } 
//       });

//       if (existingDomain) {
//         return sendBadRequest(res, 'Domain with this title already exists');
//       }

//       const domain = await Domain.create({
//         title,
//         description,
//         isActive,
//         sortOrder
//       });

//       sendCreated(res, 'Domain created successfully', domain);
//     } catch (error) {
//       console.error('Create domain error:', error);
//       sendServerError(res, 'Failed to create domain');
//     }
//   }

//   // Update domain
//   async updateDomain(req, res) {
//     try {
//       const { id } = req.params;
//       const { title, description, isActive, sortOrder } = req.body;

//       const domain = await Domain.findByPk(id);
//       if (!domain) {
//         return sendNotFound(res, 'Domain not found');
//       }

//       // Check if another domain with this title exists
//       if (title && title !== domain.title) {
//         const existingDomain = await Domain.findOne({ 
//           where: { 
//             title: { [Op.like]: title },
//             id: { [Op.ne]: id }
//           } 
//         });

//         if (existingDomain) {
//           return sendBadRequest(res, 'Domain with this title already exists');
//         }
//       }

//       await domain.update({
//         title: title || domain.title,
//         description: description !== undefined ? description : domain.description,
//         isActive: isActive !== undefined ? isActive : domain.isActive,
//         sortOrder: sortOrder !== undefined ? sortOrder : domain.sortOrder
//       });

//       const updatedDomain = await Domain.findByPk(id, {
//         include: [
//           {
//             model: Image,
//             as: 'images',
//             required: false,
//             where: { entityType: 'domain' }
//           }
//         ]
//       });

//       sendSuccess(res, 'Domain updated successfully', updatedDomain);
//     } catch (error) {
//       console.error('Update domain error:', error);
//       sendServerError(res, 'Failed to update domain');
//     }
//   }

//   // Delete domain
//   async deleteDomain(req, res) {
//     try {
//       const { id } = req.params;

//       const domain = await Domain.findByPk(id, {
//         include: [
//           {
//             model: SubDomain,
//             as: 'subDomains',
//             include: [
//               {
//                 model: Project,
//                 as: 'projects'
//               }
//             ]
//           }
//         ]
//       });

//       if (!domain) {
//         return sendNotFound(res, 'Domain not found');
//       }

//       // Check if domain has subdomains or projects
//       const hasSubDomains = domain.subDomains && domain.subDomains.length > 0;
//       const hasProjects = domain.subDomains?.some(sub => sub.projects && sub.projects.length > 0);

//       if (hasSubDomains || hasProjects) {
//         return sendBadRequest(res, 'Cannot delete domain that contains subdomains or projects. Please move or delete them first.');
//       }

//       // Delete associated images first
//       await Image.destroy({
//         where: {
//           entityType: 'domain',
//           entityId: id
//         }
//       });

//       await domain.destroy();

//       sendSuccess(res, 'Domain deleted successfully');
//     } catch (error) {
//       console.error('Delete domain error:', error);
//       sendServerError(res, 'Failed to delete domain');
//     }
//   }

//   // Get domain statistics
//   async getDomainStats(req, res) {
//     try {
//       const { id } = req.params;

//       const domain = await Domain.findByPk(id);
//       if (!domain) {
//         return sendNotFound(res, 'Domain not found');
//       }

//       // Get counts
//       const subDomainCount = await SubDomain.count({
//         where: { domainId: id, isActive: true }
//       });

//       const leafSubDomainCount = await SubDomain.count({
//         where: { domainId: id, isLeaf: true, isActive: true }
//       });

//       const projectCount = await Project.count({
//         include: [
//           {
//             model: SubDomain,
//             as: 'subDomain',
//             where: { domainId: id },
//             required: true
//           }
//         ],
//         where: { isActive: true }
//       });

//       const featuredProjectCount = await Project.count({
//         include: [
//           {
//             model: SubDomain,
//             as: 'subDomain',
//             where: { domainId: id },
//             required: true
//           }
//         ],
//         where: { isActive: true, isFeatured: true }
//       });

//       const stats = {
//         domain: {
//           id: domain.id,
//           title: domain.title,
//           isActive: domain.isActive
//         },
//         counts: {
//           subDomains: subDomainCount,
//           leafSubDomains: leafSubDomainCount,
//           projects: projectCount,
//           featuredProjects: featuredProjectCount
//         }
//       };

//       sendSuccess(res, 'Domain statistics fetched successfully', stats);
//     } catch (error) {
//       console.error('Get domain stats error:', error);
//       sendServerError(res, 'Failed to fetch domain statistics');
//     }
//   }
// }

// module.exports = new DomainController();