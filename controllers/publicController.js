const { Domain, SubDomain, Project, Lead, Image } = require('../models');
const { 
  sendSuccess, 
  sendCreated, 
  sendBadRequest, 
  sendNotFound,
  sendServerError 
} = require('../utils/responseHelper');
const { Op } = require('sequelize');

// Public Domain Controller
class PublicDomainController {
  // Get all active domains for public display
  async getAllDomains(req, res) {
    try {
      const domains = await Domain.findAll({
        where: { isActive: true },
        include: [
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'domain' },
            order: [['sortOrder', 'ASC'], ['isMain', 'DESC']],
            limit: 5 // Limit images for performance
          },
          {
            model: SubDomain,
            as: 'subDomains',
            where: { isActive: true },
            required: false,
            attributes: ['id', 'title', 'slug', 'isLeaf'],
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
        order: [['sortOrder', 'ASC'], ['title', 'ASC']]
      });

      const domainsWithCounts = domains.map(domain => {
        const domainData = domain.toJSON();
        domainData.projectCount = domainData.subDomains?.reduce((acc, sub) => 
          acc + (sub.projects?.length || 0), 0) || 0;
        domainData.subDomainCount = domainData.subDomains?.length || 0;
        // Remove detailed subdomain info for listing page
        domainData.subDomains = domainData.subDomains?.map(sub => ({
          id: sub.id,
          title: sub.title,
          slug: sub.slug,
          isLeaf: sub.isLeaf
        }));
        return domainData;
      });

      sendSuccess(res, 'Domains fetched successfully', domainsWithCounts);
    } catch (error) {
      console.error('Get public domains error:', error);
      sendServerError(res, 'Failed to fetch domains');
    }
  }

  // Get domain by slug with subdomains
  async getDomainBySlug(req, res) {
    try {
      const { slug } = req.params;

      const domain = await Domain.findOne({
        where: { slug, isActive: true },
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
            where: { isActive: true, level: 1 }, // Only top-level subdomains
            required: false,
            include: [
              {
                model: Image,
                as: 'images',
                required: false,
                where: { entityType: 'subdomain', isMain: true }
              },
              {
                model: SubDomain,
                as: 'children',
                where: { isActive: true },
                required: false,
                attributes: ['id', 'title', 'slug', 'isLeaf']
              },
              {
                model: Project,
                as: 'projects',
                where: { isActive: true },
                required: false,
                attributes: ['id', 'title', 'slug', 'isFeatured'],
                include: [
                  {
                    model: Image,
                    as: 'images',
                    required: false,
                    where: { entityType: 'project', isMain: true }
                  }
                ]
              }
            ]
          }
        ]
      });

      if (!domain) {
        return sendNotFound(res, 'Domain not found');
      }

      // Increment view count (optional)
      // await domain.increment('viewCount');

      sendSuccess(res, 'Domain fetched successfully', domain);
    } catch (error) {
      console.error('Get domain by slug error:', error);
      sendServerError(res, 'Failed to fetch domain');
    }
  }
}

// Public SubDomain Controller
class PublicSubDomainController {
  // Get subdomain by slug with children and projects
  async getSubDomainBySlug(req, res) {
    try {
      const { slug } = req.params;

      const subDomain = await SubDomain.findOne({
        where: { slug, isActive: true },
        include: [
          {
            model: Domain,
            as: 'domain',
            where: { isActive: true },
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
            where: { entityType: 'subdomain' },
            order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
          },
          {
            model: SubDomain,
            as: 'children',
            where: { isActive: true },
            required: false,
            include: [
              {
                model: Image,
                as: 'images',
                required: false,
                where: { entityType: 'subdomain', isMain: true }
              },
              {
                model: Project,
                as: 'projects',
                where: { isActive: true },
                required: false,
                attributes: ['id', 'title', 'slug', 'isFeatured']
              }
            ]
          },
          {
            model: Project,
            as: 'projects',
            where: { isActive: true },
            required: false,
            include: [
              {
                model: Image,
                as: 'images',
                required: false,
                where: { entityType: 'project' },
                order: [['sortOrder', 'ASC'], ['isMain', 'DESC']],
                limit: 3
              }
            ],
            order: [['isFeatured', 'DESC'], ['sortOrder', 'ASC']]
          }
        ]
      });

      if (!subDomain) {
        return sendNotFound(res, 'SubDomain not found');
      }

      sendSuccess(res, 'SubDomain fetched successfully', subDomain);
    } catch (error) {
      console.error('Get subdomain by slug error:', error);
      sendServerError(res, 'Failed to fetch subdomain');
    }
  }
}

// Public Project Controller
class PublicProjectController {
  // Get project preview (limited information)
  async getProjectPreview(req, res) {
    try {
      const { slug } = req.params;

      const project = await Project.findOne({
        where: { slug, isActive: true },
        attributes: [
          'id', 'title', 'slug', 'abstract', 'isFeatured', 'viewCount'
        ],
        include: [
          {
            model: SubDomain,
            as: 'subDomain',
            where: { isActive: true },
            include: [
              {
                model: Domain,
                as: 'domain',
                where: { isActive: true },
                attributes: ['id', 'title', 'slug']
              }
            ]
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'project' },
            order: [['sortOrder', 'ASC'], ['isMain', 'DESC']],
            limit: 5
          }
        ]
      });

      if (!project) {
        return sendNotFound(res, 'Project not found');
      }

      // Increment view count
      await project.increment('viewCount');

      // Return limited information - full details only after contact form
      const projectPreview = {
        ...project.toJSON(),
        abstract: project.abstract ? project.abstract.substring(0, 200) + '...' : '',
        specifications: 'Available after contact',
        learningOutcomes: 'Available after contact',
        blockDiagram: 'Available after contact',
        fullDetailsAvailable: false
      };

      sendSuccess(res, 'Project preview fetched successfully', projectPreview);
    } catch (error) {
      console.error('Get project preview error:', error);
      sendServerError(res, 'Failed to fetch project preview');
    }
  }

  // Get featured projects
  async getFeaturedProjects(req, res) {
    try {
      const { limit = 6 } = req.query;

      const projects = await Project.findAll({
        where: { isActive: true, isFeatured: true },
        include: [
          {
            model: SubDomain,
            as: 'subDomain',
            where: { isActive: true },
            include: [
              {
                model: Domain,
                as: 'domain',
                where: { isActive: true },
                attributes: ['id', 'title', 'slug']
              }
            ]
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'project', isMain: true }
          }
        ],
        order: [['sortOrder', 'ASC'], ['updatedAt', 'DESC']],
        limit: parseInt(limit)
      });

      const projectPreviews = projects.map(project => ({
        id: project.id,
        title: project.title,
        slug: project.slug,
        abstract: project.abstract ? project.abstract.substring(0, 150) + '...' : '',
        domain: project.subDomain.domain.title,
        subDomain: project.subDomain.title,
        image: project.images?.[0] || null,
        viewCount: project.viewCount
      }));

      sendSuccess(res, 'Featured projects fetched successfully', projectPreviews);
    } catch (error) {
      console.error('Get featured projects error:', error);
      sendServerError(res, 'Failed to fetch featured projects');
    }
  }
}

// Contact Controller
class ContactController {
  // Submit contact form and reveal project details
  async submitContactForm(req, res) {
    try {
      const { 
        fullName, 
        email, 
        phoneNumber, 
        collegeName, 
        branch, 
        city, 
        projectId,
        domainInterest 
      } = req.body;

      // Validate project exists
      const project = await Project.findByPk(projectId, {
        where: { isActive: true },
        include: [
          {
            model: SubDomain,
            as: 'subDomain',
            include: [
              {
                model: Domain,
                as: 'domain'
              }
            ]
          },
          {
            model: Image,
            as: 'images',
            required: false,
            where: { entityType: 'project' },
            order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
          }
        ]
      });

      if (!project) {
        return sendBadRequest(res, 'Project not found or not active');
      }

      // Check if lead already exists with same email and project
      const existingLead = await Lead.findOne({
        where: { email, projectId }
      });

      if (existingLead) {
        // Return full project details for existing lead
        const fullProject = {
          ...project.toJSON(),
          fullDetailsAvailable: true
        };

        return sendSuccess(res, 'Project details retrieved (existing contact)', {
          project: fullProject,
          lead: {
            id: existingLead.id,
            status: existingLead.status,
            submittedAt: existingLead.createdAt
          },
          isNewLead: false
        });
      }

      // Create new lead
      const lead = await Lead.create({
        fullName,
        email,
        phoneNumber,
        collegeName,
        branch,
        city,
        projectId,
        domainInterest: domainInterest || project.subDomain.domain.title,
        status: 'new'
      });

      // Increment project lead count
      await project.increment('leadCount');

      // Return full project details
      const fullProject = {
        ...project.toJSON(),
        fullDetailsAvailable: true
      };

      sendCreated(res, 'Contact form submitted successfully! Project details unlocked.', {
        project: fullProject,
        lead: {
          id: lead.id,
          status: lead.status,
          submittedAt: lead.createdAt
        },
        isNewLead: true
      });
    } catch (error) {
      console.error('Submit contact form error:', error);
      sendServerError(res, 'Failed to submit contact form');
    }
  }

  // Get contact form data for a project
  async getContactFormData(req, res) {
    try {
      const { projectId } = req.params;

      const project = await Project.findByPk(projectId, {
        where: { isActive: true },
        attributes: ['id', 'title'],
        include: [
          {
            model: SubDomain,
            as: 'subDomain',
            attributes: ['title'],
            include: [
              {
                model: Domain,
                as: 'domain',
                attributes: ['title']
              }
            ]
          }
        ]
      });

      if (!project) {
        return sendNotFound(res, 'Project not found');
      }

      const formData = {
        project: {
          id: project.id,
          title: project.title,
          domain: project.subDomain.domain.title,
          subDomain: project.subDomain.title
        },
        suggestedDomainInterest: project.subDomain.domain.title
      };

      sendSuccess(res, 'Contact form data fetched successfully', formData);
    } catch (error) {
      console.error('Get contact form data error:', error);
      sendServerError(res, 'Failed to fetch contact form data');
    }
  }
}

module.exports = {
  PublicDomainController: new PublicDomainController(),
  PublicSubDomainController: new PublicSubDomainController(),
  PublicProjectController: new PublicProjectController(),
  ContactController: new ContactController()
};