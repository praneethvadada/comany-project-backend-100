// controllers/internshipLeadController.js
const { InternshipLead, Internship, InternshipDomain, Branch } = require('../models');
const { sendSuccess, sendError, sendBadRequest, sendNotFound, sendServerError } = require('../utils/responseHelper');
const { Op } = require('sequelize');

class InternshipLeadController {
  // Get all internship leads with pagination and filtering
  async getAllInternshipLeads(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search, 
        internshipId,
        status,
        branchId,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};
      const includeWhere = {};

      if (search) {
        whereClause[Op.or] = [
          { fullName: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phoneNumber: { [Op.like]: `%${search}%` } },
          { collegeName: { [Op.like]: `%${search}%` } },
          { city: { [Op.like]: `%${search}%` } }
        ];
      }

      if (internshipId) {
        whereClause.internshipId = internshipId;
      }

      if (status) {
        whereClause.status = status;
      }

      if (branchId) {
        includeWhere.branchId = branchId;
      }

      const { count, rows: leads } = await InternshipLead.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Internship,
            as: 'internship',
            attributes: ['id', 'title', 'startDate', 'endDate'],
            include: [
              {
                model: InternshipDomain,
                as: 'internshipDomain',
                attributes: ['id', 'name'],
                ...(Object.keys(includeWhere).length > 0 ? { where: includeWhere } : {}),
                include: [
                  {
                    model: Branch,
                    as: 'branch',
                    attributes: ['id', 'name', 'code']
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

      sendSuccess(res, 'Internship leads fetched successfully', {
        leads,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('InternshipLeadController: Get leads error:', error);
      sendServerError(res, 'Failed to fetch internship leads');
    }
  }

  // Get lead by ID
  async getInternshipLeadById(req, res) {
    try {
      const { id } = req.params;
      
      const lead = await InternshipLead.findByPk(id, {
        include: [
          {
            model: Internship,
            as: 'internship',
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
          }
        ]
      });

      if (!lead) {
        return sendNotFound(res, 'Internship lead not found');
      }

      sendSuccess(res, 'Internship lead fetched successfully', lead);
    } catch (error) {
      console.error('InternshipLeadController: Get lead error:', error);
      sendServerError(res, 'Failed to fetch internship lead');
    }
  }

  // Get leads by internship
  async getLeadsByInternship(req, res) {
    try {
      const { internshipId } = req.params;
      const { status, limit = 10, page = 1 } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = { internshipId };

      if (status) {
        whereClause.status = status;
      }

      const leads = await InternshipLead.findAll({
        where: whereClause,
        include: [
          {
            model: Internship,
            as: 'internship',
            attributes: ['id', 'title']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      sendSuccess(res, 'Internship leads fetched successfully', leads);
    } catch (error) {
      console.error('InternshipLeadController: Get leads by internship error:', error);
      sendServerError(res, 'Failed to fetch internship leads');
    }
  }

  // Create new internship lead (enrollment)
  async createInternshipLead(req, res) {
    try {
      const {
        fullName,
        email,
        phoneNumber,
        collegeName,
        branch,
        city,
        yearOfStudy,
        previousExperience,
        internshipId,
        source = 'website',
        utmSource,
        utmMedium,
        utmCampaign
      } = req.body;

      // Check if internship exists and is active
      const internship = await Internship.findByPk(internshipId);
      if (!internship) {
        return sendBadRequest(res, 'Internship not found');
      }

      if (!internship.isActive) {
        return sendBadRequest(res, 'Internship is not currently active');
      }

      // Check if internship has reached maximum capacity
      if (internship.maxLearners && internship.currentLearners >= internship.maxLearners) {
        return sendBadRequest(res, 'Internship has reached maximum capacity');
      }

      // Check for duplicate enrollment (same email + internship)
      const existingLead = await InternshipLead.findOne({
        where: {
          email,
          internshipId,
          status: { [Op.in]: ['new', 'contacted', 'enrolled'] }
        }
      });

      if (existingLead) {
        return sendBadRequest(res, 'You have already enrolled for this internship');
      }

      const lead = await InternshipLead.create({
        fullName,
        email,
        phoneNumber,
        collegeName,
        branch,
        city,
        yearOfStudy,
        previousExperience,
        internshipId,
        source,
        utmSource,
        utmMedium,
        utmCampaign
      });

      // Update internship enrollment count
      await internship.increment('enrollmentCount');

      const leadWithDetails = await InternshipLead.findByPk(lead.id, {
        include: [
          {
            model: Internship,
            as: 'internship',
            attributes: ['id', 'title', 'startDate', 'endDate']
          }
        ]
      });

      sendSuccess(res, 'Enrollment submitted successfully', leadWithDetails, 201);
    } catch (error) {
      console.error('InternshipLeadController: Create lead error:', error);
      sendServerError(res, 'Failed to submit enrollment');
    }
  }

  // Update internship lead
  async updateInternshipLead(req, res) {
    try {
      const { id } = req.params;
      const { status, notes, enrollmentDate, completionDate, certificateIssued } = req.body;

      const lead = await InternshipLead.findByPk(id);
      if (!lead) {
        return sendNotFound(res, 'Internship lead not found');
      }

      const updateData = {};
      
      if (status !== undefined) {
        updateData.status = status;
        
        // Set enrollment date if status changed to enrolled
        if (status === 'enrolled' && !lead.enrollmentDate) {
          updateData.enrollmentDate = new Date();
        }
        
        // Set completion date if status changed to completed
        if (status === 'completed' && !lead.completionDate) {
          updateData.completionDate = new Date();
        }
      }

      if (notes !== undefined) updateData.notes = notes;
      if (enrollmentDate !== undefined) updateData.enrollmentDate = enrollmentDate;
      if (completionDate !== undefined) updateData.completionDate = completionDate;
      if (certificateIssued !== undefined) updateData.certificateIssued = certificateIssued;

      await lead.update(updateData);

      // Update internship current learners count if status changed
      if (status && status !== lead.status) {
        const internship = await Internship.findByPk(lead.internshipId);
        if (internship) {
          const enrolledCount = await InternshipLead.count({
            where: {
              internshipId: lead.internshipId,
              status: 'enrolled'
            }
          });
          await internship.update({ currentLearners: enrolledCount });
        }
      }

      const updatedLead = await InternshipLead.findByPk(id, {
        include: [
          {
            model: Internship,
            as: 'internship',
            attributes: ['id', 'title']
          }
        ]
      });

      sendSuccess(res, 'Internship lead updated successfully', updatedLead);
    } catch (error) {
      console.error('InternshipLeadController: Update lead error:', error);
      sendServerError(res, 'Failed to update internship lead');
    }
  }

  // Bulk update leads
  async bulkUpdateInternshipLeads(req, res) {
    try {
      const { leadIds, updates } = req.body;

      if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
        return sendBadRequest(res, 'Lead IDs are required');
      }

      if (!updates || Object.keys(updates).length === 0) {
        return sendBadRequest(res, 'Update data is required');
      }

      const leads = await InternshipLead.findAll({
        where: { id: { [Op.in]: leadIds } }
      });

      if (leads.length !== leadIds.length) {
        return sendBadRequest(res, 'Some leads were not found');
      }

      await InternshipLead.update(updates, {
        where: { id: { [Op.in]: leadIds } }
      });

      // Update internship current learners count if status was updated
      if (updates.status) {
        const internshipIds = [...new Set(leads.map(lead => lead.internshipId))];
        
        for (const internshipId of internshipIds) {
          const enrolledCount = await InternshipLead.count({
            where: {
              internshipId,
              status: 'enrolled'
            }
          });
          await Internship.update(
            { currentLearners: enrolledCount },
            { where: { id: internshipId } }
          );
        }
      }

      sendSuccess(res, `${leadIds.length} leads updated successfully`);
    } catch (error) {
      console.error('InternshipLeadController: Bulk update error:', error);
      sendServerError(res, 'Failed to update leads');
    }
  }

  // Delete internship lead
  async deleteInternshipLead(req, res) {
    try {
      const { id } = req.params;

      const lead = await InternshipLead.findByPk(id);
      if (!lead) {
        return sendNotFound(res, 'Internship lead not found');
      }

      // Don't allow deletion of enrolled or completed students
      if (['enrolled', 'completed'].includes(lead.status)) {
        return sendBadRequest(res, 'Cannot delete enrolled or completed students');
      }

      await lead.destroy();
      sendSuccess(res, 'Internship lead deleted successfully');
    } catch (error) {
      console.error('InternshipLeadController: Delete lead error:', error);
      sendServerError(res, 'Failed to delete internship lead');
    }
  }

  // Get lead stats
  async getInternshipLeadStats(req, res) {
    try {
      const totalLeads = await InternshipLead.count();
      
      const statusStats = await InternshipLead.findAll({
        attributes: [
          'status',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const recentLeads = await InternshipLead.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      });

      const topInternships = await InternshipLead.findAll({
        attributes: [
          'internshipId',
          [require('sequelize').fn('COUNT', require('sequelize').col('InternshipLead.id')), 'leadCount']
        ],
        include: [
          {
            model: Internship,
            as: 'internship',
            attributes: ['title']
          }
        ],
        group: ['internshipId'],
        order: [[require('sequelize').literal('leadCount'), 'DESC']],
        limit: 5,
        raw: false
      });

      sendSuccess(res, 'Lead stats fetched successfully', {
        total: totalLeads,
        recent: recentLeads,
        byStatus: statusStats.reduce((acc, stat) => {
          acc[stat.status] = parseInt(stat.count);
          return acc;
        }, {}),
        topInternships: topInternships.map(item => ({
          internshipId: item.internshipId,
          internshipTitle: item.internship.title,
          leadCount: parseInt(item.dataValues.leadCount)
        }))
      });
    } catch (error) {
      console.error('InternshipLeadController: Get lead stats error:', error);
      sendServerError(res, 'Failed to fetch lead stats');
    }
  }

  // Export leads to CSV
  async exportInternshipLeadsCSV(req, res) {
    try {
      const { internshipId, status, startDate, endDate } = req.query;
      const whereClause = {};

      if (internshipId) whereClause.internshipId = internshipId;
      if (status) whereClause.status = status;
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
        if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
      }

      const leads = await InternshipLead.findAll({
        where: whereClause,
        include: [
          {
            model: Internship,
            as: 'internship',
            attributes: ['title'],
            include: [
              {
                model: InternshipDomain,
                as: 'internshipDomain',
                attributes: ['name'],
                include: [
                  {
                    model: Branch,
                    as: 'branch',
                    attributes: ['name']
                  }
                ]
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Convert to CSV format
      const csvHeaders = [
        'Full Name', 'Email', 'Phone', 'College', 'Branch', 'City', 
        'Year of Study', 'Internship', 'Domain', 'Engineering Branch',
        'Status', 'Enrollment Date', 'Completion Date', 'Created At'
      ];

      const csvData = leads.map(lead => [
        lead.fullName,
        lead.email,
        lead.phoneNumber,
        lead.collegeName,
        lead.branch,
        lead.city,
        lead.yearOfStudy || '',
        lead.internship.title,
        lead.internship.internshipDomain.name,
        lead.internship.internshipDomain.branch.name,
        lead.status,
        lead.enrollmentDate ? lead.enrollmentDate.toISOString().split('T')[0] : '',
        lead.completionDate ? lead.completionDate.toISOString().split('T')[0] : '',
        lead.createdAt.toISOString().split('T')[0]
      ]);

      const csvContent = [csvHeaders, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=internship-leads.csv');
      res.send(csvContent);
    } catch (error) {
      console.error('InternshipLeadController: Export CSV error:', error);
      sendServerError(res, 'Failed to export leads');
    }
  }
}

module.exports = new InternshipLeadController();
