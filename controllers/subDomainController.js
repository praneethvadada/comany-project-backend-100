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

class SubDomainController {
  async getAllSubDomains(req, res) {
  try {
    console.log('🔍 GET ALL SUBDOMAINS - Request query params:', JSON.stringify(req.query, null, 2));
    
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      domainId,
      parentId,
      isLeaf,
      level,
      sortBy = 'sortOrder',
      sortOrder = 'ASC'
    } = req.query;

    console.log('🔍 GET ALL SUBDOMAINS - Extracted params:', {
      page, limit, search, domainId, parentId, isLeaf, level, sortBy, sortOrder
    });

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    if (domainId) whereClause.domainId = domainId;
    if (parentId !== undefined) {
      whereClause.parentId = parentId === 'null' ? null : parentId;
    }
    if (isLeaf !== undefined) whereClause.isLeaf = isLeaf === 'true';
    if (level) whereClause.level = level;

    console.log('🔍 GET ALL SUBDOMAINS - Where clause:', JSON.stringify(whereClause, null, 2));
    console.log('🔍 GET ALL SUBDOMAINS - Pagination:', { offset, limit: parseInt(limit) });

    const { count, rows: subDomains } = await SubDomain.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Domain,
          as: 'domain',
          attributes: ['id', 'title', 'slug']
        },
        {
          model: SubDomain,
          as: 'parent',
          attributes: ['id', 'title', 'slug'],
          required: false
        },
        {
          model: SubDomain,
          as: 'children',
          attributes: ['id', 'title', 'isLeaf'],
          required: false
        },
        {
          model: Project,
          as: 'projects',
          where: { isActive: true },
          required: false,
          attributes: ['id', 'title', 'isFeatured']
        },
        {
          model: Image,
          as: 'images',
          required: false,
          where: { entityType: 'subdomain' },
          order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    console.log('🔍 GET ALL SUBDOMAINS - Database results:', {
      count,
      foundSubDomains: subDomains.length,
      subDomainTitles: subDomains.map(s => ({ id: s.id, title: s.title, domainId: s.domainId, isActive: s.isActive }))
    });

    // Add counts to each subdomain
    const subDomainsWithCounts = subDomains.map(sub => {
      const subData = sub.toJSON();
      subData.childrenCount = subData.children?.length || 0;
      subData.projectCount = subData.projects?.length || 0;
      return subData;
    });

    const totalPages = Math.ceil(count / limit);

    console.log('🔍 GET ALL SUBDOMAINS - Final response data:', {
      subDomainCount: subDomainsWithCounts.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

    sendSuccess(res, 'SubDomains fetched successfully', {
      subDomains: subDomainsWithCounts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ GET ALL SUBDOMAINS ERROR:', error);
    sendServerError(res, 'Failed to fetch subdomains');
  }
  }

  async getSubDomainById(req, res) {
    try {
      const { id } = req.params;

      const subDomain = await SubDomain.findByPk(id, {
        include: [
          {
            model: Domain,
            as: 'domain',
            attributes: ['id', 'title', 'slug']
          },
          {
            model: SubDomain,
            as: 'parent',
            required: false
          },
          {
            model: SubDomain,
            as: 'children',
            required: false,
            include: [
              {
                model: Project,
                as: 'projects',
                required: false,
                where: { isActive: true }
              }
            ]
          },
          {
            model: Project,
            as: 'projects',
            required: false,
            where: { isActive: true },
            include: [
              {
                model: Image,
                as: 'images',
                required: false,
                where: { entityType: 'project', isMain: true }
              }
            ]
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'subdomain' },
            order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
          }
        ]
      });

      if (!subDomain) {
        return sendNotFound(res, 'SubDomain not found');
      }

      sendSuccess(res, 'SubDomain fetched successfully', subDomain);
    } catch (error) {
      console.error('Get subdomain by ID error:', error);
      sendServerError(res, 'Failed to fetch subdomain');
    }
  }

  async getSubDomainsByDomain(req, res) {
    try {
      console.log('🔍 GET SUBDOMAINS BY DOMAIN - Request params:', req.params);
      console.log('🔍 GET SUBDOMAINS BY DOMAIN - Request query:', req.query);
      
      const { domainId } = req.params;
      const { includeProjects = false } = req.query;

      console.log('🔍 GET SUBDOMAINS BY DOMAIN - Looking for domainId:', domainId);

      const domain = await Domain.findByPk(domainId);
      if (!domain) {
        console.log('❌ GET SUBDOMAINS BY DOMAIN - Domain not found:', domainId);
        return sendNotFound(res, 'Domain not found');
      }

      console.log('🔍 GET SUBDOMAINS BY DOMAIN - Found domain:', domain.title);

      const includeOptions = [
        {
          model: SubDomain,
          as: 'children',
          required: false
        }
      ];

      if (includeProjects === 'true') {
        includeOptions.push({
          model: Project,
          as: 'projects',
          required: false,
          where: { isActive: true },
          attributes: ['id', 'title', 'slug', 'isFeatured']
        });
      }

      const subDomains = await SubDomain.findAll({
        where: { domainId, isActive: true },
        include: includeOptions,
        order: [['level', 'ASC'], ['sortOrder', 'ASC']]
      });

      console.log('🔍 GET SUBDOMAINS BY DOMAIN - Raw subdomains found:', {
        count: subDomains.length,
        subDomains: subDomains.map(s => ({
          id: s.id,
          title: s.title,
          level: s.level,
          parentId: s.parentId,
          isActive: s.isActive
        }))
      });

      // Build hierarchical structure
      const buildTree = (parentId = null, level = 1) => {
        const filtered = subDomains.filter(sub => sub.parentId === parentId && sub.level === level);
        console.log(`🔍 Building tree for parentId: ${parentId}, level: ${level}, found: ${filtered.length}`);
        
        return filtered.map(sub => ({
          ...sub.toJSON(),
          children: buildTree(sub.id, level + 1)
        }));
      };

      const hierarchy = buildTree();
      
      console.log('🔍 GET SUBDOMAINS BY DOMAIN - Final hierarchy:', {
        topLevelCount: hierarchy.length,
        structure: hierarchy.map(h => ({ id: h.id, title: h.title, childrenCount: h.children?.length || 0 }))
      });

      sendSuccess(res, 'SubDomains fetched successfully', {
        domain: {
          id: domain.id,
          title: domain.title,
          slug: domain.slug
        },
        subDomains: hierarchy
      });
    } catch (error) {
      console.error('❌ GET SUBDOMAINS BY DOMAIN ERROR:', error);
      sendServerError(res, 'Failed to fetch subdomains');
    }
  }

  async createSubDomain(req, res) {
    try {
          console.log('🔍 CONTROLLER DEBUG - Raw request body:', JSON.stringify(req.body, null, 2));

      const { 
        title, 
        description, 
        domainId, 
        parentId = null, 
        isActive = true, 
        sortOrder = 0 
      } = req.body;


      console.log('🔍 CONTROLLER DEBUG - Extracted fields:', {
      title, description, domainId, parentId, isActive, sortOrder
    });

      // Validate domain exists
      const domain = await Domain.findByPk(domainId);
      if (!domain) {
        return sendBadRequest(res, 'Domain not found');
      }

      // Validate parent subdomain if provided
      let level = 1;
      if (parentId) {
        const parent = await SubDomain.findOne({
          where: { id: parentId, domainId }
        });
        if (!parent) {
          return sendBadRequest(res, 'Parent subdomain not found or not in the same domain');
        }
        level = parent.level + 1;

        // Check max nesting level (optional - adjust as needed)
        if (level > 5) {
          return sendBadRequest(res, 'Maximum nesting level exceeded');
        }
      }

      // Check if subdomain with this title already exists in this domain
      const existingSubDomain = await SubDomain.findOne({
        where: { 
          title: { [Op.like]: title },
          domainId
        }
      });

      if (existingSubDomain) {
        return sendBadRequest(res, 'SubDomain with this title already exists in this domain');
      }

      // const subDomain = await SubDomain.create({
      //   title,
      //   description,
      //   domainId,
      //   parentId,
      //   level,
      //   isActive,
      //   sortOrder,
      //   isLeaf: true // Default to leaf, will be updated if children are added
      // });


      // Generate slug from title
const slug = generateSlug(title);
console.log('🔍 CONTROLLER DEBUG - Generated slug:', slug);

// Check if slug already exists
const existingSlug = await SubDomain.findOne({ 
  where: { slug } 
});

if (existingSlug) {
  return sendBadRequest(res, 'SubDomain with similar name already exists');
}

const subDomain = await SubDomain.create({
  title,
  slug,        // ← ADD THIS LINE
  description,
  domainId,
  parentId,
  level,
  isActive,
  sortOrder,
  isLeaf: true // Default to leaf, will be updated if children are added
});

      // If this subdomain has a parent, update parent's isLeaf status
      if (parentId) {
        await SubDomain.update(
          { isLeaf: false },
          { where: { id: parentId } }
        );
      }

      const createdSubDomain = await SubDomain.findByPk(subDomain.id, {
        include: [
          {
            model: Domain,
            as: 'domain',
            attributes: ['id', 'title', 'slug']
          },
          {
            model: SubDomain,
            as: 'parent',
            attributes: ['id', 'title', 'slug'],
            required: false
          }
        ]
      });

      sendCreated(res, 'SubDomain created successfully', createdSubDomain);
    } catch (error) {
      console.error('Create subdomain error:', error);
      sendServerError(res, 'Failed to create subdomain');
    }
  }

  async updateSubDomain(req, res) {
    try {
      const { id } = req.params;
      const { title, description, isActive, sortOrder, parentId } = req.body;

      const subDomain = await SubDomain.findByPk(id);
      if (!subDomain) {
        return sendNotFound(res, 'SubDomain not found');
      }

      // Check if another subdomain with this title exists in the same domain
      if (title && title !== subDomain.title) {
        const existingSubDomain = await SubDomain.findOne({
          where: { 
            title: { [Op.like]: title },
            domainId: subDomain.domainId,
            id: { [Op.ne]: id }
          }
        });

        if (existingSubDomain) {
          return sendBadRequest(res, 'SubDomain with this title already exists in this domain');
        }
      }

      // Handle parent change
      let newLevel = subDomain.level;
      if (parentId !== undefined && parentId !== subDomain.parentId) {
        if (parentId === null) {
          newLevel = 1;
        } else {
          // Check if new parent exists and is in same domain
          const newParent = await SubDomain.findOne({
            where: { id: parentId, domainId: subDomain.domainId }
          });
          if (!newParent) {
            return sendBadRequest(res, 'New parent subdomain not found or not in the same domain');
          }

          // Check for circular reference
          const isCircular = await this.checkCircularReference(id, parentId);
          if (isCircular) {
            return sendBadRequest(res, 'Cannot set parent: would create circular reference');
          }

          newLevel = newParent.level + 1;
          
          // Update new parent's isLeaf status
          await SubDomain.update(
            { isLeaf: false },
            { where: { id: parentId } }
          );
        }

        // Update old parent's isLeaf status if it has no other children
        if (subDomain.parentId) {
          const siblingCount = await SubDomain.count({
            where: { 
              parentId: subDomain.parentId,
              id: { [Op.ne]: id }
            }
          });
          if (siblingCount === 0) {
            await SubDomain.update(
              { isLeaf: true },
              { where: { id: subDomain.parentId } }
            );
          }
        }
      }

      // Update the subdomain
      await subDomain.update({
        title: title || subDomain.title,
        description: description !== undefined ? description : subDomain.description,
        isActive: isActive !== undefined ? isActive : subDomain.isActive,
        sortOrder: sortOrder !== undefined ? sortOrder : subDomain.sortOrder,
        parentId: parentId !== undefined ? parentId : subDomain.parentId,
        level: newLevel
      });

      // Update all children's levels recursively if level changed
      if (newLevel !== subDomain.level) {
        await this.updateChildrenLevels(id, newLevel);
      }

      const updatedSubDomain = await SubDomain.findByPk(id, {
        include: [
          {
            model: Domain,
            as: 'domain',
            attributes: ['id', 'title', 'slug']
          },
          {
            model: SubDomain,
            as: 'parent',
            attributes: ['id', 'title', 'slug'],
            required: false
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'subdomain' }
          }
        ]
      });

      sendSuccess(res, 'SubDomain updated successfully', updatedSubDomain);
    } catch (error) {
      console.error('Update subdomain error:', error);
      sendServerError(res, 'Failed to update subdomain');
    }
  }

  async deleteSubDomain(req, res) {
    try {
      const { id } = req.params;
      const { force = false } = req.query;

      const subDomain = await SubDomain.findByPk(id, {
        include: [
          {
            model: SubDomain,
            as: 'children'
          },
          {
            model: Project,
            as: 'projects',
            where: { isActive: true },
            required: false
          }
        ]
      });

      if (!subDomain) {
        return sendNotFound(res, 'SubDomain not found');
      }

      // Check if subdomain has children or projects
      const hasChildren = subDomain.children && subDomain.children.length > 0;
      const hasProjects = subDomain.projects && subDomain.projects.length > 0;

      if ((hasChildren || hasProjects) && force !== 'true') {
        return sendBadRequest(res, 
          'Cannot delete subdomain that contains children or projects. Use force=true to delete anyway, or move them first.'
        );
      }

      // If force delete, handle children and projects
      if (force === 'true') {
        // Delete all images for projects in this subdomain
        if (hasProjects) {
          const projectIds = subDomain.projects.map(p => p.id);
          await Image.destroy({
            where: {
              entityType: 'project',
              entityId: { [Op.in]: projectIds }
            }
          });
          // Delete projects
          await Project.destroy({
            where: { subDomainId: id }
          });
        }

        // Recursively delete children
        if (hasChildren) {
          for (const child of subDomain.children) {
            await this.deleteSubDomainRecursive(child.id);
          }
        }
      }

      // Update parent's isLeaf status if this was the only child
      if (subDomain.parentId) {
        const siblingCount = await SubDomain.count({
          where: { 
            parentId: subDomain.parentId,
            id: { [Op.ne]: id }
          }
        });
        if (siblingCount === 0) {
          await SubDomain.update(
            { isLeaf: true },
            { where: { id: subDomain.parentId } }
          );
        }
      }

      // Delete associated images
      await Image.destroy({
        where: {
          entityType: 'subdomain',
          entityId: id
        }
      });

      // Delete the subdomain
      await subDomain.destroy();

      sendSuccess(res, 'SubDomain deleted successfully');
    } catch (error) {
      console.error('Delete subdomain error:', error);
      sendServerError(res, 'Failed to delete subdomain');
    }
  }

  async getLeafSubDomains(req, res) {
    try {
      const { domainId } = req.query;
      const whereClause = { isLeaf: true, isActive: true };
      
      if (domainId) {
        whereClause.domainId = domainId;
      }

      const leafSubDomains = await SubDomain.findAll({
        where: whereClause,
        include: [
          {
            model: Domain,
            as: 'domain',
            attributes: ['id', 'title', 'slug']
          },
          {
            model: Project,
            as: 'projects',
            where: { isActive: true },
            required: false,
            attributes: ['id']
          }
        ],
        order: [['domainId', 'ASC'], ['level', 'ASC'], ['sortOrder', 'ASC']]
      });

      const leafsWithCounts = leafSubDomains.map(leaf => ({
        ...leaf.toJSON(),
        projectCount: leaf.projects?.length || 0
      }));

      sendSuccess(res, 'Leaf subdomains fetched successfully', leafsWithCounts);
    } catch (error) {
      console.error('Get leaf subdomains error:', error);
      sendServerError(res, 'Failed to fetch leaf subdomains');
    }
  }

  async checkCircularReference(subDomainId, newParentId) {
    let currentParent = newParentId;
    
    while (currentParent) {
      if (currentParent === subDomainId) {
        return true;
      }
      
      const parent = await SubDomain.findByPk(currentParent);
      currentParent = parent?.parentId;
    }
    
    return false;
  }

  async updateChildrenLevels(parentId, parentLevel) {
    const children = await SubDomain.findAll({
      where: { parentId }
    });

    for (const child of children) {
      const newChildLevel = parentLevel + 1;
      await child.update({ level: newChildLevel });
      await this.updateChildrenLevels(child.id, newChildLevel);
    }
  }

  async deleteSubDomainRecursive(subDomainId) {
    const subDomain = await SubDomain.findByPk(subDomainId, {
      include: [
        { model: SubDomain, as: 'children' },
        { model: Project, as: 'projects' }
      ]
    });

    if (!subDomain) return;

    // Delete projects and their images
    if (subDomain.projects?.length > 0) {
      const projectIds = subDomain.projects.map(p => p.id);
      await Image.destroy({
        where: {
          entityType: 'project',
          entityId: { [Op.in]: projectIds }
        }
      });
      await Project.destroy({
        where: { subDomainId }
      });
    }

    // Recursively delete children
    if (subDomain.children?.length > 0) {
      for (const child of subDomain.children) {
        await this.deleteSubDomainRecursive(child.id);
      }
    }

    // Delete subdomain images
    await Image.destroy({
      where: {
        entityType: 'subdomain',
        entityId: subDomainId
      }
    });

    // Delete subdomain
    await subDomain.destroy();
  }

}

module.exports = new SubDomainController();


// const { Domain, SubDomain, Project, Image } = require('../models');
// const { 
//   sendSuccess, 
//   sendCreated, 
//   sendBadRequest, 
//   sendNotFound,
//   sendServerError 
// } = require('../utils/responseHelper');
// const { Op } = require('sequelize');

// class SubDomainController {
//   // Get all subdomains with pagination and filtering
//   async getAllSubDomains(req, res) {
//     try {
//       const { 
//         page = 1, 
//         limit = 10, 
//         search = '', 
//         domainId,
//         parentId,
//         isLeaf,
//         level,
//         sortBy = 'sortOrder',
//         sortOrder = 'ASC'
//       } = req.query;

//       const offset = (page - 1) * limit;
//       const whereClause = {};

//       if (search) {
//         whereClause[Op.or] = [
//           { title: { [Op.like]: `%${search}%` } },
//           { description: { [Op.like]: `%${search}%` } }
//         ];
//       }

//       if (domainId) whereClause.domainId = domainId;
//       if (parentId !== undefined) {
//         whereClause.parentId = parentId === 'null' ? null : parentId;
//       }
//       if (isLeaf !== undefined) whereClause.isLeaf = isLeaf === 'true';
//       if (level) whereClause.level = level;

//       const { count, rows: subDomains } = await SubDomain.findAndCountAll({
//         where: whereClause,
//         include: [
//           {
//             model: Domain,
//             as: 'domain',
//             attributes: ['id', 'title', 'slug']
//           },
//           {
//             model: SubDomain,
//             as: 'parent',
//             attributes: ['id', 'title', 'slug'],
//             required: false
//           },
//           {
//             model: SubDomain,
//             as: 'children',
//             attributes: ['id', 'title', 'isLeaf'],
//             required: false
//           },
//           {
//             model: Project,
//             as: 'projects',
//             where: { isActive: true },
//             required: false,
//             attributes: ['id', 'title', 'isFeatured']
//           },
//           {
//             model: Image,
//             as: 'images',
//             required: false,
//             where: { entityType: 'subdomain' },
//             order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
//           }
//         ],
//         order: [[sortBy, sortOrder]],
//         limit: parseInt(limit),
//         offset: parseInt(offset),
//         distinct: true
//       });

//       // Add counts to each subdomain
//       const subDomainsWithCounts = subDomains.map(sub => {
//         const subData = sub.toJSON();
//         subData.childrenCount = subData.children?.length || 0;
//         subData.projectCount = subData.projects?.length || 0;
//         return subData;
//       });

//       const totalPages = Math.ceil(count / limit);

//       sendSuccess(res, 'SubDomains fetched successfully', {
//         subDomains: subDomainsWithCounts,
//         pagination: {
//           currentPage: parseInt(page),
//           totalPages,
//           totalItems: count,
//           itemsPerPage: parseInt(limit)
//         }
//       });
//     } catch (error) {
//       console.error('Get subdomains error:', error);
//       sendServerError(res, 'Failed to fetch subdomains');
//     }
//   }

//   // Get subdomain by ID with hierarchy
//   async getSubDomainById(req, res) {
//     try {
//       const { id } = req.params;

//       const subDomain = await SubDomain.findByPk(id, {
//         include: [
//           {
//             model: Domain,
//             as: 'domain',
//             attributes: ['id', 'title', 'slug']
//           },
//           {
//             model: SubDomain,
//             as: 'parent',
//             required: false
//           },
//           {
//             model: SubDomain,
//             as: 'children',
//             required: false,
//             include: [
//               {
//                 model: Project,
//                 as: 'projects',
//                 required: false,
//                 where: { isActive: true }
//               }
//             ]
//           },
//           {
//             model: Project,
//             as: 'projects',
//             required: false,
//             where: { isActive: true },
//             include: [
//               {
//                 model: Image,
//                 as: 'images',
//                 required: false,
//                 where: { entityType: 'project', isMain: true }
//               }
//             ]
//           },
//           {
//             model: Image,
//             as: 'images',
//             required: false,
//             where: { entityType: 'subdomain' },
//             order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
//           }
//         ]
//       });

//       if (!subDomain) {
//         return sendNotFound(res, 'SubDomain not found');
//       }

//       sendSuccess(res, 'SubDomain fetched successfully', subDomain);
//     } catch (error) {
//       console.error('Get subdomain by ID error:', error);
//       sendServerError(res, 'Failed to fetch subdomain');
//     }
//   }

//   // Get subdomains for a specific domain
//   async getSubDomainsByDomain(req, res) {
//     try {
//       const { domainId } = req.params;
//       const { includeProjects = false } = req.query;

//       const domain = await Domain.findByPk(domainId);
//       if (!domain) {
//         return sendNotFound(res, 'Domain not found');
//       }

//       const includeOptions = [
//         {
//           model: SubDomain,
//           as: 'children',
//           required: false
//         }
//       ];

//       if (includeProjects === 'true') {
//         includeOptions.push({
//           model: Project,
//           as: 'projects',
//           required: false,
//           where: { isActive: true },
//           attributes: ['id', 'title', 'slug', 'isFeatured']
//         });
//       }

//       const subDomains = await SubDomain.findAll({
//         where: { domainId, isActive: true },
//         include: includeOptions,
//         order: [['level', 'ASC'], ['sortOrder', 'ASC']]
//       });

//       // Build hierarchical structure
//       const buildTree = (parentId = null, level = 1) => {
//         return subDomains
//           .filter(sub => sub.parentId === parentId && sub.level === level)
//           .map(sub => ({
//             ...sub.toJSON(),
//             children: buildTree(sub.id, level + 1)
//           }));
//       };

//       const hierarchy = buildTree();

//       sendSuccess(res, 'SubDomains fetched successfully', {
//         domain: {
//           id: domain.id,
//           title: domain.title,
//           slug: domain.slug
//         },
//         subDomains: hierarchy
//       });
//     } catch (error) {
//       console.error('Get subdomains by domain error:', error);
//       sendServerError(res, 'Failed to fetch subdomains');
//     }
//   }

//   // Create new subdomain
//   async createSubDomain(req, res) {
//     try {
//       const { 
//         title, 
//         description, 
//         domainId, 
//         parentId = null, 
//         isActive = true, 
//         sortOrder = 0 
//       } = req.body;

//       // Validate domain exists
//       const domain = await Domain.findByPk(domainId);
//       if (!domain) {
//         return sendBadRequest(res, 'Domain not found');
//       }

//       // Validate parent subdomain if provided
//       let level = 1;
//       if (parentId) {
//         const parent = await SubDomain.findOne({
//           where: { id: parentId, domainId }
//         });
//         if (!parent) {
//           return sendBadRequest(res, 'Parent subdomain not found or not in the same domain');
//         }
//         level = parent.level + 1;

//         // Check max nesting level (optional - adjust as needed)
//         if (level > 5) {
//           return sendBadRequest(res, 'Maximum nesting level exceeded');
//         }
//       }

//       // Check if subdomain with this title already exists in this domain
//       const existingSubDomain = await SubDomain.findOne({
//         where: { 
//           title: { [Op.like]: title },
//           domainId
//         }
//       });

//       if (existingSubDomain) {
//         return sendBadRequest(res, 'SubDomain with this title already exists in this domain');
//       }

//       const subDomain = await SubDomain.create({
//         title,
//         description,
//         domainId,
//         parentId,
//         level,
//         isActive,
//         sortOrder,
//         isLeaf: true // Default to leaf, will be updated if children are added
//       });

//       // If this subdomain has a parent, update parent's isLeaf status
//       if (parentId) {
//         await SubDomain.update(
//           { isLeaf: false },
//           { where: { id: parentId } }
//         );
//       }

//       const createdSubDomain = await SubDomain.findByPk(subDomain.id, {
//         include: [
//           {
//             model: Domain,
//             as: 'domain',
//             attributes: ['id', 'title', 'slug']
//           },
//           {
//             model: SubDomain,
//             as: 'parent',
//             attributes: ['id', 'title', 'slug'],
//             required: false
//           }
//         ]
//       });

//       sendCreated(res, 'SubDomain created successfully', createdSubDomain);
//     } catch (error) {
//       console.error('Create subdomain error:', error);
//       sendServerError(res, 'Failed to create subdomain');
//     }
//   }

//   // Update subdomain
//   async updateSubDomain(req, res) {
//     try {
//       const { id } = req.params;
//       const { title, description, isActive, sortOrder, parentId } = req.body;

//       const subDomain = await SubDomain.findByPk(id);
//       if (!subDomain) {
//         return sendNotFound(res, 'SubDomain not found');
//       }

//       // Check if another subdomain with this title exists in the same domain
//       if (title && title !== subDomain.title) {
//         const existingSubDomain = await SubDomain.findOne({
//           where: { 
//             title: { [Op.like]: title },
//             domainId: subDomain.domainId,
//             id: { [Op.ne]: id }
//           }
//         });

//         if (existingSubDomain) {
//           return sendBadRequest(res, 'SubDomain with this title already exists in this domain');
//         }
//       }

//       // Handle parent change
//       let newLevel = subDomain.level;
//       if (parentId !== undefined && parentId !== subDomain.parentId) {
//         if (parentId === null) {
//           newLevel = 1;
//         } else {
//           // Check if new parent exists and is in same domain
//           const newParent = await SubDomain.findOne({
//             where: { id: parentId, domainId: subDomain.domainId }
//           });
//           if (!newParent) {
//             return sendBadRequest(res, 'New parent subdomain not found or not in the same domain');
//           }

//           // Check for circular reference
//           const isCircular = await this.checkCircularReference(id, parentId);
//           if (isCircular) {
//             return sendBadRequest(res, 'Cannot set parent: would create circular reference');
//           }

//           newLevel = newParent.level + 1;
          
//           // Update new parent's isLeaf status
//           await SubDomain.update(
//             { isLeaf: false },
//             { where: { id: parentId } }
//           );
//         }

//         // Update old parent's isLeaf status if it has no other children
//         if (subDomain.parentId) {
//           const siblingCount = await SubDomain.count({
//             where: { 
//               parentId: subDomain.parentId,
//               id: { [Op.ne]: id }
//             }
//           });
//           if (siblingCount === 0) {
//             await SubDomain.update(
//               { isLeaf: true },
//               { where: { id: subDomain.parentId } }
//             );
//           }
//         }
//       }

//       // Update the subdomain
//       await subDomain.update({
//         title: title || subDomain.title,
//         description: description !== undefined ? description : subDomain.description,
//         isActive: isActive !== undefined ? isActive : subDomain.isActive,
//         sortOrder: sortOrder !== undefined ? sortOrder : subDomain.sortOrder,
//         parentId: parentId !== undefined ? parentId : subDomain.parentId,
//         level: newLevel
//       });

//       // Update all children's levels recursively if level changed
//       if (newLevel !== subDomain.level) {
//         await this.updateChildrenLevels(id, newLevel);
//       }

//       const updatedSubDomain = await SubDomain.findByPk(id, {
//         include: [
//           {
//             model: Domain,
//             as: 'domain',
//             attributes: ['id', 'title', 'slug']
//           },
//           {
//             model: SubDomain,
//             as: 'parent',
//             attributes: ['id', 'title', 'slug'],
//             required: false
//           },
//           {
//             model: Image,
//             as: 'images',
//             required: false,
//             where: { entityType: 'subdomain' }
//           }
//         ]
//       });

//       sendSuccess(res, 'SubDomain updated successfully', updatedSubDomain);
//     } catch (error) {
//       console.error('Update subdomain error:', error);
//       sendServerError(res, 'Failed to update subdomain');
//     }
//   }

//   // Delete subdomain
//   async deleteSubDomain(req, res) {
//     try {
//       const { id } = req.params;
//       const { force = false } = req.query;

//       const subDomain = await SubDomain.findByPk(id, {
//         include: [
//           {
//             model: SubDomain,
//             as: 'children'
//           },
//           {
//             model: Project,
//             as: 'projects',
//             where: { isActive: true },
//             required: false
//           }
//         ]
//       });

//       if (!subDomain) {
//         return sendNotFound(res, 'SubDomain not found');
//       }

//       // Check if subdomain has children or projects
//       const hasChildren = subDomain.children && subDomain.children.length > 0;
//       const hasProjects = subDomain.projects && subDomain.projects.length > 0;

//       if ((hasChildren || hasProjects) && force !== 'true') {
//         return sendBadRequest(res, 
//           'Cannot delete subdomain that contains children or projects. Use force=true to delete anyway, or move them first.'
//         );
//       }

//       // If force delete, handle children and projects
//       if (force === 'true') {
//         // Delete all images for projects in this subdomain
//         if (hasProjects) {
//           const projectIds = subDomain.projects.map(p => p.id);
//           await Image.destroy({
//             where: {
//               entityType: 'project',
//               entityId: { [Op.in]: projectIds }
//             }
//           });
//           // Delete projects
//           await Project.destroy({
//             where: { subDomainId: id }
//           });
//         }

//         // Recursively delete children
//         if (hasChildren) {
//           for (const child of subDomain.children) {
//             await this.deleteSubDomainRecursive(child.id);
//           }
//         }
//       }

//       // Update parent's isLeaf status if this was the only child
//       if (subDomain.parentId) {
//         const siblingCount = await SubDomain.count({
//           where: { 
//             parentId: subDomain.parentId,
//             id: { [Op.ne]: id }
//           }
//         });
//         if (siblingCount === 0) {
//           await SubDomain.update(
//             { isLeaf: true },
//             { where: { id: subDomain.parentId } }
//           );
//         }
//       }

//       // Delete associated images
//       await Image.destroy({
//         where: {
//           entityType: 'subdomain',
//           entityId: id
//         }
//       });

//       // Delete the subdomain
//       await subDomain.destroy();

//       sendSuccess(res, 'SubDomain deleted successfully');
//     } catch (error) {
//       console.error('Delete subdomain error:', error);
//       sendServerError(res, 'Failed to delete subdomain');
//     }
//   }

//   // Get leaf subdomains (can contain projects)
//   async getLeafSubDomains(req, res) {
//     try {
//       const { domainId } = req.query;
//       const whereClause = { isLeaf: true, isActive: true };
      
//       if (domainId) {
//         whereClause.domainId = domainId;
//       }

//       const leafSubDomains = await SubDomain.findAll({
//         where: whereClause,
//         include: [
//           {
//             model: Domain,
//             as: 'domain',
//             attributes: ['id', 'title', 'slug']
//           },
//           {
//             model: Project,
//             as: 'projects',
//             where: { isActive: true },
//             required: false,
//             attributes: ['id']
//           }
//         ],
//         order: [['domainId', 'ASC'], ['level', 'ASC'], ['sortOrder', 'ASC']]
//       });

//       const leafsWithCounts = leafSubDomains.map(leaf => ({
//         ...leaf.toJSON(),
//         projectCount: leaf.projects?.length || 0
//       }));

//       sendSuccess(res, 'Leaf subdomains fetched successfully', leafsWithCounts);
//     } catch (error) {
//       console.error('Get leaf subdomains error:', error);
//       sendServerError(res, 'Failed to fetch leaf subdomains');
//     }
//   }

//   // Helper method to check circular reference
//   async checkCircularReference(subDomainId, newParentId) {
//     let currentParent = newParentId;
    
//     while (currentParent) {
//       if (currentParent === subDomainId) {
//         return true;
//       }
      
//       const parent = await SubDomain.findByPk(currentParent);
//       currentParent = parent?.parentId;
//     }
    
//     return false;
//   }

//   // Helper method to update children levels recursively
//   async updateChildrenLevels(parentId, parentLevel) {
//     const children = await SubDomain.findAll({
//       where: { parentId }
//     });

//     for (const child of children) {
//       const newChildLevel = parentLevel + 1;
//       await child.update({ level: newChildLevel });
//       await this.updateChildrenLevels(child.id, newChildLevel);
//     }
//   }

//   // Helper method to delete subdomain recursively
//   async deleteSubDomainRecursive(subDomainId) {
//     const subDomain = await SubDomain.findByPk(subDomainId, {
//       include: [
//         { model: SubDomain, as: 'children' },
//         { model: Project, as: 'projects' }
//       ]
//     });

//     if (!subDomain) return;

//     // Delete projects and their images
//     if (subDomain.projects?.length > 0) {
//       const projectIds = subDomain.projects.map(p => p.id);
//       await Image.destroy({
//         where: {
//           entityType: 'project',
//           entityId: { [Op.in]: projectIds }
//         }
//       });
//       await Project.destroy({
//         where: { subDomainId }
//       });
//     }

//     // Recursively delete children
//     if (subDomain.children?.length > 0) {
//       for (const child of subDomain.children) {
//         await this.deleteSubDomainRecursive(child.id);
//       }
//     }

//     // Delete subdomain images
//     await Image.destroy({
//       where: {
//         entityType: 'subdomain',
//         entityId: subDomainId
//       }
//     });

//     // Delete subdomain
//     await subDomain.destroy();
//   }
// }

// module.exports = new SubDomainController();