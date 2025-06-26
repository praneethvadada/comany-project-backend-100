//controllers/projectController.js - COMPLETE FIXED VERSION

const { Domain, SubDomain, Project, Lead, Image } = require('../models');
const { 
  sendSuccess, 
  sendCreated, 
  sendBadRequest, 
  sendNotFound,
  sendServerError 
} = require('../utils/responseHelper');
const { Op } = require('sequelize');

// ✅ FIXED: Helper function to generate slug from title
const generateSlug = (title) => {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  
  console.log('🔗 HELPER: Generated slug:', slug, 'from title:', title);
  return slug;
};

// Helper function to clean and validate query parameters
const cleanQueryParams = (params) => {
  const cleaned = {};
  
  Object.keys(params).forEach(key => {
    const value = params[key];
    
    // Skip empty strings, null, undefined
    if (value === '' || value === null || value === undefined) {
      return;
    }
    
    // Convert string 'true'/'false' to boolean for certain fields
    if (['isActive', 'isFeatured', 'isArchived'].includes(key)) {
      if (value === 'true') cleaned[key] = true;
      else if (value === 'false') cleaned[key] = false;
      return;
    }
    
    // Convert numeric strings to numbers for ID fields
    if (key.endsWith('Id') || key === 'page' || key === 'limit') {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        cleaned[key] = numValue;
      }
      return;
    }
    
    // Keep string values as-is
    cleaned[key] = value;
  });
  
  return cleaned;
};

// Helper function to validate required fields
const validateProjectData = (data, isUpdate = false) => {
  const errors = [];
  
  if (!isUpdate || data.title !== undefined) {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters long');
    }
    if (data.title && data.title.length > 100) {
      errors.push('Title must be less than 100 characters');
    }
  }
  
  if (!isUpdate || data.abstract !== undefined) {
    if (!data.abstract || typeof data.abstract !== 'string' || data.abstract.trim().length < 10) {
      errors.push('Abstract must be at least 10 characters long');
    }
  }
  
  if (!isUpdate || data.specifications !== undefined) {
    if (!data.specifications || typeof data.specifications !== 'string' || data.specifications.trim().length < 10) {
      errors.push('Specifications must be at least 10 characters long');
    }
  }
  
  if (!isUpdate || data.learningOutcomes !== undefined) {
    if (!data.learningOutcomes || typeof data.learningOutcomes !== 'string' || data.learningOutcomes.trim().length < 10) {
      errors.push('Learning outcomes must be at least 10 characters long');
    }
  }
  
  if (!isUpdate) {
    if (!data.subDomainId || isNaN(parseInt(data.subDomainId))) {
      errors.push('Valid subdomain ID is required');
    }
  }
  
  return errors;
};

class ProjectController {
  // Get all projects with pagination and filtering
  async getAllProjects(req, res) {
    try {
      console.log('🚀 ProjectController: getAllProjects called');
      console.log('📥 Raw query params:', req.query);
      
      // Clean and validate query parameters
      const cleanedParams = cleanQueryParams(req.query);
      console.log('🧹 Cleaned params:', cleanedParams);
      
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        subDomainId,
        domainId,
        isActive,
        isFeatured,
        isArchived,
        sortBy = 'updatedAt',
        sortOrder = 'DESC'
      } = cleanedParams;

      console.log('🎛️ Filter values:', {
        page, limit, search, subDomainId, domainId, 
        isActive, isFeatured, isArchived, sortBy, sortOrder
      });

      const offset = (page - 1) * limit;
      const whereClause = {};
      const includeWhere = {};

      // Build search condition
      if (search) {
        whereClause[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { abstract: { [Op.like]: `%${search}%` } },
          { specifications: { [Op.like]: `%${search}%` } }
        ];
        console.log('🔍 Search condition added:', search);
      }

      // Add filters
      if (subDomainId !== undefined) {
        whereClause.subDomainId = subDomainId;
        console.log('📁 SubDomain filter added:', subDomainId);
      }
      
      if (isActive !== undefined) {
        whereClause.isActive = isActive;
        console.log('📊 IsActive filter added:', isActive);
      }
      
      if (isFeatured !== undefined) {
        whereClause.isFeatured = isFeatured;
        console.log('⭐ IsFeatured filter added:', isFeatured);
      }
      
      // Handle archived status
      if (isArchived !== undefined) {
        whereClause.isActive = isArchived === true ? false : true;
        console.log('📦 Archived filter added:', isArchived);
      }

      if (domainId !== undefined) {
        includeWhere.domainId = domainId;
        console.log('🏢 Domain filter added:', domainId);
      }

      console.log('🔧 Final whereClause:', whereClause);
      console.log('🔧 Final includeWhere:', includeWhere);

      const queryOptions = {
        where: whereClause,
        include: [
          {
            model: SubDomain,
            as: 'subDomain',
            ...(Object.keys(includeWhere).length > 0 ? { where: includeWhere } : {}),
            include: [
              {
                model: Domain,
                as: 'domain',
                attributes: ['id', 'title', 'slug']
              }
            ]
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'project' },
            order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
          },
          {
            model: Lead,
            as: 'leads',
            required: false,
            attributes: ['id', 'status']
          }
        ],
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      };

      console.log('📡 Executing database query...');

      const { count, rows: projects } = await Project.findAndCountAll(queryOptions);

      console.log('✅ Database query successful');
      console.log('📊 Results: count =', count, ', projects =', projects.length);

      // Add lead counts and status
      const projectsWithCounts = projects.map(project => {
        const projectData = project.toJSON();
        projectData.leadCount = projectData.leads?.length || 0;
        projectData.newLeadCount = projectData.leads?.filter(lead => lead.status === 'new').length || 0;
        projectData.isArchived = !projectData.isActive;
        return projectData;
      });

      const totalPages = Math.ceil(count / limit);

      const responseData = {
        projects: projectsWithCounts,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      };

      console.log('📤 Sending response:', {
        projectsCount: responseData.projects.length,
        pagination: responseData.pagination
      });

      sendSuccess(res, 'Projects fetched successfully', responseData);
    } catch (error) {
      console.error('❌ ProjectController: Get projects error:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        sql: error.sql
      });
      sendServerError(res, 'Failed to fetch projects');
    }
  }

  // ✅ FIXED: Create new project - WITH SLUG GENERATION
  async createProject(req, res) {
    try {
      console.log('🚀 ProjectController: createProject called');
      console.log('📥 Request body:', req.body);
      console.log('📥 Request headers:', req.headers);
      console.log('📥 Content-Type:', req.headers['content-type']);
      
      // Validate Content-Type
      if (!req.headers['content-type'] || !req.headers['content-type'].includes('application/json')) {
        console.log('❌ Invalid Content-Type:', req.headers['content-type']);
        return sendBadRequest(res, 'Content-Type must be application/json');
      }
      
      // Validate request body exists
      if (!req.body || Object.keys(req.body).length === 0) {
        console.log('❌ Empty request body');
        return sendBadRequest(res, 'Request body is required');
      }
      
      const { 
        title, 
        abstract, 
        specifications, 
        learningOutcomes, 
        subDomainId,
        isActive = true,
        isFeatured = false,
        sortOrder = 0
      } = req.body;

      console.log('🔧 Extracted fields:', {
        title: title ? `"${title}" (${title.length} chars)` : 'MISSING',
        abstract: abstract ? `"${abstract.substring(0, 50)}..." (${abstract.length} chars)` : 'MISSING',
        specifications: specifications ? `"${specifications.substring(0, 50)}..." (${specifications.length} chars)` : 'MISSING',
        learningOutcomes: learningOutcomes ? `"${learningOutcomes.substring(0, 50)}..." (${learningOutcomes.length} chars)` : 'MISSING',
        subDomainId: subDomainId || 'MISSING',
        isActive, 
        isFeatured, 
        sortOrder
      });

      // Validate required fields
      const validationErrors = validateProjectData(req.body);
      if (validationErrors.length > 0) {
        console.log('❌ Validation errors:', validationErrors);
        return sendBadRequest(res, `Validation failed: ${validationErrors.join(', ')}`);
      }

      // Validate subdomain exists and is a leaf
      console.log('🔍 Looking up subdomain with ID:', subDomainId);
      const subDomain = await SubDomain.findByPk(subDomainId);
      if (!subDomain) {
        console.log('❌ SubDomain not found:', subDomainId);
        return sendBadRequest(res, 'SubDomain not found');
      }

      console.log('✅ SubDomain found:', {
        id: subDomain.id,
        title: subDomain.title,
        isLeaf: subDomain.isLeaf
      });

      if (!subDomain.isLeaf) {
        console.log('❌ SubDomain is not a leaf');
        return sendBadRequest(res, 'Projects can only be added to leaf subdomains');
      }

      // Check if project with this title already exists in this subdomain
      console.log('🔍 Checking for existing project with title:', title);
      const existingProject = await Project.findOne({
        where: { 
          title: { [Op.like]: title.trim() },
          subDomainId
        }
      });

      if (existingProject) {
        console.log('❌ Project with this title already exists:', title);
        return sendBadRequest(res, 'Project with this title already exists in this subdomain');
      }

      console.log('📡 Creating project...');
      
      // ✅ GENERATE SLUG FROM TITLE
      const projectSlug = generateSlug(title.trim());
      console.log('🔗 CONTROLLER: Using slug:', projectSlug);
      
      const projectData = {
        title: title.trim(),
        slug: projectSlug, // ✅ ADD GENERATED SLUG
        abstract: abstract.trim(),
        specifications: specifications.trim(),
        learningOutcomes: learningOutcomes.trim(),
        subDomainId: parseInt(subDomainId),
        isActive,
        isFeatured,
        sortOrder: parseInt(sortOrder) || 0
      };
      
      console.log('📊 Final project data with slug:', projectData);
      
      const project = await Project.create(projectData);

      console.log('✅ Project created with ID:', project.id, 'and slug:', project.slug);

      // Fetch the created project with associations
      const createdProject = await Project.findByPk(project.id, {
        include: [
          {
            model: SubDomain,
            as: 'subDomain',
            include: [
              {
                model: Domain,
                as: 'domain',
                attributes: ['id', 'title', 'slug']
              }
            ]
          }
        ]
      });

      console.log('📤 Sending created project response');
      sendCreated(res, 'Project created successfully', createdProject);
    } catch (error) {
      console.error('❌ ProjectController: Create project error:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        sql: error.sql,
        original: error.original
      });
      
      // Handle specific database errors
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(err => err.message);
        return sendBadRequest(res, `Validation failed: ${validationErrors.join(', ')}`);
      }
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return sendBadRequest(res, 'A project with this title already exists in this subdomain');
      }
      
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return sendBadRequest(res, 'Invalid subdomain ID provided');
      }
      
      sendServerError(res, 'Failed to create project');
    }
  }

  // Get project by ID with full details
  async getProjectById(req, res) {
    try {
      const { id } = req.params;
      console.log('🚀 ProjectController: getProjectById called for ID:', id);

      const project = await Project.findByPk(id, {
        include: [
          {
            model: SubDomain,
            as: 'subDomain',
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
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'project' },
            order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
          },
          {
            model: Lead,
            as: 'leads',
            required: false,
            order: [['createdAt', 'DESC']]
          }
        ]
      });

      if (!project) {
        console.log('❌ Project not found for ID:', id);
        return sendNotFound(res, 'Project not found');
      }

      console.log('✅ Project found:', project.title);

      // Add computed fields
      const projectData = project.toJSON();
      projectData.leadCount = projectData.leads?.length || 0;
      projectData.newLeadCount = projectData.leads?.filter(lead => lead.status === 'new').length || 0;
      projectData.isArchived = !projectData.isActive;

      console.log('📤 Sending project data with leadCount:', projectData.leadCount);
      sendSuccess(res, 'Project fetched successfully', projectData);
    } catch (error) {
      console.error('❌ ProjectController: Get project by ID error:', error);
      sendServerError(res, 'Failed to fetch project');
    }
  }

  // Update project - ENHANCED WITH BETTER VALIDATION
  async updateProject(req, res) {
    try {
      const { id } = req.params;
      console.log('🚀 ProjectController: updateProject called for ID:', id);
      console.log('📥 Request body:', req.body);
      
      // Validate request body
      if (!req.body || Object.keys(req.body).length === 0) {
        return sendBadRequest(res, 'Request body is required');
      }
      
      const { 
        title, 
        abstract, 
        specifications, 
        learningOutcomes, 
        isActive,
        isFeatured,
        sortOrder
      } = req.body;

      const project = await Project.findByPk(id);
      if (!project) {
        console.log('❌ Project not found:', id);
        return sendNotFound(res, 'Project not found');
      }

      console.log('✅ Project found:', project.title);

      // Validate fields if they are being updated
      const validationErrors = validateProjectData(req.body, true);
      if (validationErrors.length > 0) {
        console.log('❌ Validation errors:', validationErrors);
        return sendBadRequest(res, `Validation failed: ${validationErrors.join(', ')}`);
      }

      // Check if another project with this title exists in the same subdomain
      if (title && title.trim() !== project.title) {
        const existingProject = await Project.findOne({
          where: { 
            title: { [Op.like]: title.trim() },
            subDomainId: project.subDomainId,
            id: { [Op.ne]: id }
          }
        });

        if (existingProject) {
          console.log('❌ Another project with this title exists:', title);
          return sendBadRequest(res, 'Project with this title already exists in this subdomain');
        }
      }

      console.log('📡 Updating project...');
      const updateData = {};
      
      if (title !== undefined) {
        updateData.title = title.trim();
        // ✅ UPDATE SLUG WHEN TITLE CHANGES
        updateData.slug = generateSlug(title.trim());
        console.log('🔗 CONTROLLER: Updated slug to:', updateData.slug);
      }
      if (abstract !== undefined) updateData.abstract = abstract.trim();
      if (specifications !== undefined) updateData.specifications = specifications.trim();
      if (learningOutcomes !== undefined) updateData.learningOutcomes = learningOutcomes.trim();
      if (isActive !== undefined) updateData.isActive = isActive;
      if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
      if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder) || 0;
      
      console.log('📊 Update data:', updateData);
      
      await project.update(updateData);

      console.log('✅ Project updated successfully');

      const updatedProject = await Project.findByPk(id, {
        include: [
          {
            model: SubDomain,
            as: 'subDomain',
            include: [
              {
                model: Domain,
                as: 'domain',
                attributes: ['id', 'title', 'slug']
              }
            ]
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'project' }
          }
        ]
      });

      console.log('📤 Sending updated project response');
      sendSuccess(res, 'Project updated successfully', updatedProject);
    } catch (error) {
      console.error('❌ ProjectController: Update project error:', error);
      
      // Handle specific database errors
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(err => err.message);
        return sendBadRequest(res, `Validation failed: ${validationErrors.join(', ')}`);
      }
      
      sendServerError(res, 'Failed to update project');
    }
  }

  // Move project to different subdomain
  async moveProject(req, res) {
    try {
      const { id } = req.params;
      const { newSubDomainId, reason } = req.body;
      
      console.log('🚀 ProjectController: moveProject called');
      console.log('📥 Project ID:', id, 'New SubDomain ID:', newSubDomainId, 'Reason:', reason);

      const project = await Project.findByPk(id, {
        include: [
          {
            model: SubDomain,
            as: 'subDomain',
            include: [{ model: Domain, as: 'domain' }]
          }
        ]
      });

      if (!project) {
        console.log('❌ Project not found:', id);
        return sendNotFound(res, 'Project not found');
      }

      console.log('✅ Project found:', project.title);

      // Validate new subdomain
      const newSubDomain = await SubDomain.findByPk(newSubDomainId, {
        include: [{ model: Domain, as: 'domain' }]
      });

      if (!newSubDomain) {
        console.log('❌ New subdomain not found:', newSubDomainId);
        return sendBadRequest(res, 'New subdomain not found');
      }

      console.log('✅ New subdomain found:', newSubDomain.title);

      if (!newSubDomain.isLeaf) {
        console.log('❌ New subdomain is not a leaf');
        return sendBadRequest(res, 'Projects can only be moved to leaf subdomains');
      }

      if (project.subDomainId === newSubDomainId) {
        console.log('❌ Project is already in this subdomain');
        return sendBadRequest(res, 'Project is already in this subdomain');
      }

      // Check if project with same title exists in target subdomain
      const existingProject = await Project.findOne({
        where: { 
          title: { [Op.like]: project.title },
          subDomainId: newSubDomainId
        }
      });

      if (existingProject) {
        console.log('❌ Project with same title exists in target subdomain');
        return sendBadRequest(res, 'Project with this title already exists in the target subdomain');
      }

      const oldSubDomain = project.subDomain;

      console.log('📡 Moving project...');
      await project.update({ 
        subDomainId: newSubDomainId,
        sortOrder: 0
      });

      console.log(`✅ Project "${project.title}" moved from ${oldSubDomain.domain.title}/${oldSubDomain.title} to ${newSubDomain.domain.title}/${newSubDomain.title}${reason ? '. Reason: ' + reason : ''}`);

      const movedProject = await Project.findByPk(id, {
        include: [
          {
            model: SubDomain,
            as: 'subDomain',
            include: [
              {
                model: Domain,
                as: 'domain',
                attributes: ['id', 'title', 'slug']
              }
            ]
          }
        ]
      });

      const responseData = {
        project: movedProject,
        moveDetails: {
          from: {
            domain: oldSubDomain.domain.title,
            subDomain: oldSubDomain.title
          },
          to: {
            domain: newSubDomain.domain.title,
            subDomain: newSubDomain.title
          },
          reason: reason || 'No reason provided'
        }
      };

      console.log('📤 Sending move response');
      sendSuccess(res, 'Project moved successfully', responseData);
    } catch (error) {
      console.error('❌ ProjectController: Move project error:', error);
      sendServerError(res, 'Failed to move project');
    }
  }

  // Archive/Unarchive project
  async archiveProject(req, res) {
    try {
      const { id } = req.params;
      const { archive = true, reason } = req.body;
      
      console.log('🚀 ProjectController: archiveProject called');
      console.log('📥 Project ID:', id, 'Archive:', archive, 'Reason:', reason);

      const project = await Project.findByPk(id, {
        include: [
          {
            model: SubDomain,
            as: 'subDomain',
            include: [{ model: Domain, as: 'domain' }]
          }
        ]
      });

      if (!project) {
        console.log('❌ Project not found:', id);
        return sendNotFound(res, 'Project not found');
      }

      console.log('✅ Project found:', project.title, 'Current isActive:', project.isActive);

      const isArchiving = archive === true;
      const newActiveStatus = !isArchiving;

      if (project.isActive === newActiveStatus) {
        console.log('❌ Project is already', isArchiving ? 'archived' : 'active');
        return sendBadRequest(res, `Project is already ${isArchiving ? 'archived' : 'active'}`);
      }

      console.log('📡 Archiving/restoring project...');
      await project.update({ 
        isActive: newActiveStatus,
        isFeatured: isArchiving ? false : project.isFeatured
      });

      const action = isArchiving ? 'archived' : 'restored';
      console.log(`✅ Project "${project.title}" ${action}${reason ? '. Reason: ' + reason : ''}`);

      const updatedProject = await Project.findByPk(id, {
        include: [
          {
            model: SubDomain,
            as: 'subDomain',
            include: [
              {
                model: Domain,
                as: 'domain',
                attributes: ['id', 'title', 'slug']
              }
            ]
          }
        ]
      });

      const responseData = {
        project: updatedProject,
        action,
        reason: reason || `No reason provided for ${action}`
      };

      console.log('📤 Sending archive response');
      sendSuccess(res, `Project ${action} successfully`, responseData);
    } catch (error) {
      console.error('❌ ProjectController: Archive project error:', error);
      sendServerError(res, 'Failed to archive/restore project');
    }
  }

  // Delete project permanently
  async deleteProject(req, res) {
    try {
      const { id } = req.params;
      const { confirm = false } = req.body;
      
      console.log('🚀 ProjectController: deleteProject called');
      console.log('📥 Project ID:', id, 'Confirm:', confirm);

      if (!confirm) {
        console.log('❌ Delete not confirmed');
        return sendBadRequest(res, 'Please confirm deletion by setting confirm=true in request body');
      }

      const project = await Project.findByPk(id, {
        include: [
          {
            model: Lead,
            as: 'leads'
          }
        ]
      });

      if (!project) {
        console.log('❌ Project not found:', id);
        return sendNotFound(res, 'Project not found');
      }

      console.log('✅ Project found:', project.title);

      const hasLeads = project.leads && project.leads.length > 0;
      
      if (hasLeads) {
        console.log('❌ Project has leads, cannot delete:', project.leads.length);
        return sendBadRequest(res, 
          `Cannot delete project that has ${project.leads.length} lead(s). Archive it instead or delete leads first.`
        );
      }

      console.log('📡 Deleting associated images...');
      await Image.destroy({
        where: {
          entityType: 'project',
          entityId: id
        }
      });

      console.log('📡 Deleting project...');
      await project.destroy();

      console.log('✅ Project deleted successfully');
      sendSuccess(res, 'Project deleted successfully');
    } catch (error) {
      console.error('❌ ProjectController: Delete project error:', error);
      sendServerError(res, 'Failed to delete project');
    }
  }

  // Get project statistics
  async getProjectStats(req, res) {
    try {
      const { id } = req.params;
      console.log('🚀 ProjectController: getProjectStats called for ID:', id);

      const project = await Project.findByPk(id, {
        include: [
          {
            model: SubDomain,
            as: 'subDomain',
            include: [{ model: Domain, as: 'domain' }]
          },
          {
            model: Lead,
            as: 'leads'
          }
        ]
      });

      if (!project) {
        console.log('❌ Project not found:', id);
        return sendNotFound(res, 'Project not found');
      }

      console.log('✅ Project found for stats:', project.title);

      const leads = project.leads || [];
      const leadStats = {
        total: leads.length,
        new: leads.filter(l => l.status === 'new').length,
        contacted: leads.filter(l => l.status === 'contacted').length,
        converted: leads.filter(l => l.status === 'converted').length,
        closed: leads.filter(l => l.status === 'closed').length
      };

      const stats = {
        project: {
          id: project.id,
          title: project.title,
          isActive: project.isActive,
          isFeatured: project.isFeatured,
          viewCount: project.viewCount,
          leadCount: project.leadCount
        },
        location: {
          domain: project.subDomain.domain.title,
          subDomain: project.subDomain.title
        },
        leads: leadStats,
        performance: {
          conversionRate: leads.length > 0 ? ((leadStats.converted / leads.length) * 100).toFixed(2) + '%' : '0%',
          activeLeads: leadStats.new + leadStats.contacted
        }
      };

      console.log('📤 Sending project stats');
      sendSuccess(res, 'Project statistics fetched successfully', stats);
    } catch (error) {
      console.error('❌ ProjectController: Get project stats error:', error);
      sendServerError(res, 'Failed to fetch project statistics');
    }
  }

  // Bulk operations
  async bulkUpdateProjects(req, res) {
    try {
      const { projectIds, updates } = req.body;
      console.log('🚀 ProjectController: bulkUpdateProjects called');
      console.log('📥 Project IDs:', projectIds, 'Updates:', updates);

      if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
        console.log('❌ Invalid project IDs array');
        return sendBadRequest(res, 'Project IDs array is required');
      }

      if (!updates || Object.keys(updates).length === 0) {
        console.log('❌ No updates provided');
        return sendBadRequest(res, 'Updates object is required');
      }

      const projects = await Project.findAll({
        where: { id: { [Op.in]: projectIds } }
      });

      if (projects.length !== projectIds.length) {
        console.log('❌ Some projects not found. Expected:', projectIds.length, 'Found:', projects.length);
        return sendBadRequest(res, 'Some projects were not found');
      }

      console.log('✅ All projects found');

      const allowedUpdates = ['isActive', 'isFeatured', 'sortOrder'];
      const filteredUpdates = {};
      
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      if (Object.keys(filteredUpdates).length === 0) {
        console.log('❌ No valid updates after filtering');
        return sendBadRequest(res, 'No valid updates provided');
      }

      console.log('🔧 Filtered updates:', filteredUpdates);
      console.log('📡 Performing bulk update...');

      await Project.update(filteredUpdates, {
        where: { id: { [Op.in]: projectIds } }
      });

      console.log('✅ Bulk update completed');

      const responseData = {
        updatedCount: projectIds.length,
        updates: filteredUpdates
      };

      console.log('📤 Sending bulk update response');
      sendSuccess(res, `${projectIds.length} projects updated successfully`, responseData);
    } catch (error) {
      console.error('❌ ProjectController: Bulk update projects error:', error);
      sendServerError(res, 'Failed to update projects');
    }
  }
}

module.exports = new ProjectController();



// //controllers/projectController.js

// const { Domain, SubDomain, Project, Lead, Image } = require('../models');
// const { 
//   sendSuccess, 
//   sendCreated, 
//   sendBadRequest, 
//   sendNotFound,
//   sendServerError 
// } = require('../utils/responseHelper');
// const { Op } = require('sequelize');

// // Helper function to generate slug from title
// const generateSlug = (title) => {
//   return title
//     .toLowerCase()
//     .trim()
//     .replace(/[^\w\s-]/g, '') // Remove special characters
//     .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
//     .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
//     console.log('🔗 CONTROLLER: Generated slug:', slug, 'from title:', title);
//     return slug;
// };

// // Helper function to clean and validate query parameters
// const cleanQueryParams = (params) => {
//   const cleaned = {};
  
//   Object.keys(params).forEach(key => {
//     const value = params[key];
    
//     // Skip empty strings, null, undefined
//     if (value === '' || value === null || value === undefined) {
//       return;
//     }
    
//     // Convert string 'true'/'false' to boolean for certain fields
//     if (['isActive', 'isFeatured', 'isArchived'].includes(key)) {
//       if (value === 'true') cleaned[key] = true;
//       else if (value === 'false') cleaned[key] = false;
//       return;
//     }
    
//     // Convert numeric strings to numbers for ID fields
//     if (key.endsWith('Id') || key === 'page' || key === 'limit') {
//       const numValue = parseInt(value, 10);
//       if (!isNaN(numValue)) {
//         cleaned[key] = numValue;
//       }
//       return;
//     }
    
//     // Keep string values as-is
//     cleaned[key] = value;
//   });
  
//   return cleaned;
// };

// // Helper function to validate required fields
// const validateProjectData = (data, isUpdate = false) => {
//   const errors = [];
  
//   if (!isUpdate || data.title !== undefined) {
//     if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 3) {
//       errors.push('Title must be at least 3 characters long');
//     }
//     if (data.title && data.title.length > 100) {
//       errors.push('Title must be less than 100 characters');
//     }
//   }
  
//   if (!isUpdate || data.abstract !== undefined) {
//     if (!data.abstract || typeof data.abstract !== 'string' || data.abstract.trim().length < 10) {
//       errors.push('Abstract must be at least 10 characters long');
//     }
//   }
  
//   if (!isUpdate || data.specifications !== undefined) {
//     if (!data.specifications || typeof data.specifications !== 'string' || data.specifications.trim().length < 10) {
//       errors.push('Specifications must be at least 10 characters long');
//     }
//   }
  
//   if (!isUpdate || data.learningOutcomes !== undefined) {
//     if (!data.learningOutcomes || typeof data.learningOutcomes !== 'string' || data.learningOutcomes.trim().length < 10) {
//       errors.push('Learning outcomes must be at least 10 characters long');
//     }
//   }
  
//   if (!isUpdate) {
//     if (!data.subDomainId || isNaN(parseInt(data.subDomainId))) {
//       errors.push('Valid subdomain ID is required');
//     }
//   }
  
//   return errors;
// };

// class ProjectController {
//   // Get all projects with pagination and filtering
//   async getAllProjects(req, res) {
//     try {
//       console.log('🚀 ProjectController: getAllProjects called');
//       console.log('📥 Raw query params:', req.query);
      
//       // Clean and validate query parameters
//       const cleanedParams = cleanQueryParams(req.query);
//       console.log('🧹 Cleaned params:', cleanedParams);
      
//       const { 
//         page = 1, 
//         limit = 10, 
//         search = '', 
//         subDomainId,
//         domainId,
//         isActive,
//         isFeatured,
//         isArchived,
//         sortBy = 'updatedAt',
//         sortOrder = 'DESC'
//       } = cleanedParams;

//       console.log('🎛️ Filter values:', {
//         page, limit, search, subDomainId, domainId, 
//         isActive, isFeatured, isArchived, sortBy, sortOrder
//       });

//       const offset = (page - 1) * limit;
//       const whereClause = {};
//       const includeWhere = {};

//       // Build search condition
//       if (search) {
//         whereClause[Op.or] = [
//           { title: { [Op.like]: `%${search}%` } },
//           { abstract: { [Op.like]: `%${search}%` } },
//           { specifications: { [Op.like]: `%${search}%` } }
//         ];
//         console.log('🔍 Search condition added:', search);
//       }

//       // Add filters
//       if (subDomainId !== undefined) {
//         whereClause.subDomainId = subDomainId;
//         console.log('📁 SubDomain filter added:', subDomainId);
//       }
      
//       if (isActive !== undefined) {
//         whereClause.isActive = isActive;
//         console.log('📊 IsActive filter added:', isActive);
//       }
      
//       if (isFeatured !== undefined) {
//         whereClause.isFeatured = isFeatured;
//         console.log('⭐ IsFeatured filter added:', isFeatured);
//       }
      
//       // Handle archived status
//       if (isArchived !== undefined) {
//         whereClause.isActive = isArchived === true ? false : true;
//         console.log('📦 Archived filter added:', isArchived);
//       }

//       if (domainId !== undefined) {
//         includeWhere.domainId = domainId;
//         console.log('🏢 Domain filter added:', domainId);
//       }

//       console.log('🔧 Final whereClause:', whereClause);
//       console.log('🔧 Final includeWhere:', includeWhere);

//       const queryOptions = {
//         where: whereClause,
//         include: [
//           {
//             model: SubDomain,
//             as: 'subDomain',
//             ...(Object.keys(includeWhere).length > 0 ? { where: includeWhere } : {}),
//             include: [
//               {
//                 model: Domain,
//                 as: 'domain',
//                 attributes: ['id', 'title', 'slug']
//               }
//             ]
//           },
//           {
//             model: Image,
//             as: 'images',
//             required: false,
//             where: { entityType: 'project' },
//             order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
//           },
//           {
//             model: Lead,
//             as: 'leads',
//             required: false,
//             attributes: ['id', 'status']
//           }
//         ],
//         order: [[sortBy, sortOrder]],
//         limit: parseInt(limit),
//         offset: parseInt(offset),
//         distinct: true
//       };

//       console.log('📡 Executing database query...');

//       const { count, rows: projects } = await Project.findAndCountAll(queryOptions);

//       console.log('✅ Database query successful');
//       console.log('📊 Results: count =', count, ', projects =', projects.length);

//       // Add lead counts and status
//       const projectsWithCounts = projects.map(project => {
//         const projectData = project.toJSON();
//         projectData.leadCount = projectData.leads?.length || 0;
//         projectData.newLeadCount = projectData.leads?.filter(lead => lead.status === 'new').length || 0;
//         projectData.isArchived = !projectData.isActive;
//         return projectData;
//       });

//       const totalPages = Math.ceil(count / limit);

//       const responseData = {
//         projects: projectsWithCounts,
//         pagination: {
//           currentPage: parseInt(page),
//           totalPages,
//           totalItems: count,
//           itemsPerPage: parseInt(limit)
//         }
//       };

//       console.log('📤 Sending response:', {
//         projectsCount: responseData.projects.length,
//         pagination: responseData.pagination
//       });

//       sendSuccess(res, 'Projects fetched successfully', responseData);
//     } catch (error) {
//       console.error('❌ ProjectController: Get projects error:', error);
//       console.error('❌ Error stack:', error.stack);
//       console.error('❌ Error details:', {
//         message: error.message,
//         name: error.name,
//         sql: error.sql
//       });
//       sendServerError(res, 'Failed to fetch projects');
//     }
//   }

//   // Create new project - ENHANCED WITH BETTER VALIDATION
//   async createProject(req, res) {
//     try {
//       console.log('🚀 ProjectController: createProject called');
//       console.log('📥 Request body:', req.body);
//       console.log('📥 Request headers:', req.headers);
//       console.log('📥 Content-Type:', req.headers['content-type']);
      
//       // Validate Content-Type
//       if (!req.headers['content-type'] || !req.headers['content-type'].includes('application/json')) {
//         console.log('❌ Invalid Content-Type:', req.headers['content-type']);
//         return sendBadRequest(res, 'Content-Type must be application/json');
//       }
      
//       // Validate request body exists
//       if (!req.body || Object.keys(req.body).length === 0) {
//         console.log('❌ Empty request body');
//         return sendBadRequest(res, 'Request body is required');
//       }
      
//       const { 
//         title, 
//         abstract, 
//         specifications, 
//         learningOutcomes, 
//         subDomainId,
//         isActive = true,
//         isFeatured = false,
//         sortOrder = 0
//       } = req.body;

//       console.log('🔧 Extracted fields:', {
//         title: title ? `"${title}" (${title.length} chars)` : 'MISSING',
//         abstract: abstract ? `"${abstract.substring(0, 50)}..." (${abstract.length} chars)` : 'MISSING',
//         specifications: specifications ? `"${specifications.substring(0, 50)}..." (${specifications.length} chars)` : 'MISSING',
//         learningOutcomes: learningOutcomes ? `"${learningOutcomes.substring(0, 50)}..." (${learningOutcomes.length} chars)` : 'MISSING',
//         subDomainId: subDomainId || 'MISSING',
//         isActive, 
//         isFeatured, 
//         sortOrder
//       });

//       // Validate required fields
//       const validationErrors = validateProjectData(req.body);
//       if (validationErrors.length > 0) {
//         console.log('❌ Validation errors:', validationErrors);
//         return sendBadRequest(res, `Validation failed: ${validationErrors.join(', ')}`);
//       }

//       // Validate subdomain exists and is a leaf
//       console.log('🔍 Looking up subdomain with ID:', subDomainId);
//       const subDomain = await SubDomain.findByPk(subDomainId);
//       if (!subDomain) {
//         console.log('❌ SubDomain not found:', subDomainId);
//         return sendBadRequest(res, 'SubDomain not found');
//       }

//       console.log('✅ SubDomain found:', {
//         id: subDomain.id,
//         title: subDomain.title,
//         isLeaf: subDomain.isLeaf
//       });

//       if (!subDomain.isLeaf) {
//         console.log('❌ SubDomain is not a leaf');
//         return sendBadRequest(res, 'Projects can only be added to leaf subdomains');
//       }

//       // Check if project with this title already exists in this subdomain
//       console.log('🔍 Checking for existing project with title:', title);
//       const existingProject = await Project.findOne({
//         where: { 
//           title: { [Op.like]: title.trim() },
//           subDomainId
//         }
//       });

//       if (existingProject) {
//         console.log('❌ Project with this title already exists:', title);
//         return sendBadRequest(res, 'Project with this title already exists in this subdomain');
//       }

//       console.log('📡 Creating project...');
//       const projectData = {
//         title: title.trim(),
//         abstract: abstract.trim(),
//         specifications: specifications.trim(),
//         learningOutcomes: learningOutcomes.trim(),
//         subDomainId: parseInt(subDomainId),
//         isActive,
//         isFeatured,
//         sortOrder: parseInt(sortOrder) || 0
//       };
      
//       console.log('📊 Final project data:', projectData);
      
//       const project = await Project.create(projectData);

//       console.log('✅ Project created with ID:', project.id);

//       // Fetch the created project with associations
//       const createdProject = await Project.findByPk(project.id, {
//         include: [
//           {
//             model: SubDomain,
//             as: 'subDomain',
//             include: [
//               {
//                 model: Domain,
//                 as: 'domain',
//                 attributes: ['id', 'title', 'slug']
//               }
//             ]
//           }
//         ]
//       });

//       console.log('📤 Sending created project response');
//       sendCreated(res, 'Project created successfully', createdProject);
//     } catch (error) {
//       console.error('❌ ProjectController: Create project error:', error);
//       console.error('❌ Error stack:', error.stack);
//       console.error('❌ Error details:', {
//         message: error.message,
//         name: error.name,
//         sql: error.sql,
//         original: error.original
//       });
      
//       // Handle specific database errors
//       if (error.name === 'SequelizeValidationError') {
//         const validationErrors = error.errors.map(err => err.message);
//         return sendBadRequest(res, `Validation failed: ${validationErrors.join(', ')}`);
//       }
      
//       if (error.name === 'SequelizeUniqueConstraintError') {
//         return sendBadRequest(res, 'A project with this title already exists in this subdomain');
//       }
      
//       if (error.name === 'SequelizeForeignKeyConstraintError') {
//         return sendBadRequest(res, 'Invalid subdomain ID provided');
//       }
      
//       sendServerError(res, 'Failed to create project');
//     }
//   }

//   // Get project by ID with full details
//   async getProjectById(req, res) {
//     try {
//       const { id } = req.params;
//       console.log('🚀 ProjectController: getProjectById called for ID:', id);

//       const project = await Project.findByPk(id, {
//         include: [
//           {
//             model: SubDomain,
//             as: 'subDomain',
//             include: [
//               {
//                 model: Domain,
//                 as: 'domain',
//                 attributes: ['id', 'title', 'slug']
//               },
//               {
//                 model: SubDomain,
//                 as: 'parent',
//                 attributes: ['id', 'title', 'slug'],
//                 required: false
//               }
//             ]
//           },
//           {
//             model: Image,
//             as: 'images',
//             required: false,
//             where: { entityType: 'project' },
//             order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
//           },
//           {
//             model: Lead,
//             as: 'leads',
//             required: false,
//             order: [['createdAt', 'DESC']]
//           }
//         ]
//       });

//       if (!project) {
//         console.log('❌ Project not found for ID:', id);
//         return sendNotFound(res, 'Project not found');
//       }

//       console.log('✅ Project found:', project.title);

//       // Add computed fields
//       const projectData = project.toJSON();
//       projectData.leadCount = projectData.leads?.length || 0;
//       projectData.newLeadCount = projectData.leads?.filter(lead => lead.status === 'new').length || 0;
//       projectData.isArchived = !projectData.isActive;

//       console.log('📤 Sending project data with leadCount:', projectData.leadCount);
//       sendSuccess(res, 'Project fetched successfully', projectData);
//     } catch (error) {
//       console.error('❌ ProjectController: Get project by ID error:', error);
//       sendServerError(res, 'Failed to fetch project');
//     }
//   }

//   // Update project - ENHANCED WITH BETTER VALIDATION
//   async updateProject(req, res) {
//     try {
//       const { id } = req.params;
//       console.log('🚀 ProjectController: updateProject called for ID:', id);
//       console.log('📥 Request body:', req.body);
      
//       // Validate request body
//       if (!req.body || Object.keys(req.body).length === 0) {
//         return sendBadRequest(res, 'Request body is required');
//       }
      
//       const { 
//         title, 
//         abstract, 
//         specifications, 
//         learningOutcomes, 
//         isActive,
//         isFeatured,
//         sortOrder
//       } = req.body;

//       const project = await Project.findByPk(id);
//       if (!project) {
//         console.log('❌ Project not found:', id);
//         return sendNotFound(res, 'Project not found');
//       }

//       console.log('✅ Project found:', project.title);

//       // Validate fields if they are being updated
//       const validationErrors = validateProjectData(req.body, true);
//       if (validationErrors.length > 0) {
//         console.log('❌ Validation errors:', validationErrors);
//         return sendBadRequest(res, `Validation failed: ${validationErrors.join(', ')}`);
//       }

//       // Check if another project with this title exists in the same subdomain
//       if (title && title.trim() !== project.title) {
//         const existingProject = await Project.findOne({
//           where: { 
//             title: { [Op.like]: title.trim() },
//             subDomainId: project.subDomainId,
//             id: { [Op.ne]: id }
//           }
//         });

//         if (existingProject) {
//           console.log('❌ Another project with this title exists:', title);
//           return sendBadRequest(res, 'Project with this title already exists in this subdomain');
//         }
//       }

//       console.log('📡 Updating project...');
//       const updateData = {};
      
//       if (title !== undefined) updateData.title = title.trim();
//       if (abstract !== undefined) updateData.abstract = abstract.trim();
//       if (specifications !== undefined) updateData.specifications = specifications.trim();
//       if (learningOutcomes !== undefined) updateData.learningOutcomes = learningOutcomes.trim();
//       if (isActive !== undefined) updateData.isActive = isActive;
//       if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
//       if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder) || 0;
      
//       console.log('📊 Update data:', updateData);
      
//       await project.update(updateData);

//       console.log('✅ Project updated successfully');

//       const updatedProject = await Project.findByPk(id, {
//         include: [
//           {
//             model: SubDomain,
//             as: 'subDomain',
//             include: [
//               {
//                 model: Domain,
//                 as: 'domain',
//                 attributes: ['id', 'title', 'slug']
//               }
//             ]
//           },
//           {
//             model: Image,
//             as: 'images',
//             required: false,
//             where: { entityType: 'project' }
//           }
//         ]
//       });

//       console.log('📤 Sending updated project response');
//       sendSuccess(res, 'Project updated successfully', updatedProject);
//     } catch (error) {
//       console.error('❌ ProjectController: Update project error:', error);
      
//       // Handle specific database errors
//       if (error.name === 'SequelizeValidationError') {
//         const validationErrors = error.errors.map(err => err.message);
//         return sendBadRequest(res, `Validation failed: ${validationErrors.join(', ')}`);
//       }
      
//       sendServerError(res, 'Failed to update project');
//     }
//   }

//   // ... (keep all other methods unchanged: moveProject, archiveProject, deleteProject, getProjectStats, bulkUpdateProjects)
//   // I'll include them for completeness but they don't need changes

//   // Move project to different subdomain
//   async moveProject(req, res) {
//     try {
//       const { id } = req.params;
//       const { newSubDomainId, reason } = req.body;
      
//       console.log('🚀 ProjectController: moveProject called');
//       console.log('📥 Project ID:', id, 'New SubDomain ID:', newSubDomainId, 'Reason:', reason);

//       const project = await Project.findByPk(id, {
//         include: [
//           {
//             model: SubDomain,
//             as: 'subDomain',
//             include: [{ model: Domain, as: 'domain' }]
//           }
//         ]
//       });

//       if (!project) {
//         console.log('❌ Project not found:', id);
//         return sendNotFound(res, 'Project not found');
//       }

//       console.log('✅ Project found:', project.title);

//       // Validate new subdomain
//       const newSubDomain = await SubDomain.findByPk(newSubDomainId, {
//         include: [{ model: Domain, as: 'domain' }]
//       });

//       if (!newSubDomain) {
//         console.log('❌ New subdomain not found:', newSubDomainId);
//         return sendBadRequest(res, 'New subdomain not found');
//       }

//       console.log('✅ New subdomain found:', newSubDomain.title);

//       if (!newSubDomain.isLeaf) {
//         console.log('❌ New subdomain is not a leaf');
//         return sendBadRequest(res, 'Projects can only be moved to leaf subdomains');
//       }

//       if (project.subDomainId === newSubDomainId) {
//         console.log('❌ Project is already in this subdomain');
//         return sendBadRequest(res, 'Project is already in this subdomain');
//       }

//       // Check if project with same title exists in target subdomain
//       const existingProject = await Project.findOne({
//         where: { 
//           title: { [Op.like]: project.title },
//           subDomainId: newSubDomainId
//         }
//       });

//       if (existingProject) {
//         console.log('❌ Project with same title exists in target subdomain');
//         return sendBadRequest(res, 'Project with this title already exists in the target subdomain');
//       }

//       const oldSubDomain = project.subDomain;

//       console.log('📡 Moving project...');
//       await project.update({ 
//         subDomainId: newSubDomainId,
//         sortOrder: 0
//       });

//       console.log(`✅ Project "${project.title}" moved from ${oldSubDomain.domain.title}/${oldSubDomain.title} to ${newSubDomain.domain.title}/${newSubDomain.title}${reason ? '. Reason: ' + reason : ''}`);

//       const movedProject = await Project.findByPk(id, {
//         include: [
//           {
//             model: SubDomain,
//             as: 'subDomain',
//             include: [
//               {
//                 model: Domain,
//                 as: 'domain',
//                 attributes: ['id', 'title', 'slug']
//               }
//             ]
//           }
//         ]
//       });

//       const responseData = {
//         project: movedProject,
//         moveDetails: {
//           from: {
//             domain: oldSubDomain.domain.title,
//             subDomain: oldSubDomain.title
//           },
//           to: {
//             domain: newSubDomain.domain.title,
//             subDomain: newSubDomain.title
//           },
//           reason: reason || 'No reason provided'
//         }
//       };

//       console.log('📤 Sending move response');
//       sendSuccess(res, 'Project moved successfully', responseData);
//     } catch (error) {
//       console.error('❌ ProjectController: Move project error:', error);
//       sendServerError(res, 'Failed to move project');
//     }
//   }

//   // Archive/Unarchive project
//   async archiveProject(req, res) {
//     try {
//       const { id } = req.params;
//       const { archive = true, reason } = req.body;
      
//       console.log('🚀 ProjectController: archiveProject called');
//       console.log('📥 Project ID:', id, 'Archive:', archive, 'Reason:', reason);

//       const project = await Project.findByPk(id, {
//         include: [
//           {
//             model: SubDomain,
//             as: 'subDomain',
//             include: [{ model: Domain, as: 'domain' }]
//           }
//         ]
//       });

//       if (!project) {
//         console.log('❌ Project not found:', id);
//         return sendNotFound(res, 'Project not found');
//       }

//       console.log('✅ Project found:', project.title, 'Current isActive:', project.isActive);

//       const isArchiving = archive === true;
//       const newActiveStatus = !isArchiving;

//       if (project.isActive === newActiveStatus) {
//         console.log('❌ Project is already', isArchiving ? 'archived' : 'active');
//         return sendBadRequest(res, `Project is already ${isArchiving ? 'archived' : 'active'}`);
//       }

//       console.log('📡 Archiving/restoring project...');
//       await project.update({ 
//         isActive: newActiveStatus,
//         isFeatured: isArchiving ? false : project.isFeatured
//       });

//       const action = isArchiving ? 'archived' : 'restored';
//       console.log(`✅ Project "${project.title}" ${action}${reason ? '. Reason: ' + reason : ''}`);

//       const updatedProject = await Project.findByPk(id, {
//         include: [
//           {
//             model: SubDomain,
//             as: 'subDomain',
//             include: [
//               {
//                 model: Domain,
//                 as: 'domain',
//                 attributes: ['id', 'title', 'slug']
//               }
//             ]
//           }
//         ]
//       });

//       const responseData = {
//         project: updatedProject,
//         action,
//         reason: reason || `No reason provided for ${action}`
//       };

//       console.log('📤 Sending archive response');
//       sendSuccess(res, `Project ${action} successfully`, responseData);
//     } catch (error) {
//       console.error('❌ ProjectController: Archive project error:', error);
//       sendServerError(res, 'Failed to archive/restore project');
//     }
//   }

//   // Delete project permanently
//   async deleteProject(req, res) {
//     try {
//       const { id } = req.params;
//       const { confirm = false } = req.body;
      
//       console.log('🚀 ProjectController: deleteProject called');
//       console.log('📥 Project ID:', id, 'Confirm:', confirm);

//       if (!confirm) {
//         console.log('❌ Delete not confirmed');
//         return sendBadRequest(res, 'Please confirm deletion by setting confirm=true in request body');
//       }

//       const project = await Project.findByPk(id, {
//         include: [
//           {
//             model: Lead,
//             as: 'leads'
//           }
//         ]
//       });

//       if (!project) {
//         console.log('❌ Project not found:', id);
//         return sendNotFound(res, 'Project not found');
//       }

//       console.log('✅ Project found:', project.title);

//       const hasLeads = project.leads && project.leads.length > 0;
      
//       if (hasLeads) {
//         console.log('❌ Project has leads, cannot delete:', project.leads.length);
//         return sendBadRequest(res, 
//           `Cannot delete project that has ${project.leads.length} lead(s). Archive it instead or delete leads first.`
//         );
//       }

//       console.log('📡 Deleting associated images...');
//       await Image.destroy({
//         where: {
//           entityType: 'project',
//           entityId: id
//         }
//       });

//       console.log('📡 Deleting project...');
//       await project.destroy();

//       console.log('✅ Project deleted successfully');
//       sendSuccess(res, 'Project deleted successfully');
//     } catch (error) {
//       console.error('❌ ProjectController: Delete project error:', error);
//       sendServerError(res, 'Failed to delete project');
//     }
//   }

//   // Get project statistics
//   async getProjectStats(req, res) {
//     try {
//       const { id } = req.params;
//       console.log('🚀 ProjectController: getProjectStats called for ID:', id);

//       const project = await Project.findByPk(id, {
//         include: [
//           {
//             model: SubDomain,
//             as: 'subDomain',
//             include: [{ model: Domain, as: 'domain' }]
//           },
//           {
//             model: Lead,
//             as: 'leads'
//           }
//         ]
//       });

//       if (!project) {
//         console.log('❌ Project not found:', id);
//         return sendNotFound(res, 'Project not found');
//       }

//       console.log('✅ Project found for stats:', project.title);

//       const leads = project.leads || [];
//       const leadStats = {
//         total: leads.length,
//         new: leads.filter(l => l.status === 'new').length,
//         contacted: leads.filter(l => l.status === 'contacted').length,
//         converted: leads.filter(l => l.status === 'converted').length,
//         closed: leads.filter(l => l.status === 'closed').length
//       };

//       const stats = {
//         project: {
//           id: project.id,
//           title: project.title,
//           isActive: project.isActive,
//           isFeatured: project.isFeatured,
//           viewCount: project.viewCount,
//           leadCount: project.leadCount
//         },
//         location: {
//           domain: project.subDomain.domain.title,
//           subDomain: project.subDomain.title
//         },
//         leads: leadStats,
//         performance: {
//           conversionRate: leads.length > 0 ? ((leadStats.converted / leads.length) * 100).toFixed(2) + '%' : '0%',
//           activeLeads: leadStats.new + leadStats.contacted
//         }
//       };

//       console.log('📤 Sending project stats');
//       sendSuccess(res, 'Project statistics fetched successfully', stats);
//     } catch (error) {
//       console.error('❌ ProjectController: Get project stats error:', error);
//       sendServerError(res, 'Failed to fetch project statistics');
//     }
//   }

//   // Bulk operations
//   async bulkUpdateProjects(req, res) {
//     try {
//       const { projectIds, updates } = req.body;
//       console.log('🚀 ProjectController: bulkUpdateProjects called');
//       console.log('📥 Project IDs:', projectIds, 'Updates:', updates);

//       if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
//         console.log('❌ Invalid project IDs array');
//         return sendBadRequest(res, 'Project IDs array is required');
//       }

//       if (!updates || Object.keys(updates).length === 0) {
//         console.log('❌ No updates provided');
//         return sendBadRequest(res, 'Updates object is required');
//       }

//       const projects = await Project.findAll({
//         where: { id: { [Op.in]: projectIds } }
//       });

//       if (projects.length !== projectIds.length) {
//         console.log('❌ Some projects not found. Expected:', projectIds.length, 'Found:', projects.length);
//         return sendBadRequest(res, 'Some projects were not found');
//       }

//       console.log('✅ All projects found');

//       const allowedUpdates = ['isActive', 'isFeatured', 'sortOrder'];
//       const filteredUpdates = {};
      
//       Object.keys(updates).forEach(key => {
//         if (allowedUpdates.includes(key)) {
//           filteredUpdates[key] = updates[key];
//         }
//       });

//       if (Object.keys(filteredUpdates).length === 0) {
//         console.log('❌ No valid updates after filtering');
//         return sendBadRequest(res, 'No valid updates provided');
//       }

//       console.log('🔧 Filtered updates:', filteredUpdates);
//       console.log('📡 Performing bulk update...');

//       await Project.update(filteredUpdates, {
//         where: { id: { [Op.in]: projectIds } }
//       });

//       console.log('✅ Bulk update completed');

//       const responseData = {
//         updatedCount: projectIds.length,
//         updates: filteredUpdates
//       };

//       console.log('📤 Sending bulk update response');
//       sendSuccess(res, `${projectIds.length} projects updated successfully`, responseData);
//     } catch (error) {
//       console.error('❌ ProjectController: Bulk update projects error:', error);
//       sendServerError(res, 'Failed to update projects');
//     }
//   }
// }

// module.exports = new ProjectController();


// // const { Domain, SubDomain, Project, Lead, Image } = require('../models');
// // const { 
// //   sendSuccess, 
// //   sendCreated, 
// //   sendBadRequest, 
// //   sendNotFound,
// //   sendServerError 
// // } = require('../utils/responseHelper');
// // const { Op } = require('sequelize');

// // // Helper function to generate slug from title
// // const generateSlug = (title) => {
// //   return title
// //     .toLowerCase()
// //     .trim()
// //     .replace(/[^\w\s-]/g, '') // Remove special characters
// //     .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
// //     .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
// // };

// // // Helper function to clean and validate query parameters
// // const cleanQueryParams = (params) => {
// //   const cleaned = {};
  
// //   Object.keys(params).forEach(key => {
// //     const value = params[key];
    
// //     // Skip empty strings, null, undefined
// //     if (value === '' || value === null || value === undefined) {
// //       return;
// //     }
    
// //     // Convert string 'true'/'false' to boolean for certain fields
// //     if (['isActive', 'isFeatured', 'isArchived'].includes(key)) {
// //       if (value === 'true') cleaned[key] = true;
// //       else if (value === 'false') cleaned[key] = false;
// //       return;
// //     }
    
// //     // Convert numeric strings to numbers for ID fields
// //     if (key.endsWith('Id') || key === 'page' || key === 'limit') {
// //       const numValue = parseInt(value, 10);
// //       if (!isNaN(numValue)) {
// //         cleaned[key] = numValue;
// //       }
// //       return;
// //     }
    
// //     // Keep string values as-is
// //     cleaned[key] = value;
// //   });
  
// //   return cleaned;
// // };

// // class ProjectController {
// //   // Get all projects with pagination and filtering
// //   async getAllProjects(req, res) {
// //     try {
// //       console.log('🚀 ProjectController: getAllProjects called');
// //       console.log('📥 Raw query params:', req.query);
      
// //       // Clean and validate query parameters
// //       const cleanedParams = cleanQueryParams(req.query);
// //       console.log('🧹 Cleaned params:', cleanedParams);
      
// //       const { 
// //         page = 1, 
// //         limit = 10, 
// //         search = '', 
// //         subDomainId,
// //         domainId,
// //         isActive,
// //         isFeatured,
// //         isArchived,
// //         sortBy = 'updatedAt',
// //         sortOrder = 'DESC'
// //       } = cleanedParams;

// //       console.log('🎛️ Filter values:', {
// //         page, limit, search, subDomainId, domainId, 
// //         isActive, isFeatured, isArchived, sortBy, sortOrder
// //       });

// //       const offset = (page - 1) * limit;
// //       const whereClause = {};
// //       const includeWhere = {};

// //       // Build search condition
// //       if (search) {
// //         whereClause[Op.or] = [
// //           { title: { [Op.like]: `%${search}%` } },
// //           { abstract: { [Op.like]: `%${search}%` } },
// //           { specifications: { [Op.like]: `%${search}%` } }
// //         ];
// //         console.log('🔍 Search condition added:', search);
// //       }

// //       // Add filters
// //       if (subDomainId !== undefined) {
// //         whereClause.subDomainId = subDomainId;
// //         console.log('📁 SubDomain filter added:', subDomainId);
// //       }
      
// //       if (isActive !== undefined) {
// //         whereClause.isActive = isActive;
// //         console.log('📊 IsActive filter added:', isActive);
// //       }
      
// //       if (isFeatured !== undefined) {
// //         whereClause.isFeatured = isFeatured;
// //         console.log('⭐ IsFeatured filter added:', isFeatured);
// //       }
      
// //       // Handle archived status
// //       if (isArchived !== undefined) {
// //         whereClause.isActive = isArchived === true ? false : true;
// //         console.log('📦 Archived filter added:', isArchived);
// //       }

// //       if (domainId !== undefined) {
// //         includeWhere.domainId = domainId;
// //         console.log('🏢 Domain filter added:', domainId);
// //       }

// //       console.log('🔧 Final whereClause:', whereClause);
// //       console.log('🔧 Final includeWhere:', includeWhere);

// //       const queryOptions = {
// //         where: whereClause,
// //         include: [
// //           {
// //             model: SubDomain,
// //             as: 'subDomain',
// //             ...(Object.keys(includeWhere).length > 0 ? { where: includeWhere } : {}),
// //             include: [
// //               {
// //                 model: Domain,
// //                 as: 'domain',
// //                 attributes: ['id', 'title', 'slug']
// //               }
// //             ]
// //           },
// //           {
// //             model: Image,
// //             as: 'images',
// //             required: false,
// //             where: { entityType: 'project' },
// //             order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
// //           },
// //           {
// //             model: Lead,
// //             as: 'leads',
// //             required: false,
// //             attributes: ['id', 'status']
// //           }
// //         ],
// //         order: [[sortBy, sortOrder]],
// //         limit: parseInt(limit),
// //         offset: parseInt(offset),
// //         distinct: true
// //       };

// //       console.log('📡 Executing database query with options:', JSON.stringify(queryOptions, null, 2));

// //       const { count, rows: projects } = await Project.findAndCountAll(queryOptions);

// //       console.log('✅ Database query successful');
// //       console.log('📊 Results: count =', count, ', projects =', projects.length);

// //       // Add lead counts and status
// //       const projectsWithCounts = projects.map(project => {
// //         const projectData = project.toJSON();
// //         projectData.leadCount = projectData.leads?.length || 0;
// //         projectData.newLeadCount = projectData.leads?.filter(lead => lead.status === 'new').length || 0;
// //         projectData.isArchived = !projectData.isActive;
// //         return projectData;
// //       });

// //       const totalPages = Math.ceil(count / limit);

// //       const responseData = {
// //         projects: projectsWithCounts,
// //         pagination: {
// //           currentPage: parseInt(page),
// //           totalPages,
// //           totalItems: count,
// //           itemsPerPage: parseInt(limit)
// //         }
// //       };

// //       console.log('📤 Sending response:', {
// //         projectsCount: responseData.projects.length,
// //         pagination: responseData.pagination
// //       });

// //       sendSuccess(res, 'Projects fetched successfully', responseData);
// //     } catch (error) {
// //       console.error('❌ ProjectController: Get projects error:', error);
// //       console.error('❌ Error stack:', error.stack);
// //       console.error('❌ Error details:', {
// //         message: error.message,
// //         name: error.name,
// //         sql: error.sql
// //       });
// //       sendServerError(res, 'Failed to fetch projects');
// //     }
// //   }

// //   // Get project by ID with full details
// //   async getProjectById(req, res) {
// //     try {
// //       const { id } = req.params;
// //       console.log('🚀 ProjectController: getProjectById called for ID:', id);

// //       const project = await Project.findByPk(id, {
// //         include: [
// //           {
// //             model: SubDomain,
// //             as: 'subDomain',
// //             include: [
// //               {
// //                 model: Domain,
// //                 as: 'domain',
// //                 attributes: ['id', 'title', 'slug']
// //               },
// //               {
// //                 model: SubDomain,
// //                 as: 'parent',
// //                 attributes: ['id', 'title', 'slug'],
// //                 required: false
// //               }
// //             ]
// //           },
// //           {
// //             model: Image,
// //             as: 'images',
// //             required: false,
// //             where: { entityType: 'project' },
// //             order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
// //           },
// //           {
// //             model: Lead,
// //             as: 'leads',
// //             required: false,
// //             order: [['createdAt', 'DESC']]
// //           }
// //         ]
// //       });

// //       if (!project) {
// //         console.log('❌ Project not found for ID:', id);
// //         return sendNotFound(res, 'Project not found');
// //       }

// //       console.log('✅ Project found:', project.title);

// //       // Add computed fields
// //       const projectData = project.toJSON();
// //       projectData.leadCount = projectData.leads?.length || 0;
// //       projectData.newLeadCount = projectData.leads?.filter(lead => lead.status === 'new').length || 0;
// //       projectData.isArchived = !projectData.isActive;

// //       console.log('📤 Sending project data with leadCount:', projectData.leadCount);
// //       sendSuccess(res, 'Project fetched successfully', projectData);
// //     } catch (error) {
// //       console.error('❌ ProjectController: Get project by ID error:', error);
// //       sendServerError(res, 'Failed to fetch project');
// //     }
// //   }

// //   // Get projects by subdomain
// //   async getProjectsBySubDomain(req, res) {
// //     try {
// //       const { subDomainId } = req.params;
// //       const { includeArchived = false } = req.query;
      
// //       console.log('🚀 ProjectController: getProjectsBySubDomain called');
// //       console.log('📥 SubDomain ID:', subDomainId, 'Include Archived:', includeArchived);

// //       const subDomain = await SubDomain.findByPk(subDomainId);
// //       if (!subDomain) {
// //         console.log('❌ SubDomain not found:', subDomainId);
// //         return sendNotFound(res, 'SubDomain not found');
// //       }

// //       console.log('✅ SubDomain found:', subDomain.title);

// //       const whereClause = { subDomainId };
// //       if (includeArchived !== 'true') {
// //         whereClause.isActive = true;
// //       }

// //       console.log('🔧 Query where clause:', whereClause);

// //       const projects = await Project.findAll({
// //         where: whereClause,
// //         include: [
// //           {
// //             model: Image,
// //             as: 'images',
// //             required: false,
// //             where: { entityType: 'project', isMain: true }
// //           },
// //           {
// //             model: Lead,
// //             as: 'leads',
// //             required: false,
// //             attributes: ['id', 'status']
// //           }
// //         ],
// //         order: [['isFeatured', 'DESC'], ['sortOrder', 'ASC'], ['updatedAt', 'DESC']]
// //       });

// //       console.log('✅ Found', projects.length, 'projects for subdomain');

// //       const projectsWithCounts = projects.map(project => {
// //         const projectData = project.toJSON();
// //         projectData.leadCount = projectData.leads?.length || 0;
// //         projectData.isArchived = !projectData.isActive;
// //         return projectData;
// //       });

// //       const responseData = {
// //         subDomain: {
// //           id: subDomain.id,
// //           title: subDomain.title,
// //           slug: subDomain.slug
// //         },
// //         projects: projectsWithCounts
// //       };

// //       console.log('📤 Sending response with', responseData.projects.length, 'projects');
// //       sendSuccess(res, 'Projects fetched successfully', responseData);
// //     } catch (error) {
// //       console.error('❌ ProjectController: Get projects by subdomain error:', error);
// //       sendServerError(res, 'Failed to fetch projects');
// //     }
// //   }

// //   // Create new project
// //   async createProject(req, res) {
// //     try {
// //       console.log('🚀 ProjectController: createProject called');
// //       console.log('📥 Request body:', req.body);
      
// //       const { 
// //         title, 
// //         abstract, 
// //         specifications, 
// //         learningOutcomes, 
// //         subDomainId,
// //         isActive = true,
// //         isFeatured = false,
// //         sortOrder = 0
// //       } = req.body;

// //       console.log('🔧 Extracted fields:', {
// //         title, subDomainId, isActive, isFeatured, sortOrder
// //       });

// //       // Validate subdomain exists and is a leaf
// //       const subDomain = await SubDomain.findByPk(subDomainId);
// //       if (!subDomain) {
// //         console.log('❌ SubDomain not found:', subDomainId);
// //         return sendBadRequest(res, 'SubDomain not found');
// //       }

// //       console.log('✅ SubDomain found:', subDomain.title, 'isLeaf:', subDomain.isLeaf);

// //       if (!subDomain.isLeaf) {
// //         console.log('❌ SubDomain is not a leaf');
// //         return sendBadRequest(res, 'Projects can only be added to leaf subdomains');
// //       }

// //       // Check if project with this title already exists in this subdomain
// //       const existingProject = await Project.findOne({
// //         where: { 
// //           title: { [Op.like]: title },
// //           subDomainId
// //         }
// //       });

// //       if (existingProject) {
// //         console.log('❌ Project with this title already exists:', title);
// //         return sendBadRequest(res, 'Project with this title already exists in this subdomain');
// //       }

// //       console.log('📡 Creating project...');
// //       const project = await Project.create({
// //         title,
// //         abstract,
// //         specifications,
// //         learningOutcomes,
// //         subDomainId,
// //         isActive,
// //         isFeatured,
// //         sortOrder
// //       });

// //       console.log('✅ Project created with ID:', project.id);

// //       const createdProject = await Project.findByPk(project.id, {
// //         include: [
// //           {
// //             model: SubDomain,
// //             as: 'subDomain',
// //             include: [
// //               {
// //                 model: Domain,
// //                 as: 'domain',
// //                 attributes: ['id', 'title', 'slug']
// //               }
// //             ]
// //           }
// //         ]
// //       });

// //       console.log('📤 Sending created project response');
// //       sendCreated(res, 'Project created successfully', createdProject);
// //     } catch (error) {
// //       console.error('❌ ProjectController: Create project error:', error);
// //       sendServerError(res, 'Failed to create project');
// //     }
// //   }

// //   // Update project
// //   async updateProject(req, res) {
// //     try {
// //       const { id } = req.params;
// //       console.log('🚀 ProjectController: updateProject called for ID:', id);
// //       console.log('📥 Request body:', req.body);
      
// //       const { 
// //         title, 
// //         abstract, 
// //         specifications, 
// //         learningOutcomes, 
// //         isActive,
// //         isFeatured,
// //         sortOrder
// //       } = req.body;

// //       const project = await Project.findByPk(id);
// //       if (!project) {
// //         console.log('❌ Project not found:', id);
// //         return sendNotFound(res, 'Project not found');
// //       }

// //       console.log('✅ Project found:', project.title);

// //       // Check if another project with this title exists in the same subdomain
// //       if (title && title !== project.title) {
// //         const existingProject = await Project.findOne({
// //           where: { 
// //             title: { [Op.like]: title },
// //             subDomainId: project.subDomainId,
// //             id: { [Op.ne]: id }
// //           }
// //         });

// //         if (existingProject) {
// //           console.log('❌ Another project with this title exists:', title);
// //           return sendBadRequest(res, 'Project with this title already exists in this subdomain');
// //         }
// //       }

// //       console.log('📡 Updating project...');
// //       await project.update({
// //         title: title || project.title,
// //         abstract: abstract !== undefined ? abstract : project.abstract,
// //         specifications: specifications !== undefined ? specifications : project.specifications,
// //         learningOutcomes: learningOutcomes !== undefined ? learningOutcomes : project.learningOutcomes,
// //         isActive: isActive !== undefined ? isActive : project.isActive,
// //         isFeatured: isFeatured !== undefined ? isFeatured : project.isFeatured,
// //         sortOrder: sortOrder !== undefined ? sortOrder : project.sortOrder
// //       });

// //       console.log('✅ Project updated successfully');

// //       const updatedProject = await Project.findByPk(id, {
// //         include: [
// //           {
// //             model: SubDomain,
// //             as: 'subDomain',
// //             include: [
// //               {
// //                 model: Domain,
// //                 as: 'domain',
// //                 attributes: ['id', 'title', 'slug']
// //               }
// //             ]
// //           },
// //           {
// //             model: Image,
// //             as: 'images',
// //             required: false,
// //             where: { entityType: 'project' }
// //           }
// //         ]
// //       });

// //       console.log('📤 Sending updated project response');
// //       sendSuccess(res, 'Project updated successfully', updatedProject);
// //     } catch (error) {
// //       console.error('❌ ProjectController: Update project error:', error);
// //       sendServerError(res, 'Failed to update project');
// //     }
// //   }

// //   // Move project to different subdomain
// //   async moveProject(req, res) {
// //     try {
// //       const { id } = req.params;
// //       const { newSubDomainId, reason } = req.body;
      
// //       console.log('🚀 ProjectController: moveProject called');
// //       console.log('📥 Project ID:', id, 'New SubDomain ID:', newSubDomainId, 'Reason:', reason);

// //       const project = await Project.findByPk(id, {
// //         include: [
// //           {
// //             model: SubDomain,
// //             as: 'subDomain',
// //             include: [{ model: Domain, as: 'domain' }]
// //           }
// //         ]
// //       });

// //       if (!project) {
// //         console.log('❌ Project not found:', id);
// //         return sendNotFound(res, 'Project not found');
// //       }

// //       console.log('✅ Project found:', project.title);

// //       // Validate new subdomain
// //       const newSubDomain = await SubDomain.findByPk(newSubDomainId, {
// //         include: [{ model: Domain, as: 'domain' }]
// //       });

// //       if (!newSubDomain) {
// //         console.log('❌ New subdomain not found:', newSubDomainId);
// //         return sendBadRequest(res, 'New subdomain not found');
// //       }

// //       console.log('✅ New subdomain found:', newSubDomain.title);

// //       if (!newSubDomain.isLeaf) {
// //         console.log('❌ New subdomain is not a leaf');
// //         return sendBadRequest(res, 'Projects can only be moved to leaf subdomains');
// //       }

// //       if (project.subDomainId === newSubDomainId) {
// //         console.log('❌ Project is already in this subdomain');
// //         return sendBadRequest(res, 'Project is already in this subdomain');
// //       }

// //       // Check if project with same title exists in target subdomain
// //       const existingProject = await Project.findOne({
// //         where: { 
// //           title: { [Op.like]: project.title },
// //           subDomainId: newSubDomainId
// //         }
// //       });

// //       if (existingProject) {
// //         console.log('❌ Project with same title exists in target subdomain');
// //         return sendBadRequest(res, 'Project with this title already exists in the target subdomain');
// //       }

// //       const oldSubDomain = project.subDomain;

// //       console.log('📡 Moving project...');
// //       // Update project
// //       await project.update({ 
// //         subDomainId: newSubDomainId,
// //         sortOrder: 0 // Reset sort order in new subdomain
// //       });

// //       // Log the move (you might want to add an audit table for this)
// //       console.log(`✅ Project "${project.title}" moved from ${oldSubDomain.domain.title}/${oldSubDomain.title} to ${newSubDomain.domain.title}/${newSubDomain.title}${reason ? '. Reason: ' + reason : ''}`);

// //       const movedProject = await Project.findByPk(id, {
// //         include: [
// //           {
// //             model: SubDomain,
// //             as: 'subDomain',
// //             include: [
// //               {
// //                 model: Domain,
// //                 as: 'domain',
// //                 attributes: ['id', 'title', 'slug']
// //               }
// //             ]
// //           }
// //         ]
// //       });

// //       const responseData = {
// //         project: movedProject,
// //         moveDetails: {
// //           from: {
// //             domain: oldSubDomain.domain.title,
// //             subDomain: oldSubDomain.title
// //           },
// //           to: {
// //             domain: newSubDomain.domain.title,
// //             subDomain: newSubDomain.title
// //           },
// //           reason: reason || 'No reason provided'
// //         }
// //       };

// //       console.log('📤 Sending move response');
// //       sendSuccess(res, 'Project moved successfully', responseData);
// //     } catch (error) {
// //       console.error('❌ ProjectController: Move project error:', error);
// //       sendServerError(res, 'Failed to move project');
// //     }
// //   }

// //   // Archive/Unarchive project
// //   async archiveProject(req, res) {
// //     try {
// //       const { id } = req.params;
// //       const { archive = true, reason } = req.body;
      
// //       console.log('🚀 ProjectController: archiveProject called');
// //       console.log('📥 Project ID:', id, 'Archive:', archive, 'Reason:', reason);

// //       const project = await Project.findByPk(id, {
// //         include: [
// //           {
// //             model: SubDomain,
// //             as: 'subDomain',
// //             include: [{ model: Domain, as: 'domain' }]
// //           }
// //         ]
// //       });

// //       if (!project) {
// //         console.log('❌ Project not found:', id);
// //         return sendNotFound(res, 'Project not found');
// //       }

// //       console.log('✅ Project found:', project.title, 'Current isActive:', project.isActive);

// //       const isArchiving = archive === true;
// //       const newActiveStatus = !isArchiving;

// //       if (project.isActive === newActiveStatus) {
// //         console.log('❌ Project is already', isArchiving ? 'archived' : 'active');
// //         return sendBadRequest(res, `Project is already ${isArchiving ? 'archived' : 'active'}`);
// //       }

// //       console.log('📡 Archiving/restoring project...');
// //       await project.update({ 
// //         isActive: newActiveStatus,
// //         isFeatured: isArchiving ? false : project.isFeatured // Remove featured status when archiving
// //       });

// //       const action = isArchiving ? 'archived' : 'restored';
// //       console.log(`✅ Project "${project.title}" ${action}${reason ? '. Reason: ' + reason : ''}`);

// //       const updatedProject = await Project.findByPk(id, {
// //         include: [
// //           {
// //             model: SubDomain,
// //             as: 'subDomain',
// //             include: [
// //               {
// //                 model: Domain,
// //                 as: 'domain',
// //                 attributes: ['id', 'title', 'slug']
// //               }
// //             ]
// //           }
// //         ]
// //       });

// //       const responseData = {
// //         project: updatedProject,
// //         action,
// //         reason: reason || `No reason provided for ${action}`
// //       };

// //       console.log('📤 Sending archive response');
// //       sendSuccess(res, `Project ${action} successfully`, responseData);
// //     } catch (error) {
// //       console.error('❌ ProjectController: Archive project error:', error);
// //       sendServerError(res, 'Failed to archive/restore project');
// //     }
// //   }

// //   // Delete project permanently
// //   async deleteProject(req, res) {
// //     try {
// //       const { id } = req.params;
// //       const { confirm = false } = req.body;
      
// //       console.log('🚀 ProjectController: deleteProject called');
// //       console.log('📥 Project ID:', id, 'Confirm:', confirm);

// //       if (!confirm) {
// //         console.log('❌ Delete not confirmed');
// //         return sendBadRequest(res, 'Please confirm deletion by setting confirm=true in request body');
// //       }

// //       const project = await Project.findByPk(id, {
// //         include: [
// //           {
// //             model: Lead,
// //             as: 'leads'
// //           }
// //         ]
// //       });

// //       if (!project) {
// //         console.log('❌ Project not found:', id);
// //         return sendNotFound(res, 'Project not found');
// //       }

// //       console.log('✅ Project found:', project.title);

// //       // Check if project has leads
// //       const hasLeads = project.leads && project.leads.length > 0;
      
// //       if (hasLeads) {
// //         console.log('❌ Project has leads, cannot delete:', project.leads.length);
// //         return sendBadRequest(res, 
// //           `Cannot delete project that has ${project.leads.length} lead(s). Archive it instead or delete leads first.`
// //         );
// //       }

// //       console.log('📡 Deleting associated images...');
// //       // Delete associated images
// //       await Image.destroy({
// //         where: {
// //           entityType: 'project',
// //           entityId: id
// //         }
// //       });

// //       console.log('📡 Deleting project...');
// //       await project.destroy();

// //       console.log('✅ Project deleted successfully');
// //       sendSuccess(res, 'Project deleted successfully');
// //     } catch (error) {
// //       console.error('❌ ProjectController: Delete project error:', error);
// //       sendServerError(res, 'Failed to delete project');
// //     }
// //   }

// //   // Get project statistics
// //   async getProjectStats(req, res) {
// //     try {
// //       const { id } = req.params;
// //       console.log('🚀 ProjectController: getProjectStats called for ID:', id);

// //       const project = await Project.findByPk(id, {
// //         include: [
// //           {
// //             model: SubDomain,
// //             as: 'subDomain',
// //             include: [{ model: Domain, as: 'domain' }]
// //           },
// //           {
// //             model: Lead,
// //             as: 'leads'
// //           }
// //         ]
// //       });

// //       if (!project) {
// //         console.log('❌ Project not found:', id);
// //         return sendNotFound(res, 'Project not found');
// //       }

// //       console.log('✅ Project found for stats:', project.title);

// //       const leads = project.leads || [];
// //       const leadStats = {
// //         total: leads.length,
// //         new: leads.filter(l => l.status === 'new').length,
// //         contacted: leads.filter(l => l.status === 'contacted').length,
// //         converted: leads.filter(l => l.status === 'converted').length,
// //         closed: leads.filter(l => l.status === 'closed').length
// //       };

// //       const stats = {
// //         project: {
// //           id: project.id,
// //           title: project.title,
// //           isActive: project.isActive,
// //           isFeatured: project.isFeatured,
// //           viewCount: project.viewCount,
// //           leadCount: project.leadCount
// //         },
// //         location: {
// //           domain: project.subDomain.domain.title,
// //           subDomain: project.subDomain.title
// //         },
// //         leads: leadStats,
// //         performance: {
// //           conversionRate: leads.length > 0 ? ((leadStats.converted / leads.length) * 100).toFixed(2) + '%' : '0%',
// //           activeLeads: leadStats.new + leadStats.contacted
// //         }
// //       };

// //       console.log('📤 Sending project stats');
// //       sendSuccess(res, 'Project statistics fetched successfully', stats);
// //     } catch (error) {
// //       console.error('❌ ProjectController: Get project stats error:', error);
// //       sendServerError(res, 'Failed to fetch project statistics');
// //     }
// //   }

// //   // Bulk operations
// //   async bulkUpdateProjects(req, res) {
// //     try {
// //       const { projectIds, updates } = req.body;
// //       console.log('🚀 ProjectController: bulkUpdateProjects called');
// //       console.log('📥 Project IDs:', projectIds, 'Updates:', updates);

// //       if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
// //         console.log('❌ Invalid project IDs array');
// //         return sendBadRequest(res, 'Project IDs array is required');
// //       }

// //       if (!updates || Object.keys(updates).length === 0) {
// //         console.log('❌ No updates provided');
// //         return sendBadRequest(res, 'Updates object is required');
// //       }

// //       // Validate that all projects exist
// //       const projects = await Project.findAll({
// //         where: { id: { [Op.in]: projectIds } }
// //       });

// //       if (projects.length !== projectIds.length) {
// //         console.log('❌ Some projects not found. Expected:', projectIds.length, 'Found:', projects.length);
// //         return sendBadRequest(res, 'Some projects were not found');
// //       }

// //       console.log('✅ All projects found');

// //       // Perform bulk update
// //       const allowedUpdates = ['isActive', 'isFeatured', 'sortOrder'];
// //       const filteredUpdates = {};
      
// //       Object.keys(updates).forEach(key => {
// //         if (allowedUpdates.includes(key)) {
// //           filteredUpdates[key] = updates[key];
// //         }
// //       });

// //       if (Object.keys(filteredUpdates).length === 0) {
// //         console.log('❌ No valid updates after filtering');
// //         return sendBadRequest(res, 'No valid updates provided');
// //       }

// //       console.log('🔧 Filtered updates:', filteredUpdates);
// //       console.log('📡 Performing bulk update...');

// //       await Project.update(filteredUpdates, {
// //         where: { id: { [Op.in]: projectIds } }
// //       });

// //       console.log('✅ Bulk update completed');

// //       const responseData = {
// //         updatedCount: projectIds.length,
// //         updates: filteredUpdates
// //       };

// //       console.log('📤 Sending bulk update response');
// //       sendSuccess(res, `${projectIds.length} projects updated successfully`, responseData);
// //     } catch (error) {
// //       console.error('❌ ProjectController: Bulk update projects error:', error);
// //       sendServerError(res, 'Failed to update projects');
// //     }
// //   }
// // }

// // module.exports = new ProjectController();


// // // const { Domain, SubDomain, Project, Lead, Image } = require('../models');
// // // const { 
// // //   sendSuccess, 
// // //   sendCreated, 
// // //   sendBadRequest, 
// // //   sendNotFound,
// // //   sendServerError 
// // // } = require('../utils/responseHelper');
// // // const { Op } = require('sequelize');

// // // // Helper function to generate slug from title
// // // const generateSlug = (title) => {
// // //   return title
// // //     .toLowerCase()
// // //     .trim()
// // //     .replace(/[^\w\s-]/g, '') // Remove special characters
// // //     .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
// // //     .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
// // // };

// // // class ProjectController {
// // //   // Get all projects with pagination and filtering
// // //   async getAllProjects(req, res) {
// // //     try {
// // //       const { 
// // //         page = 1, 
// // //         limit = 10, 
// // //         search = '', 
// // //         subDomainId,
// // //         domainId,
// // //         isActive,
// // //         isFeatured,
// // //         isArchived,
// // //         sortBy = 'updatedAt',
// // //         sortOrder = 'DESC'
// // //       } = req.query;

// // //       const offset = (page - 1) * limit;
// // //       const whereClause = {};
// // //       const includeWhere = {};

// // //       if (search) {
// // //         whereClause[Op.or] = [
// // //           { title: { [Op.like]: `%${search}%` } },
// // //           { abstract: { [Op.like]: `%${search}%` } },
// // //           { specifications: { [Op.like]: `%${search}%` } }
// // //         ];
// // //       }

// // //       if (subDomainId) whereClause.subDomainId = subDomainId;
// // //       if (isActive !== undefined) whereClause.isActive = isActive === 'true';
// // //       if (isFeatured !== undefined) whereClause.isFeatured = isFeatured === 'true';
      
// // //       // Handle archived status
// // //       if (isArchived !== undefined) {
// // //         whereClause.isActive = isArchived === 'true' ? false : true;
// // //       }

// // //       if (domainId) {
// // //         includeWhere.domainId = domainId;
// // //       }

// // //       const { count, rows: projects } = await Project.findAndCountAll({
// // //         where: whereClause,
// // //         include: [
// // //           {
// // //             model: SubDomain,
// // //             as: 'subDomain',
// // //             where: includeWhere,
// // //             include: [
// // //               {
// // //                 model: Domain,
// // //                 as: 'domain',
// // //                 attributes: ['id', 'title', 'slug']
// // //               }
// // //             ]
// // //           },
// // //           {
// // //             model: Image,
// // //             as: 'images',
// // //             required: false,
// // //             where: { entityType: 'project' },
// // //             order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
// // //           },
// // //           {
// // //             model: Lead,
// // //             as: 'leads',
// // //             required: false,
// // //             attributes: ['id', 'status']
// // //           }
// // //         ],
// // //         order: [[sortBy, sortOrder]],
// // //         limit: parseInt(limit),
// // //         offset: parseInt(offset),
// // //         distinct: true
// // //       });

// // //       // Add lead counts and status
// // //       const projectsWithCounts = projects.map(project => {
// // //         const projectData = project.toJSON();
// // //         projectData.leadCount = projectData.leads?.length || 0;
// // //         projectData.newLeadCount = projectData.leads?.filter(lead => lead.status === 'new').length || 0;
// // //         projectData.isArchived = !projectData.isActive;
// // //         return projectData;
// // //       });

// // //       const totalPages = Math.ceil(count / limit);

// // //       sendSuccess(res, 'Projects fetched successfully', {
// // //         projects: projectsWithCounts,
// // //         pagination: {
// // //           currentPage: parseInt(page),
// // //           totalPages,
// // //           totalItems: count,
// // //           itemsPerPage: parseInt(limit)
// // //         }
// // //       });
// // //     } catch (error) {
// // //       console.error('Get projects error:', error);
// // //       sendServerError(res, 'Failed to fetch projects');
// // //     }
// // //   }

// // //   // Get project by ID with full details
// // //   async getProjectById(req, res) {
// // //     try {
// // //       const { id } = req.params;

// // //       const project = await Project.findByPk(id, {
// // //         include: [
// // //           {
// // //             model: SubDomain,
// // //             as: 'subDomain',
// // //             include: [
// // //               {
// // //                 model: Domain,
// // //                 as: 'domain',
// // //                 attributes: ['id', 'title', 'slug']
// // //               },
// // //               {
// // //                 model: SubDomain,
// // //                 as: 'parent',
// // //                 attributes: ['id', 'title', 'slug'],
// // //                 required: false
// // //               }
// // //             ]
// // //           },
// // //           {
// // //             model: Image,
// // //             as: 'images',
// // //             required: false,
// // //             where: { entityType: 'project' },
// // //             order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
// // //           },
// // //           {
// // //             model: Lead,
// // //             as: 'leads',
// // //             required: false,
// // //             order: [['createdAt', 'DESC']]
// // //           }
// // //         ]
// // //       });

// // //       if (!project) {
// // //         return sendNotFound(res, 'Project not found');
// // //       }

// // //       // Add computed fields
// // //       const projectData = project.toJSON();
// // //       projectData.leadCount = projectData.leads?.length || 0;
// // //       projectData.newLeadCount = projectData.leads?.filter(lead => lead.status === 'new').length || 0;
// // //       projectData.isArchived = !projectData.isActive;

// // //       sendSuccess(res, 'Project fetched successfully', projectData);
// // //     } catch (error) {
// // //       console.error('Get project by ID error:', error);
// // //       sendServerError(res, 'Failed to fetch project');
// // //     }
// // //   }

// // //   // Get projects by subdomain
// // //   async getProjectsBySubDomain(req, res) {
// // //     try {
// // //       const { subDomainId } = req.params;
// // //       const { includeArchived = false } = req.query;

// // //       const subDomain = await SubDomain.findByPk(subDomainId);
// // //       if (!subDomain) {
// // //         return sendNotFound(res, 'SubDomain not found');
// // //       }

// // //       const whereClause = { subDomainId };
// // //       if (includeArchived !== 'true') {
// // //         whereClause.isActive = true;
// // //       }

// // //       const projects = await Project.findAll({
// // //         where: whereClause,
// // //         include: [
// // //           {
// // //             model: Image,
// // //             as: 'images',
// // //             required: false,
// // //             where: { entityType: 'project', isMain: true }
// // //           },
// // //           {
// // //             model: Lead,
// // //             as: 'leads',
// // //             required: false,
// // //             attributes: ['id', 'status']
// // //           }
// // //         ],
// // //         order: [['isFeatured', 'DESC'], ['sortOrder', 'ASC'], ['updatedAt', 'DESC']]
// // //       });

// // //       const projectsWithCounts = projects.map(project => {
// // //         const projectData = project.toJSON();
// // //         projectData.leadCount = projectData.leads?.length || 0;
// // //         projectData.isArchived = !projectData.isActive;
// // //         return projectData;
// // //       });

// // //       sendSuccess(res, 'Projects fetched successfully', {
// // //         subDomain: {
// // //           id: subDomain.id,
// // //           title: subDomain.title,
// // //           slug: subDomain.slug
// // //         },
// // //         projects: projectsWithCounts
// // //       });
// // //     } catch (error) {
// // //       console.error('Get projects by subdomain error:', error);
// // //       sendServerError(res, 'Failed to fetch projects');
// // //     }
// // //   }

// // //   // Create new project
// // //   async createProject(req, res) {
// // //     try {
// // //       const { 
// // //         title, 
// // //         abstract, 
// // //         specifications, 
// // //         learningOutcomes, 
// // //         subDomainId,
// // //         isActive = true,
// // //         isFeatured = false,
// // //         sortOrder = 0
// // //       } = req.body;

// // //       // Validate subdomain exists and is a leaf
// // //       const subDomain = await SubDomain.findByPk(subDomainId);
// // //       if (!subDomain) {
// // //         return sendBadRequest(res, 'SubDomain not found');
// // //       }

// // //       if (!subDomain.isLeaf) {
// // //         return sendBadRequest(res, 'Projects can only be added to leaf subdomains');
// // //       }

// // //       // Check if project with this title already exists in this subdomain
// // //       const existingProject = await Project.findOne({
// // //         where: { 
// // //           title: { [Op.like]: title },
// // //           subDomainId
// // //         }
// // //       });

// // //       if (existingProject) {
// // //         return sendBadRequest(res, 'Project with this title already exists in this subdomain');
// // //       }

// // //       const project = await Project.create({
// // //         title,
// // //         abstract,
// // //         specifications,
// // //         learningOutcomes,
// // //         subDomainId,
// // //         isActive,
// // //         isFeatured,
// // //         sortOrder
// // //       });

// // //       const createdProject = await Project.findByPk(project.id, {
// // //         include: [
// // //           {
// // //             model: SubDomain,
// // //             as: 'subDomain',
// // //             include: [
// // //               {
// // //                 model: Domain,
// // //                 as: 'domain',
// // //                 attributes: ['id', 'title', 'slug']
// // //               }
// // //             ]
// // //           }
// // //         ]
// // //       });

// // //       sendCreated(res, 'Project created successfully', createdProject);
// // //     } catch (error) {
// // //       console.error('Create project error:', error);
// // //       sendServerError(res, 'Failed to create project');
// // //     }
// // //   }

// // //   // Update project
// // //   async updateProject(req, res) {
// // //     try {
// // //       const { id } = req.params;
// // //       const { 
// // //         title, 
// // //         abstract, 
// // //         specifications, 
// // //         learningOutcomes, 
// // //         isActive,
// // //         isFeatured,
// // //         sortOrder
// // //       } = req.body;

// // //       const project = await Project.findByPk(id);
// // //       if (!project) {
// // //         return sendNotFound(res, 'Project not found');
// // //       }

// // //       // Check if another project with this title exists in the same subdomain
// // //       if (title && title !== project.title) {
// // //         const existingProject = await Project.findOne({
// // //           where: { 
// // //             title: { [Op.like]: title },
// // //             subDomainId: project.subDomainId,
// // //             id: { [Op.ne]: id }
// // //           }
// // //         });

// // //         if (existingProject) {
// // //           return sendBadRequest(res, 'Project with this title already exists in this subdomain');
// // //         }
// // //       }

// // //       await project.update({
// // //         title: title || project.title,
// // //         abstract: abstract !== undefined ? abstract : project.abstract,
// // //         specifications: specifications !== undefined ? specifications : project.specifications,
// // //         learningOutcomes: learningOutcomes !== undefined ? learningOutcomes : project.learningOutcomes,
// // //         isActive: isActive !== undefined ? isActive : project.isActive,
// // //         isFeatured: isFeatured !== undefined ? isFeatured : project.isFeatured,
// // //         sortOrder: sortOrder !== undefined ? sortOrder : project.sortOrder
// // //       });

// // //       const updatedProject = await Project.findByPk(id, {
// // //         include: [
// // //           {
// // //             model: SubDomain,
// // //             as: 'subDomain',
// // //             include: [
// // //               {
// // //                 model: Domain,
// // //                 as: 'domain',
// // //                 attributes: ['id', 'title', 'slug']
// // //               }
// // //             ]
// // //           },
// // //           {
// // //             model: Image,
// // //             as: 'images',
// // //             required: false,
// // //             where: { entityType: 'project' }
// // //           }
// // //         ]
// // //       });

// // //       sendSuccess(res, 'Project updated successfully', updatedProject);
// // //     } catch (error) {
// // //       console.error('Update project error:', error);
// // //       sendServerError(res, 'Failed to update project');
// // //     }
// // //   }

// // //   // Move project to different subdomain
// // //   async moveProject(req, res) {
// // //     try {
// // //       const { id } = req.params;
// // //       const { newSubDomainId, reason } = req.body;

// // //       const project = await Project.findByPk(id, {
// // //         include: [
// // //           {
// // //             model: SubDomain,
// // //             as: 'subDomain',
// // //             include: [{ model: Domain, as: 'domain' }]
// // //           }
// // //         ]
// // //       });

// // //       if (!project) {
// // //         return sendNotFound(res, 'Project not found');
// // //       }

// // //       // Validate new subdomain
// // //       const newSubDomain = await SubDomain.findByPk(newSubDomainId, {
// // //         include: [{ model: Domain, as: 'domain' }]
// // //       });

// // //       if (!newSubDomain) {
// // //         return sendBadRequest(res, 'New subdomain not found');
// // //       }

// // //       if (!newSubDomain.isLeaf) {
// // //         return sendBadRequest(res, 'Projects can only be moved to leaf subdomains');
// // //       }

// // //       if (project.subDomainId === newSubDomainId) {
// // //         return sendBadRequest(res, 'Project is already in this subdomain');
// // //       }

// // //       // Check if project with same title exists in target subdomain
// // //       const existingProject = await Project.findOne({
// // //         where: { 
// // //           title: { [Op.like]: project.title },
// // //           subDomainId: newSubDomainId
// // //         }
// // //       });

// // //       if (existingProject) {
// // //         return sendBadRequest(res, 'Project with this title already exists in the target subdomain');
// // //       }

// // //       const oldSubDomain = project.subDomain;

// // //       // Update project
// // //       await project.update({ 
// // //         subDomainId: newSubDomainId,
// // //         sortOrder: 0 // Reset sort order in new subdomain
// // //       });

// // //       // Log the move (you might want to add an audit table for this)
// // //       console.log(`Project "${project.title}" moved from ${oldSubDomain.domain.title}/${oldSubDomain.title} to ${newSubDomain.domain.title}/${newSubDomain.title}${reason ? '. Reason: ' + reason : ''}`);

// // //       const movedProject = await Project.findByPk(id, {
// // //         include: [
// // //           {
// // //             model: SubDomain,
// // //             as: 'subDomain',
// // //             include: [
// // //               {
// // //                 model: Domain,
// // //                 as: 'domain',
// // //                 attributes: ['id', 'title', 'slug']
// // //               }
// // //             ]
// // //           }
// // //         ]
// // //       });

// // //       sendSuccess(res, 'Project moved successfully', {
// // //         project: movedProject,
// // //         moveDetails: {
// // //           from: {
// // //             domain: oldSubDomain.domain.title,
// // //             subDomain: oldSubDomain.title
// // //           },
// // //           to: {
// // //             domain: newSubDomain.domain.title,
// // //             subDomain: newSubDomain.title
// // //           },
// // //           reason: reason || 'No reason provided'
// // //         }
// // //       });
// // //     } catch (error) {
// // //       console.error('Move project error:', error);
// // //       sendServerError(res, 'Failed to move project');
// // //     }
// // //   }

// // //   // Archive/Unarchive project
// // //   async archiveProject(req, res) {
// // //     try {
// // //       const { id } = req.params;
// // //       const { archive = true, reason } = req.body;

// // //       const project = await Project.findByPk(id, {
// // //         include: [
// // //           {
// // //             model: SubDomain,
// // //             as: 'subDomain',
// // //             include: [{ model: Domain, as: 'domain' }]
// // //           }
// // //         ]
// // //       });

// // //       if (!project) {
// // //         return sendNotFound(res, 'Project not found');
// // //       }

// // //       const isArchiving = archive === true;
// // //       const newActiveStatus = !isArchiving;

// // //       if (project.isActive === newActiveStatus) {
// // //         return sendBadRequest(res, `Project is already ${isArchiving ? 'archived' : 'active'}`);
// // //       }

// // //       await project.update({ 
// // //         isActive: newActiveStatus,
// // //         isFeatured: isArchiving ? false : project.isFeatured // Remove featured status when archiving
// // //       });

// // //       const action = isArchiving ? 'archived' : 'restored';
// // //       console.log(`Project "${project.title}" ${action}${reason ? '. Reason: ' + reason : ''}`);

// // //       const updatedProject = await Project.findByPk(id, {
// // //         include: [
// // //           {
// // //             model: SubDomain,
// // //             as: 'subDomain',
// // //             include: [
// // //               {
// // //                 model: Domain,
// // //                 as: 'domain',
// // //                 attributes: ['id', 'title', 'slug']
// // //               }
// // //             ]
// // //           }
// // //         ]
// // //       });

// // //       sendSuccess(res, `Project ${action} successfully`, {
// // //         project: updatedProject,
// // //         action,
// // //         reason: reason || `No reason provided for ${action}`
// // //       });
// // //     } catch (error) {
// // //       console.error('Archive project error:', error);
// // //       sendServerError(res, 'Failed to archive/restore project');
// // //     }
// // //   }

// // //   // Delete project permanently
// // //   async deleteProject(req, res) {
// // //     try {
// // //       const { id } = req.params;
// // //       const { confirm = false } = req.body;

// // //       if (!confirm) {
// // //         return sendBadRequest(res, 'Please confirm deletion by setting confirm=true in request body');
// // //       }

// // //       const project = await Project.findByPk(id, {
// // //         include: [
// // //           {
// // //             model: Lead,
// // //             as: 'leads'
// // //           }
// // //         ]
// // //       });

// // //       if (!project) {
// // //         return sendNotFound(res, 'Project not found');
// // //       }

// // //       // Check if project has leads
// // //       const hasLeads = project.leads && project.leads.length > 0;
      
// // //       if (hasLeads) {
// // //         return sendBadRequest(res, 
// // //           `Cannot delete project that has ${project.leads.length} lead(s). Archive it instead or delete leads first.`
// // //         );
// // //       }

// // //       // Delete associated images
// // //       await Image.destroy({
// // //         where: {
// // //           entityType: 'project',
// // //           entityId: id
// // //         }
// // //       });

// // //       await project.destroy();

// // //       sendSuccess(res, 'Project deleted successfully');
// // //     } catch (error) {
// // //       console.error('Delete project error:', error);
// // //       sendServerError(res, 'Failed to delete project');
// // //     }
// // //   }

// // //   // Get project statistics
// // //   async getProjectStats(req, res) {
// // //     try {
// // //       const { id } = req.params;

// // //       const project = await Project.findByPk(id, {
// // //         include: [
// // //           {
// // //             model: SubDomain,
// // //             as: 'subDomain',
// // //             include: [{ model: Domain, as: 'domain' }]
// // //           },
// // //           {
// // //             model: Lead,
// // //             as: 'leads'
// // //           }
// // //         ]
// // //       });

// // //       if (!project) {
// // //         return sendNotFound(res, 'Project not found');
// // //       }

// // //       const leads = project.leads || [];
// // //       const leadStats = {
// // //         total: leads.length,
// // //         new: leads.filter(l => l.status === 'new').length,
// // //         contacted: leads.filter(l => l.status === 'contacted').length,
// // //         converted: leads.filter(l => l.status === 'converted').length,
// // //         closed: leads.filter(l => l.status === 'closed').length
// // //       };

// // //       const stats = {
// // //         project: {
// // //           id: project.id,
// // //           title: project.title,
// // //           isActive: project.isActive,
// // //           isFeatured: project.isFeatured,
// // //           viewCount: project.viewCount,
// // //           leadCount: project.leadCount
// // //         },
// // //         location: {
// // //           domain: project.subDomain.domain.title,
// // //           subDomain: project.subDomain.title
// // //         },
// // //         leads: leadStats,
// // //         performance: {
// // //           conversionRate: leads.length > 0 ? ((leadStats.converted / leads.length) * 100).toFixed(2) + '%' : '0%',
// // //           activeLeads: leadStats.new + leadStats.contacted
// // //         }
// // //       };

// // //       sendSuccess(res, 'Project statistics fetched successfully', stats);
// // //     } catch (error) {
// // //       console.error('Get project stats error:', error);
// // //       sendServerError(res, 'Failed to fetch project statistics');
// // //     }
// // //   }

// // //   // Bulk operations
// // //   async bulkUpdateProjects(req, res) {
// // //     try {
// // //       const { projectIds, updates } = req.body;

// // //       if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
// // //         return sendBadRequest(res, 'Project IDs array is required');
// // //       }

// // //       if (!updates || Object.keys(updates).length === 0) {
// // //         return sendBadRequest(res, 'Updates object is required');
// // //       }

// // //       // Validate that all projects exist
// // //       const projects = await Project.findAll({
// // //         where: { id: { [Op.in]: projectIds } }
// // //       });

// // //       if (projects.length !== projectIds.length) {
// // //         return sendBadRequest(res, 'Some projects were not found');
// // //       }

// // //       // Perform bulk update
// // //       const allowedUpdates = ['isActive', 'isFeatured', 'sortOrder'];
// // //       const filteredUpdates = {};
      
// // //       Object.keys(updates).forEach(key => {
// // //         if (allowedUpdates.includes(key)) {
// // //           filteredUpdates[key] = updates[key];
// // //         }
// // //       });

// // //       if (Object.keys(filteredUpdates).length === 0) {
// // //         return sendBadRequest(res, 'No valid updates provided');
// // //       }

// // //       await Project.update(filteredUpdates, {
// // //         where: { id: { [Op.in]: projectIds } }
// // //       });

// // //       sendSuccess(res, `${projectIds.length} projects updated successfully`, {
// // //         updatedCount: projectIds.length,
// // //         updates: filteredUpdates
// // //       });
// // //     } catch (error) {
// // //       console.error('Bulk update projects error:', error);
// // //       sendServerError(res, 'Failed to update projects');
// // //     }
// // //   }
// // // }

// // // module.exports = new ProjectController();


// // // // const { Domain, SubDomain, Project, Lead, Image } = require('../models');
// // // // const { 
// // // //   sendSuccess, 
// // // //   sendCreated, 
// // // //   sendBadRequest, 
// // // //   sendNotFound,
// // // //   sendServerError 
// // // // } = require('../utils/responseHelper');
// // // // const { Op } = require('sequelize');

// // // // class ProjectController {
// // // //   // Get all projects with pagination and filtering
// // // //   async getAllProjects(req, res) {
// // // //     try {
// // // //       const { 
// // // //         page = 1, 
// // // //         limit = 10, 
// // // //         search = '', 
// // // //         subDomainId,
// // // //         domainId,
// // // //         isActive,
// // // //         isFeatured,
// // // //         isArchived,
// // // //         sortBy = 'updatedAt',
// // // //         sortOrder = 'DESC'
// // // //       } = req.query;

// // // //       const offset = (page - 1) * limit;
// // // //       const whereClause = {};
// // // //       const includeWhere = {};

// // // //       if (search) {
// // // //         whereClause[Op.or] = [
// // // //           { title: { [Op.like]: `%${search}%` } },
// // // //           { abstract: { [Op.like]: `%${search}%` } },
// // // //           { specifications: { [Op.like]: `%${search}%` } }
// // // //         ];
// // // //       }

// // // //       if (subDomainId) whereClause.subDomainId = subDomainId;
// // // //       if (isActive !== undefined) whereClause.isActive = isActive === 'true';
// // // //       if (isFeatured !== undefined) whereClause.isFeatured = isFeatured === 'true';
      
// // // //       // Handle archived status
// // // //       if (isArchived !== undefined) {
// // // //         whereClause.isActive = isArchived === 'true' ? false : true;
// // // //       }

// // // //       if (domainId) {
// // // //         includeWhere.domainId = domainId;
// // // //       }

// // // //       const { count, rows: projects } = await Project.findAndCountAll({
// // // //         where: whereClause,
// // // //         include: [
// // // //           {
// // // //             model: SubDomain,
// // // //             as: 'subDomain',
// // // //             where: includeWhere,
// // // //             include: [
// // // //               {
// // // //                 model: Domain,
// // // //                 as: 'domain',
// // // //                 attributes: ['id', 'title', 'slug']
// // // //               }
// // // //             ]
// // // //           },
// // // //           {
// // // //             model: Image,
// // // //             as: 'images',
// // // //             required: false,
// // // //             where: { entityType: 'project' },
// // // //             order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
// // // //           },
// // // //           {
// // // //             model: Lead,
// // // //             as: 'leads',
// // // //             required: false,
// // // //             attributes: ['id', 'status']
// // // //           }
// // // //         ],
// // // //         order: [[sortBy, sortOrder]],
// // // //         limit: parseInt(limit),
// // // //         offset: parseInt(offset),
// // // //         distinct: true
// // // //       });

// // // //       // Add lead counts and status
// // // //       const projectsWithCounts = projects.map(project => {
// // // //         const projectData = project.toJSON();
// // // //         projectData.leadCount = projectData.leads?.length || 0;
// // // //         projectData.newLeadCount = projectData.leads?.filter(lead => lead.status === 'new').length || 0;
// // // //         projectData.isArchived = !projectData.isActive;
// // // //         return projectData;
// // // //       });

// // // //       const totalPages = Math.ceil(count / limit);

// // // //       sendSuccess(res, 'Projects fetched successfully', {
// // // //         projects: projectsWithCounts,
// // // //         pagination: {
// // // //           currentPage: parseInt(page),
// // // //           totalPages,
// // // //           totalItems: count,
// // // //           itemsPerPage: parseInt(limit)
// // // //         }
// // // //       });
// // // //     } catch (error) {
// // // //       console.error('Get projects error:', error);
// // // //       sendServerError(res, 'Failed to fetch projects');
// // // //     }
// // // //   }

// // // //   // Get project by ID with full details
// // // //   async getProjectById(req, res) {
// // // //     try {
// // // //       const { id } = req.params;

// // // //       const project = await Project.findByPk(id, {
// // // //         include: [
// // // //           {
// // // //             model: SubDomain,
// // // //             as: 'subDomain',
// // // //             include: [
// // // //               {
// // // //                 model: Domain,
// // // //                 as: 'domain',
// // // //                 attributes: ['id', 'title', 'slug']
// // // //               },
// // // //               {
// // // //                 model: SubDomain,
// // // //                 as: 'parent',
// // // //                 attributes: ['id', 'title', 'slug'],
// // // //                 required: false
// // // //               }
// // // //             ]
// // // //           },
// // // //           {
// // // //             model: Image,
// // // //             as: 'images',
// // // //             required: false,
// // // //             where: { entityType: 'project' },
// // // //             order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
// // // //           },
// // // //           {
// // // //             model: Lead,
// // // //             as: 'leads',
// // // //             required: false,
// // // //             order: [['createdAt', 'DESC']]
// // // //           }
// // // //         ]
// // // //       });

// // // //       if (!project) {
// // // //         return sendNotFound(res, 'Project not found');
// // // //       }

// // // //       // Add computed fields
// // // //       const projectData = project.toJSON();
// // // //       projectData.leadCount = projectData.leads?.length || 0;
// // // //       projectData.newLeadCount = projectData.leads?.filter(lead => lead.status === 'new').length || 0;
// // // //       projectData.isArchived = !projectData.isActive;

// // // //       sendSuccess(res, 'Project fetched successfully', projectData);
// // // //     } catch (error) {
// // // //       console.error('Get project by ID error:', error);
// // // //       sendServerError(res, 'Failed to fetch project');
// // // //     }
// // // //   }

// // // //   // Get projects by subdomain
// // // //   async getProjectsBySubDomain(req, res) {
// // // //     try {
// // // //       const { subDomainId } = req.params;
// // // //       const { includeArchived = false } = req.query;

// // // //       const subDomain = await SubDomain.findByPk(subDomainId);
// // // //       if (!subDomain) {
// // // //         return sendNotFound(res, 'SubDomain not found');
// // // //       }

// // // //       const whereClause = { subDomainId };
// // // //       if (includeArchived !== 'true') {
// // // //         whereClause.isActive = true;
// // // //       }

// // // //       const projects = await Project.findAll({
// // // //         where: whereClause,
// // // //         include: [
// // // //           {
// // // //             model: Image,
// // // //             as: 'images',
// // // //             required: false,
// // // //             where: { entityType: 'project', isMain: true }
// // // //           },
// // // //           {
// // // //             model: Lead,
// // // //             as: 'leads',
// // // //             required: false,
// // // //             attributes: ['id', 'status']
// // // //           }
// // // //         ],
// // // //         order: [['isFeatured', 'DESC'], ['sortOrder', 'ASC'], ['updatedAt', 'DESC']]
// // // //       });

// // // //       const projectsWithCounts = projects.map(project => {
// // // //         const projectData = project.toJSON();
// // // //         projectData.leadCount = projectData.leads?.length || 0;
// // // //         projectData.isArchived = !projectData.isActive;
// // // //         return projectData;
// // // //       });

// // // //       sendSuccess(res, 'Projects fetched successfully', {
// // // //         subDomain: {
// // // //           id: subDomain.id,
// // // //           title: subDomain.title,
// // // //           slug: subDomain.slug
// // // //         },
// // // //         projects: projectsWithCounts
// // // //       });
// // // //     } catch (error) {
// // // //       console.error('Get projects by subdomain error:', error);
// // // //       sendServerError(res, 'Failed to fetch projects');
// // // //     }
// // // //   }

// // // //   // Create new project
// // // //   async createProject(req, res) {
// // // //     try {
// // // //       const { 
// // // //         title, 
// // // //         abstract, 
// // // //         specifications, 
// // // //         learningOutcomes, 
// // // //         subDomainId,
// // // //         isActive = true,
// // // //         isFeatured = false,
// // // //         sortOrder = 0
// // // //       } = req.body;

// // // //       // Validate subdomain exists and is a leaf
// // // //       const subDomain = await SubDomain.findByPk(subDomainId);
// // // //       if (!subDomain) {
// // // //         return sendBadRequest(res, 'SubDomain not found');
// // // //       }

// // // //       if (!subDomain.isLeaf) {
// // // //         return sendBadRequest(res, 'Projects can only be added to leaf subdomains');
// // // //       }

// // // //       // Check if project with this title already exists in this subdomain
// // // //       const existingProject = await Project.findOne({
// // // //         where: { 
// // // //           title: { [Op.like]: title },
// // // //           subDomainId
// // // //         }
// // // //       });

// // // //       if (existingProject) {
// // // //         return sendBadRequest(res, 'Project with this title already exists in this subdomain');
// // // //       }

// // // //       const project = await Project.create({
// // // //         title,
// // // //         abstract,
// // // //         specifications,
// // // //         learningOutcomes,
// // // //         subDomainId,
// // // //         isActive,
// // // //         isFeatured,
// // // //         sortOrder
// // // //       });

// // // //       const createdProject = await Project.findByPk(project.id, {
// // // //         include: [
// // // //           {
// // // //             model: SubDomain,
// // // //             as: 'subDomain',
// // // //             include: [
// // // //               {
// // // //                 model: Domain,
// // // //                 as: 'domain',
// // // //                 attributes: ['id', 'title', 'slug']
// // // //               }
// // // //             ]
// // // //           }
// // // //         ]
// // // //       });

// // // //       sendCreated(res, 'Project created successfully', createdProject);
// // // //     } catch (error) {
// // // //       console.error('Create project error:', error);
// // // //       sendServerError(res, 'Failed to create project');
// // // //     }
// // // //   }

// // // //   // Update project
// // // //   async updateProject(req, res) {
// // // //     try {
// // // //       const { id } = req.params;
// // // //       const { 
// // // //         title, 
// // // //         abstract, 
// // // //         specifications, 
// // // //         learningOutcomes, 
// // // //         isActive,
// // // //         isFeatured,
// // // //         sortOrder
// // // //       } = req.body;

// // // //       const project = await Project.findByPk(id);
// // // //       if (!project) {
// // // //         return sendNotFound(res, 'Project not found');
// // // //       }

// // // //       // Check if another project with this title exists in the same subdomain
// // // //       if (title && title !== project.title) {
// // // //         const existingProject = await Project.findOne({
// // // //           where: { 
// // // //             title: { [Op.like]: title },
// // // //             subDomainId: project.subDomainId,
// // // //             id: { [Op.ne]: id }
// // // //           }
// // // //         });

// // // //         if (existingProject) {
// // // //           return sendBadRequest(res, 'Project with this title already exists in this subdomain');
// // // //         }
// // // //       }

// // // //       await project.update({
// // // //         title: title || project.title,
// // // //         abstract: abstract !== undefined ? abstract : project.abstract,
// // // //         specifications: specifications !== undefined ? specifications : project.specifications,
// // // //         learningOutcomes: learningOutcomes !== undefined ? learningOutcomes : project.learningOutcomes,
// // // //         isActive: isActive !== undefined ? isActive : project.isActive,
// // // //         isFeatured: isFeatured !== undefined ? isFeatured : project.isFeatured,
// // // //         sortOrder: sortOrder !== undefined ? sortOrder : project.sortOrder
// // // //       });

// // // //       const updatedProject = await Project.findByPk(id, {
// // // //         include: [
// // // //           {
// // // //             model: SubDomain,
// // // //             as: 'subDomain',
// // // //             include: [
// // // //               {
// // // //                 model: Domain,
// // // //                 as: 'domain',
// // // //                 attributes: ['id', 'title', 'slug']
// // // //               }
// // // //             ]
// // // //           },
// // // //           {
// // // //             model: Image,
// // // //             as: 'images',
// // // //             required: false,
// // // //             where: { entityType: 'project' }
// // // //           }
// // // //         ]
// // // //       });

// // // //       sendSuccess(res, 'Project updated successfully', updatedProject);
// // // //     } catch (error) {
// // // //       console.error('Update project error:', error);
// // // //       sendServerError(res, 'Failed to update project');
// // // //     }
// // // //   }

// // // //   // Move project to different subdomain
// // // //   async moveProject(req, res) {
// // // //     try {
// // // //       const { id } = req.params;
// // // //       const { newSubDomainId, reason } = req.body;

// // // //       const project = await Project.findByPk(id, {
// // // //         include: [
// // // //           {
// // // //             model: SubDomain,
// // // //             as: 'subDomain',
// // // //             include: [{ model: Domain, as: 'domain' }]
// // // //           }
// // // //         ]
// // // //       });

// // // //       if (!project) {
// // // //         return sendNotFound(res, 'Project not found');
// // // //       }

// // // //       // Validate new subdomain
// // // //       const newSubDomain = await SubDomain.findByPk(newSubDomainId, {
// // // //         include: [{ model: Domain, as: 'domain' }]
// // // //       });

// // // //       if (!newSubDomain) {
// // // //         return sendBadRequest(res, 'New subdomain not found');
// // // //       }

// // // //       if (!newSubDomain.isLeaf) {
// // // //         return sendBadRequest(res, 'Projects can only be moved to leaf subdomains');
// // // //       }

// // // //       if (project.subDomainId === newSubDomainId) {
// // // //         return sendBadRequest(res, 'Project is already in this subdomain');
// // // //       }

// // // //       // Check if project with same title exists in target subdomain
// // // //       const existingProject = await Project.findOne({
// // // //         where: { 
// // // //           title: { [Op.like]: project.title },
// // // //           subDomainId: newSubDomainId
// // // //         }
// // // //       });

// // // //       if (existingProject) {
// // // //         return sendBadRequest(res, 'Project with this title already exists in the target subdomain');
// // // //       }

// // // //       const oldSubDomain = project.subDomain;

// // // //       // Update project
// // // //       await project.update({ 
// // // //         subDomainId: newSubDomainId,
// // // //         sortOrder: 0 // Reset sort order in new subdomain
// // // //       });

// // // //       // Log the move (you might want to add an audit table for this)
// // // //       console.log(`Project "${project.title}" moved from ${oldSubDomain.domain.title}/${oldSubDomain.title} to ${newSubDomain.domain.title}/${newSubDomain.title}${reason ? '. Reason: ' + reason : ''}`);

// // // //       const movedProject = await Project.findByPk(id, {
// // // //         include: [
// // // //           {
// // // //             model: SubDomain,
// // // //             as: 'subDomain',
// // // //             include: [
// // // //               {
// // // //                 model: Domain,
// // // //                 as: 'domain',
// // // //                 attributes: ['id', 'title', 'slug']
// // // //               }
// // // //             ]
// // // //           }
// // // //         ]
// // // //       });

// // // //       sendSuccess(res, 'Project moved successfully', {
// // // //         project: movedProject,
// // // //         moveDetails: {
// // // //           from: {
// // // //             domain: oldSubDomain.domain.title,
// // // //             subDomain: oldSubDomain.title
// // // //           },
// // // //           to: {
// // // //             domain: newSubDomain.domain.title,
// // // //             subDomain: newSubDomain.title
// // // //           },
// // // //           reason: reason || 'No reason provided'
// // // //         }
// // // //       });
// // // //     } catch (error) {
// // // //       console.error('Move project error:', error);
// // // //       sendServerError(res, 'Failed to move project');
// // // //     }
// // // //   }

// // // //   // Archive/Unarchive project
// // // //   async archiveProject(req, res) {
// // // //     try {
// // // //       const { id } = req.params;
// // // //       const { archive = true, reason } = req.body;

// // // //       const project = await Project.findByPk(id, {
// // // //         include: [
// // // //           {
// // // //             model: SubDomain,
// // // //             as: 'subDomain',
// // // //             include: [{ model: Domain, as: 'domain' }]
// // // //           }
// // // //         ]
// // // //       });

// // // //       if (!project) {
// // // //         return sendNotFound(res, 'Project not found');
// // // //       }

// // // //       const isArchiving = archive === true;
// // // //       const newActiveStatus = !isArchiving;

// // // //       if (project.isActive === newActiveStatus) {
// // // //         return sendBadRequest(res, `Project is already ${isArchiving ? 'archived' : 'active'}`);
// // // //       }

// // // //       await project.update({ 
// // // //         isActive: newActiveStatus,
// // // //         isFeatured: isArchiving ? false : project.isFeatured // Remove featured status when archiving
// // // //       });

// // // //       const action = isArchiving ? 'archived' : 'restored';
// // // //       console.log(`Project "${project.title}" ${action}${reason ? '. Reason: ' + reason : ''}`);

// // // //       const updatedProject = await Project.findByPk(id, {
// // // //         include: [
// // // //           {
// // // //             model: SubDomain,
// // // //             as: 'subDomain',
// // // //             include: [
// // // //               {
// // // //                 model: Domain,
// // // //                 as: 'domain',
// // // //                 attributes: ['id', 'title', 'slug']
// // // //               }
// // // //             ]
// // // //           }
// // // //         ]
// // // //       });

// // // //       sendSuccess(res, `Project ${action} successfully`, {
// // // //         project: updatedProject,
// // // //         action,
// // // //         reason: reason || `No reason provided for ${action}`
// // // //       });
// // // //     } catch (error) {
// // // //       console.error('Archive project error:', error);
// // // //       sendServerError(res, 'Failed to archive/restore project');
// // // //     }
// // // //   }

// // // //   // Delete project permanently
// // // //   async deleteProject(req, res) {
// // // //     try {
// // // //       const { id } = req.params;
// // // //       const { confirm = false } = req.body;

// // // //       if (!confirm) {
// // // //         return sendBadRequest(res, 'Please confirm deletion by setting confirm=true in request body');
// // // //       }

// // // //       const project = await Project.findByPk(id, {
// // // //         include: [
// // // //           {
// // // //             model: Lead,
// // // //             as: 'leads'
// // // //           }
// // // //         ]
// // // //       });

// // // //       if (!project) {
// // // //         return sendNotFound(res, 'Project not found');
// // // //       }

// // // //       // Check if project has leads
// // // //       const hasLeads = project.leads && project.leads.length > 0;
      
// // // //       if (hasLeads) {
// // // //         return sendBadRequest(res, 
// // // //           `Cannot delete project that has ${project.leads.length} lead(s). Archive it instead or delete leads first.`
// // // //         );
// // // //       }

// // // //       // Delete associated images
// // // //       await Image.destroy({
// // // //         where: {
// // // //           entityType: 'project',
// // // //           entityId: id
// // // //         }
// // // //       });

// // // //       await project.destroy();

// // // //       sendSuccess(res, 'Project deleted successfully');
// // // //     } catch (error) {
// // // //       console.error('Delete project error:', error);
// // // //       sendServerError(res, 'Failed to delete project');
// // // //     }
// // // //   }

// // // //   // Get project statistics
// // // //   async getProjectStats(req, res) {
// // // //     try {
// // // //       const { id } = req.params;

// // // //       const project = await Project.findByPk(id, {
// // // //         include: [
// // // //           {
// // // //             model: SubDomain,
// // // //             as: 'subDomain',
// // // //             include: [{ model: Domain, as: 'domain' }]
// // // //           },
// // // //           {
// // // //             model: Lead,
// // // //             as: 'leads'
// // // //           }
// // // //         ]
// // // //       });

// // // //       if (!project) {
// // // //         return sendNotFound(res, 'Project not found');
// // // //       }

// // // //       const leads = project.leads || [];
// // // //       const leadStats = {
// // // //         total: leads.length,
// // // //         new: leads.filter(l => l.status === 'new').length,
// // // //         contacted: leads.filter(l => l.status === 'contacted').length,
// // // //         converted: leads.filter(l => l.status === 'converted').length,
// // // //         closed: leads.filter(l => l.status === 'closed').length
// // // //       };

// // // //       const stats = {
// // // //         project: {
// // // //           id: project.id,
// // // //           title: project.title,
// // // //           isActive: project.isActive,
// // // //           isFeatured: project.isFeatured,
// // // //           viewCount: project.viewCount,
// // // //           leadCount: project.leadCount
// // // //         },
// // // //         location: {
// // // //           domain: project.subDomain.domain.title,
// // // //           subDomain: project.subDomain.title
// // // //         },
// // // //         leads: leadStats,
// // // //         performance: {
// // // //           conversionRate: leads.length > 0 ? ((leadStats.converted / leads.length) * 100).toFixed(2) + '%' : '0%',
// // // //           activeLeads: leadStats.new + leadStats.contacted
// // // //         }
// // // //       };

// // // //       sendSuccess(res, 'Project statistics fetched successfully', stats);
// // // //     } catch (error) {
// // // //       console.error('Get project stats error:', error);
// // // //       sendServerError(res, 'Failed to fetch project statistics');
// // // //     }
// // // //   }

// // // //   // Bulk operations
// // // //   async bulkUpdateProjects(req, res) {
// // // //     try {
// // // //       const { projectIds, updates } = req.body;

// // // //       if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
// // // //         return sendBadRequest(res, 'Project IDs array is required');
// // // //       }

// // // //       if (!updates || Object.keys(updates).length === 0) {
// // // //         return sendBadRequest(res, 'Updates object is required');
// // // //       }

// // // //       // Validate that all projects exist
// // // //       const projects = await Project.findAll({
// // // //         where: { id: { [Op.in]: projectIds } }
// // // //       });

// // // //       if (projects.length !== projectIds.length) {
// // // //         return sendBadRequest(res, 'Some projects were not found');
// // // //       }

// // // //       // Perform bulk update
// // // //       const allowedUpdates = ['isActive', 'isFeatured', 'sortOrder'];
// // // //       const filteredUpdates = {};
      
// // // //       Object.keys(updates).forEach(key => {
// // // //         if (allowedUpdates.includes(key)) {
// // // //           filteredUpdates[key] = updates[key];
// // // //         }
// // // //       });

// // // //       if (Object.keys(filteredUpdates).length === 0) {
// // // //         return sendBadRequest(res, 'No valid updates provided');
// // // //       }

// // // //       await Project.update(filteredUpdates, {
// // // //         where: { id: { [Op.in]: projectIds } }
// // // //       });

// // // //       sendSuccess(res, `${projectIds.length} projects updated successfully`, {
// // // //         updatedCount: projectIds.length,
// // // //         updates: filteredUpdates
// // // //       });
// // // //     } catch (error) {
// // // //       console.error('Bulk update projects error:', error);
// // // //       sendServerError(res, 'Failed to update projects');
// // // //     }
// // // //   }
// // // // }

// // // // module.exports = new ProjectController();