const { Domain, SubDomain, Project, Lead } = require('../models');
const { 
  sendSuccess, 
  sendCreated, 
  sendBadRequest, 
  sendNotFound,
  sendServerError 
} = require('../utils/responseHelper');
const { Op } = require('sequelize');

class LeadController {
  // Get all leads with pagination and filtering
  async getAllLeads(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        status,
        projectId,
        domainId,
        dateFrom,
        dateTo,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};
      const projectWhere = {};
      const subDomainWhere = {};

      // Search in lead fields
      if (search) {
        whereClause[Op.or] = [
          { fullName: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { collegeName: { [Op.like]: `%${search}%` } },
          { phoneNumber: { [Op.like]: `%${search}%` } },
          { city: { [Op.like]: `%${search}%` } }
        ];
      }

      if (status) whereClause.status = status;
      if (projectId) whereClause.projectId = projectId;

      // Date filtering
      if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) whereClause.createdAt[Op.gte] = new Date(dateFrom);
        if (dateTo) whereClause.createdAt[Op.lte] = new Date(dateTo);
      }

      // Domain filtering
      if (domainId) {
        subDomainWhere.domainId = domainId;
      }

      const { count, rows: leads } = await Lead.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'title', 'slug'],
            where: projectWhere,
            include: [
              {
                model: SubDomain,
                as: 'subDomain',
                attributes: ['id', 'title', 'slug'],
                where: subDomainWhere,
                include: [
                  {
                    model: Domain,
                    as: 'domain',
                    attributes: ['id', 'title', 'slug']
                  }
                ]
              }
            ]
          }
        ],
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      });

      const totalPages = Math.ceil(count / limit);

      sendSuccess(res, 'Leads fetched successfully', {
        leads,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Get leads error:', error);
      sendServerError(res, 'Failed to fetch leads');
    }
  }

  // Get lead by ID
  async getLeadById(req, res) {
    try {
      const { id } = req.params;

      const lead = await Lead.findByPk(id, {
        include: [
          {
            model: Project,
            as: 'project',
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
          }
        ]
      });

      if (!lead) {
        return sendNotFound(res, 'Lead not found');
      }

      sendSuccess(res, 'Lead fetched successfully', lead);
    } catch (error) {
      console.error('Get lead by ID error:', error);
      sendServerError(res, 'Failed to fetch lead');
    }
  }

  // Get leads by project
  async getLeadsByProject(req, res) {
    try {
      const { projectId } = req.params;
      const { 
        page = 1, 
        limit = 10, 
        status,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const project = await Project.findByPk(projectId);
      if (!project) {
        return sendNotFound(res, 'Project not found');
      }

      const offset = (page - 1) * limit;
      const whereClause = { projectId };

      if (status) whereClause.status = status;

      const { count, rows: leads } = await Lead.findAndCountAll({
        where: whereClause,
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const totalPages = Math.ceil(count / limit);

      sendSuccess(res, 'Leads fetched successfully', {
        project: {
          id: project.id,
          title: project.title,
          slug: project.slug
        },
        leads,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Get leads by project error:', error);
      sendServerError(res, 'Failed to fetch leads');
    }
  }

  // Update lead
  async updateLead(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const lead = await Lead.findByPk(id);
      if (!lead) {
        return sendNotFound(res, 'Lead not found');
      }

      await lead.update({
        status: status || lead.status,
        notes: notes !== undefined ? notes : lead.notes
      });

      const updatedLead = await Lead.findByPk(id, {
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['id', 'title', 'slug'],
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
          }
        ]
      });

      sendSuccess(res, 'Lead updated successfully', updatedLead);
    } catch (error) {
      console.error('Update lead error:', error);
      sendServerError(res, 'Failed to update lead');
    }
  }

  // Bulk update leads
  async bulkUpdateLeads(req, res) {
    try {
      const { leadIds, updates } = req.body;

      if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
        return sendBadRequest(res, 'Lead IDs array is required');
      }

      if (!updates || Object.keys(updates).length === 0) {
        return sendBadRequest(res, 'Updates object is required');
      }

      // Validate that all leads exist
      const leads = await Lead.findAll({
        where: { id: { [Op.in]: leadIds } }
      });

      if (leads.length !== leadIds.length) {
        return sendBadRequest(res, 'Some leads were not found');
      }

      // Perform bulk update
      const allowedUpdates = ['status', 'notes'];
      const filteredUpdates = {};
      
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      if (Object.keys(filteredUpdates).length === 0) {
        return sendBadRequest(res, 'No valid updates provided');
      }

      await Lead.update(filteredUpdates, {
        where: { id: { [Op.in]: leadIds } }
      });

      sendSuccess(res, `${leadIds.length} leads updated successfully`, {
        updatedCount: leadIds.length,
        updates: filteredUpdates
      });
    } catch (error) {
      console.error('Bulk update leads error:', error);
      sendServerError(res, 'Failed to update leads');
    }
  }

  // Delete lead
  async deleteLead(req, res) {
    try {
      const { id } = req.params;

      const lead = await Lead.findByPk(id);
      if (!lead) {
        return sendNotFound(res, 'Lead not found');
      }

      await lead.destroy();

      sendSuccess(res, 'Lead deleted successfully');
    } catch (error) {
      console.error('Delete lead error:', error);
      sendServerError(res, 'Failed to delete lead');
    }
  }

  // Export leads to CSV
  async exportLeadsCSV(req, res) {
    try {
      const { 
        status,
        projectId,
        domainId,
        dateFrom,
        dateTo
      } = req.query;

      const whereClause = {};
      const projectWhere = {};
      const subDomainWhere = {};

      if (status) whereClause.status = status;
      if (projectId) whereClause.projectId = projectId;

      // Date filtering
      if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) whereClause.createdAt[Op.gte] = new Date(dateFrom);
        if (dateTo) whereClause.createdAt[Op.lte] = new Date(dateTo);
      }

      // Domain filtering
      if (domainId) {
        subDomainWhere.domainId = domainId;
      }

      const leads = await Lead.findAll({
        where: whereClause,
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['title'],
            where: projectWhere,
            include: [
              {
                model: SubDomain,
                as: 'subDomain',
                attributes: ['title'],
                where: subDomainWhere,
                include: [
                  {
                    model: Domain,
                    as: 'domain',
                    attributes: ['title']
                  }
                ]
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Convert to CSV format
      const csvHeader = 'Full Name,Email,Phone,College,Branch,City,Domain,Sub Domain,Project,Status,Submitted Date,Notes\n';
      
      const csvRows = leads.map(lead => {
        const row = [
          `"${lead.fullName}"`,
          `"${lead.email}"`,
          `"${lead.phoneNumber}"`,
          `"${lead.collegeName}"`,
          `"${lead.branch}"`,
          `"${lead.city}"`,
          `"${lead.project.subDomain.domain.title}"`,
          `"${lead.project.subDomain.title}"`,
          `"${lead.project.title}"`,
          `"${lead.status}"`,
          `"${lead.createdAt.toISOString().split('T')[0]}"`,
          `"${(lead.notes || '').replace(/"/g, '""')}"`
        ];
        return row.join(',');
      }).join('\n');

      const csvContent = csvHeader + csvRows;

      // Set response headers for CSV download
      const filename = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.send(csvContent);
    } catch (error) {
      console.error('Export leads CSV error:', error);
      sendServerError(res, 'Failed to export leads');
    }
  }

  // Get lead statistics
  async getLeadStats(req, res) {
    try {
      const { projectId, domainId, dateFrom, dateTo } = req.query;

      const whereClause = {};
      const projectWhere = {};
      const subDomainWhere = {};

      if (projectId) whereClause.projectId = projectId;
      if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) whereClause.createdAt[Op.gte] = new Date(dateFrom);
        if (dateTo) whereClause.createdAt[Op.lte] = new Date(dateTo);
      }
      if (domainId) subDomainWhere.domainId = domainId;

      // Total leads
      const totalLeads = await Lead.count({
        where: whereClause,
        include: projectId || domainId ? [
          {
            model: Project,
            as: 'project',
            where: projectWhere,
            include: domainId ? [
              {
                model: SubDomain,
                as: 'subDomain',
                where: subDomainWhere
              }
            ] : []
          }
        ] : []
      });

      // Status breakdown
      const statusStats = await Lead.findAll({
        where: whereClause,
        include: projectId || domainId ? [
          {
            model: Project,
            as: 'project',
            where: projectWhere,
            include: domainId ? [
              {
                model: SubDomain,
                as: 'subDomain',
                where: subDomainWhere
              }
            ] : []
          }
        ] : [],
        attributes: [
          'status',
          [Lead.sequelize.fn('COUNT', Lead.sequelize.col('Lead.id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      // Convert to object
      const statusCounts = {
        new: 0,
        contacted: 0,
        converted: 0,
        closed: 0
      };

      statusStats.forEach(stat => {
        statusCounts[stat.status] = parseInt(stat.count);
      });

      // Recent leads (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentLeads = await Lead.count({
        where: {
          ...whereClause,
          createdAt: { [Op.gte]: sevenDaysAgo }
        },
        include: projectId || domainId ? [
          {
            model: Project,
            as: 'project',
            where: projectWhere,
            include: domainId ? [
              {
                model: SubDomain,
                as: 'subDomain',
                where: subDomainWhere
              }
            ] : []
          }
        ] : []
      });

      // Conversion rate
      const conversionRate = totalLeads > 0 
        ? ((statusCounts.converted / totalLeads) * 100).toFixed(2)
        : '0.00';

      const stats = {
        total: totalLeads,
        status: statusCounts,
        recent: recentLeads,
        conversionRate: `${conversionRate}%`,
        activeLeads: statusCounts.new + statusCounts.contacted
      };

      sendSuccess(res, 'Lead statistics fetched successfully', stats);
    } catch (error) {
      console.error('Get lead stats error:', error);
      sendServerError(res, 'Failed to fetch lead statistics');
    }
  }
}

module.exports = new LeadController();