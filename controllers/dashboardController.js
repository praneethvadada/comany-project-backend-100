const { Domain, SubDomain, Project, Lead, Image } = require('../models');
const { 
  sendSuccess, 
  sendServerError 
} = require('../utils/responseHelper');
const { Op } = require('sequelize');

class DashboardController {
  // Get dashboard overview statistics
  async getDashboardStats(req, res) {
    try {
      // Basic counts
      const [
        totalDomains,
        activeDomains,
        totalSubDomains,
        leafSubDomains,
        totalProjects,
        activeProjects,
        featuredProjects,
        archivedProjects,
        totalLeads,
        newLeads,
        totalImages
      ] = await Promise.all([
        Domain.count(),
        Domain.count({ where: { isActive: true } }),
        SubDomain.count(),
        SubDomain.count({ where: { isLeaf: true, isActive: true } }),
        Project.count(),
        Project.count({ where: { isActive: true } }),
        Project.count({ where: { isActive: true, isFeatured: true } }),
        Project.count({ where: { isActive: false } }),
        Lead.count(),
        Lead.count({ where: { status: 'new' } }),
        Image.count()
      ]);

      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [
        recentProjects,
        recentLeads,
        recentImages
      ] = await Promise.all([
        Project.count({ where: { createdAt: { [Op.gte]: sevenDaysAgo } } }),
        Lead.count({ where: { createdAt: { [Op.gte]: sevenDaysAgo } } }),
        Image.count({ where: { createdAt: { [Op.gte]: sevenDaysAgo } } })
      ]);

      // Lead conversion stats
      const leadStats = await Lead.findAll({
        attributes: [
          'status',
          [Lead.sequelize.fn('COUNT', Lead.sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const leadStatusCounts = {
        new: 0,
        contacted: 0,
        converted: 0,
        closed: 0
      };

      leadStats.forEach(stat => {
        leadStatusCounts[stat.status] = parseInt(stat.count);
      });

      const conversionRate = totalLeads > 0 
        ? ((leadStatusCounts.converted / totalLeads) * 100).toFixed(2)
        : '0.00';

      // Storage stats
      const totalImageSize = await Image.sum('size') || 0;

      const stats = {
        overview: {
          domains: {
            total: totalDomains,
            active: activeDomains,
            inactive: totalDomains - activeDomains
          },
          subDomains: {
            total: totalSubDomains,
            leafs: leafSubDomains
          },
          projects: {
            total: totalProjects,
            active: activeProjects,
            featured: featuredProjects,
            archived: archivedProjects
          },
          leads: {
            total: totalLeads,
            new: newLeads,
            status: leadStatusCounts,
            conversionRate: `${conversionRate}%`
          },
          images: {
            total: totalImages,
            totalSizeMB: (totalImageSize / 1024 / 1024).toFixed(2)
          }
        },
        recentActivity: {
          projects: recentProjects,
          leads: recentLeads,
          images: recentImages
        },
        performance: {
          conversionRate: parseFloat(conversionRate),
          activeLeads: leadStatusCounts.new + leadStatusCounts.contacted,
          featuredProjectsRatio: totalProjects > 0 ? ((featuredProjects / totalProjects) * 100).toFixed(2) : '0.00'
        }
      };

      sendSuccess(res, 'Dashboard statistics fetched successfully', stats);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      sendServerError(res, 'Failed to fetch dashboard statistics');
    }
  }

  // Get recent activity feed
  async getRecentActivity(req, res) {
    try {
      const { limit = 20 } = req.query;

      // Get recent projects
      const recentProjects = await Project.findAll({
        include: [
          {
            model: SubDomain,
            as: 'subDomain',
            include: [
              {
                model: Domain,
                as: 'domain',
                attributes: ['title']
              }
            ],
            attributes: ['title']
          }
        ],
        attributes: ['id', 'title', 'isActive', 'isFeatured', 'createdAt', 'updatedAt'],
        order: [['createdAt', 'DESC']],
        limit: 5
      });

      // Get recent leads
      const recentLeads = await Lead.findAll({
        include: [
          {
            model: Project,
            as: 'project',
            attributes: ['title'],
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
        ],
        attributes: ['id', 'fullName', 'email', 'status', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 10
      });

      // Format activity feed
      const activities = [];

      // Add project activities
      recentProjects.forEach(project => {
        activities.push({
          type: 'project',
          action: 'created',
          title: `New project: ${project.title}`,
          description: `Added to ${project.subDomain.domain.title} > ${project.subDomain.title}`,
          timestamp: project.createdAt,
          data: {
            id: project.id,
            title: project.title,
            isActive: project.isActive,
            isFeatured: project.isFeatured
          }
        });
      });

      // Add lead activities
      recentLeads.forEach(lead => {
        activities.push({
          type: 'lead',
          action: 'submitted',
          title: `New lead: ${lead.fullName}`,
          description: `Interested in ${lead.project.title}`,
          timestamp: lead.createdAt,
          data: {
            id: lead.id,
            fullName: lead.fullName,
            email: lead.email,
            status: lead.status,
            project: lead.project.title
          }
        });
      });

      // Sort by timestamp and limit
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const limitedActivities = activities.slice(0, parseInt(limit));

      sendSuccess(res, 'Recent activity fetched successfully', limitedActivities);
    } catch (error) {
      console.error('Get recent activity error:', error);
      sendServerError(res, 'Failed to fetch recent activity');
    }
  }

  // Get analytics data
  async getAnalytics(req, res) {
    try {
      const { period = '30' } = req.query; // days
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Leads over time
      const leadsOverTime = await Lead.findAll({
        where: {
          createdAt: { [Op.gte]: startDate }
        },
        attributes: [
          [Lead.sequelize.fn('DATE', Lead.sequelize.col('createdAt')), 'date'],
          [Lead.sequelize.fn('COUNT', Lead.sequelize.col('id')), 'count']
        ],
        group: [Lead.sequelize.fn('DATE', Lead.sequelize.col('createdAt'))],
        order: [[Lead.sequelize.fn('DATE', Lead.sequelize.col('createdAt')), 'ASC']],
        raw: true
      });

      // Projects by domain
      const projectsByDomain = await Project.findAll({
        where: { isActive: true },
        include: [
          {
            model: SubDomain,
            as: 'subDomain',
            include: [
              {
                model: Domain,
                as: 'domain',
                attributes: ['title']
              }
            ],
            attributes: []
          }
        ],
        attributes: [
          [Lead.sequelize.col('subDomain.domain.title'), 'domain'],
          [Lead.sequelize.fn('COUNT', Lead.sequelize.col('Project.id')), 'count']
        ],
        group: ['subDomain.domain.title'],
        raw: true
      });

      // Top performing projects (by lead count)
      const topProjects = await Project.findAll({
        where: { isActive: true },
        include: [
          {
            model: Lead,
            as: 'leads',
            attributes: []
          },
          {
            model: SubDomain,
            as: 'subDomain',
            include: [
              {
                model: Domain,
                as: 'domain',
                attributes: ['title']
              }
            ],
            attributes: ['title']
          }
        ],
        attributes: [
          'id',
          'title',
          'viewCount',
          [Lead.sequelize.fn('COUNT', Lead.sequelize.col('leads.id')), 'leadCount']
        ],
        group: ['Project.id', 'subDomain.id', 'subDomain.domain.id'],
        order: [[Lead.sequelize.fn('COUNT', Lead.sequelize.col('leads.id')), 'DESC']],
        limit: 10,
        raw: false
      });

      // Lead sources analysis
      const leadSources = await Lead.findAll({
        where: {
          createdAt: { [Op.gte]: startDate }
        },
        attributes: [
          'source',
          [Lead.sequelize.fn('COUNT', Lead.sequelize.col('id')), 'count']
        ],
        group: ['source'],
        raw: true
      });

      // Status progression over time
      const statusProgression = await Lead.findAll({
        where: {
          updatedAt: { [Op.gte]: startDate }
        },
        attributes: [
          [Lead.sequelize.fn('DATE', Lead.sequelize.col('updatedAt')), 'date'],
          'status',
          [Lead.sequelize.fn('COUNT', Lead.sequelize.col('id')), 'count']
        ],
        group: [
          Lead.sequelize.fn('DATE', Lead.sequelize.col('updatedAt')),
          'status'
        ],
        order: [
          [Lead.sequelize.fn('DATE', Lead.sequelize.col('updatedAt')), 'ASC']
        ],
        raw: true
      });

      const analytics = {
        period: `${days} days`,
        leadsOverTime: leadsOverTime.map(item => ({
          date: item.date,
          count: parseInt(item.count)
        })),
        projectsByDomain: projectsByDomain.map(item => ({
          domain: item.domain,
          count: parseInt(item.count)
        })),
        topProjects: topProjects.map(project => ({
          id: project.id,
          title: project.title,
          domain: project.subDomain.domain.title,
          subDomain: project.subDomain.title,
          viewCount: project.viewCount,
          leadCount: parseInt(project.dataValues.leadCount)
        })),
        leadSources: leadSources.map(item => ({
          source: item.source || 'unknown',
          count: parseInt(item.count)
        })),
        statusProgression: statusProgression.map(item => ({
          date: item.date,
          status: item.status,
          count: parseInt(item.count)
        }))
      };

      sendSuccess(res, 'Analytics data fetched successfully', analytics);
    } catch (error) {
      console.error('Get analytics error:', error);
      sendServerError(res, 'Failed to fetch analytics data');
    }
  }

  // Get domain-specific statistics
  async getDomainAnalytics(req, res) {
    try {
      const { domainId } = req.params;

      const domain = await Domain.findByPk(domainId);
      if (!domain) {
        return sendNotFound(res, 'Domain not found');
      }

      // SubDomains in this domain
      const subDomains = await SubDomain.findAll({
        where: { domainId, isActive: true },
        include: [
          {
            model: Project,
            as: 'projects',
            where: { isActive: true },
            required: false,
            include: [
              {
                model: Lead,
                as: 'leads',
                required: false
              }
            ]
          }
        ]
      });

      // Calculate statistics
      let totalProjects = 0;
      let totalLeads = 0;
      let totalViews = 0;

      const subDomainStats = subDomains.map(subDomain => {
        const projects = subDomain.projects || [];
        const projectCount = projects.length;
        const leadCount = projects.reduce((acc, project) => acc + (project.leads?.length || 0), 0);
        const viewCount = projects.reduce((acc, project) => acc + (project.viewCount || 0), 0);

        totalProjects += projectCount;
        totalLeads += leadCount;
        totalViews += viewCount;

        return {
          id: subDomain.id,
          title: subDomain.title,
          isLeaf: subDomain.isLeaf,
          level: subDomain.level,
          projectCount,
          leadCount,
          viewCount
        };
      });

      const analytics = {
        domain: {
          id: domain.id,
          title: domain.title,
          isActive: domain.isActive
        },
        summary: {
          subDomainCount: subDomains.length,
          totalProjects,
          totalLeads,
          totalViews,
          averageLeadsPerProject: totalProjects > 0 ? (totalLeads / totalProjects).toFixed(2) : '0.00',
          conversionRate: totalLeads > 0 ? ((totalLeads / totalViews) * 100).toFixed(2) + '%' : '0.00%'
        },
        subDomains: subDomainStats
      };

      sendSuccess(res, 'Domain analytics fetched successfully', analytics);
    } catch (error) {
      console.error('Get domain analytics error:', error);
      sendServerError(res, 'Failed to fetch domain analytics');
    }
  }
}

module.exports = new DashboardController();