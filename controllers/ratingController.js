
// controllers/ratingController.js
const { Rating, Internship, InternshipLead, InternshipDomain, Branch } = require('../models');
const { sendSuccess, sendError, sendBadRequest, sendNotFound, sendServerError } = require('../utils/responseHelper');
const { Op } = require('sequelize');

class RatingController {
  // Get all ratings with pagination and filtering
  async getAllRatings(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search, 
        internshipId,
        rating,
        isApproved,
        isPublic,
        isFeatured,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};

      if (search) {
        whereClause[Op.or] = [
          { reviewerName: { [Op.like]: `%${search}%` } },
          { reviewerEmail: { [Op.like]: `%${search}%` } },
          { review: { [Op.like]: `%${search}%` } }
        ];
      }

      if (internshipId) whereClause.internshipId = internshipId;
      if (rating) whereClause.rating = rating;
      if (isApproved !== undefined) whereClause.isApproved = isApproved === 'true';
      if (isPublic !== undefined) whereClause.isPublic = isPublic === 'true';
      if (isFeatured !== undefined) whereClause.isFeatured = isFeatured === 'true';

      const { count, rows: ratings } = await Rating.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Internship,
            as: 'internship',
            attributes: ['id', 'title'],
            include: [
              {
                model: InternshipDomain,
                as: 'internshipDomain',
                attributes: ['id', 'name'],
                include: [
                  {
                    model: Branch,
                    as: 'branch',
                    attributes: ['id', 'name']
                  }
                ]
              }
            ]
          },
          {
            model: InternshipLead,
            as: 'internshipLead',
            attributes: ['id', 'fullName', 'status'],
            required: false
          }
        ],
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        distinct: true
      });

      const totalPages = Math.ceil(count / limit);

      sendSuccess(res, 'Ratings fetched successfully', {
        ratings,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('RatingController: Get ratings error:', error);
      sendServerError(res, 'Failed to fetch ratings');
    }
  }

  // Get rating by ID
  async getRatingById(req, res) {
    try {
      const { id } = req.params;
      
      const rating = await Rating.findByPk(id, {
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
          },
          {
            model: InternshipLead,
            as: 'internshipLead',
            required: false
          }
        ]
      });

      if (!rating) {
        return sendNotFound(res, 'Rating not found');
      }

      sendSuccess(res, 'Rating fetched successfully', rating);
    } catch (error) {
      console.error('RatingController: Get rating error:', error);
      sendServerError(res, 'Failed to fetch rating');
    }
  }

  // Get ratings by internship
  async getRatingsByInternship(req, res) {
    try {
      const { internshipId } = req.params;
      const { 
        isApproved = true, 
        isPublic = true, 
        limit = 10, 
        page = 1,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = { internshipId };

      if (isApproved !== undefined) whereClause.isApproved = isApproved === 'true';
      if (isPublic !== undefined) whereClause.isPublic = isPublic === 'true';

      const ratings = await Rating.findAll({
        where: whereClause,
        include: [
          {
            model: InternshipLead,
            as: 'internshipLead',
            attributes: ['id', 'fullName'],
            required: false
          }
        ],
        order: [['isFeatured', 'DESC'], [sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      sendSuccess(res, 'Internship ratings fetched successfully', ratings);
    } catch (error) {
      console.error('RatingController: Get ratings by internship error:', error);
      sendServerError(res, 'Failed to fetch internship ratings');
    }
  }

  // Create new rating
  async createRating(req, res) {
    try {
      const {
        rating,
        review,
        reviewerName,
        reviewerEmail,
        reviewerDesignation,
        reviewerCompany,
        internshipId,
        internshipLeadId
      } = req.body;

      // Check if internship exists
      const internship = await Internship.findByPk(internshipId);
      if (!internship) {
        return sendBadRequest(res, 'Internship not found');
      }

      // Check if internship lead exists (if provided)
      if (internshipLeadId) {
        const lead = await InternshipLead.findByPk(internshipLeadId);
        if (!lead || lead.internshipId !== parseInt(internshipId)) {
          return sendBadRequest(res, 'Invalid internship lead');
        }
      }

      // Check for duplicate rating from same email for same internship
      const existingRating = await Rating.findOne({
        where: {
          reviewerEmail,
          internshipId
        }
      });

      if (existingRating) {
        return sendBadRequest(res, 'You have already rated this internship');
      }

      const newRating = await Rating.create({
        rating,
        review,
        reviewerName,
        reviewerEmail,
        reviewerDesignation,
        reviewerCompany,
        internshipId,
        internshipLeadId,
        isApproved: false, // Requires admin approval
        isPublic: true
      });

      const ratingWithDetails = await Rating.findByPk(newRating.id, {
        include: [
          {
            model: Internship,
            as: 'internship',
            attributes: ['id', 'title']
          }
        ]
      });

      sendSuccess(res, 'Rating submitted successfully. It will be visible after approval.', ratingWithDetails, 201);
    } catch (error) {
      console.error('RatingController: Create rating error:', error);
      sendServerError(res, 'Failed to submit rating');
    }
  }

  // Update rating
  async updateRating(req, res) {
    try {
      const { id } = req.params;
      const {
        rating,
        review,
        reviewerName,
        reviewerDesignation,
        reviewerCompany,
        isApproved,
        isPublic,
        isFeatured
      } = req.body;

      const existingRating = await Rating.findByPk(id);
      if (!existingRating) {
        return sendNotFound(res, 'Rating not found');
      }

      const updateData = {};
      if (rating !== undefined) updateData.rating = rating;
      if (review !== undefined) updateData.review = review;
      if (reviewerName !== undefined) updateData.reviewerName = reviewerName;
      if (reviewerDesignation !== undefined) updateData.reviewerDesignation = reviewerDesignation;
      if (reviewerCompany !== undefined) updateData.reviewerCompany = reviewerCompany;
      if (isApproved !== undefined) updateData.isApproved = isApproved;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (isFeatured !== undefined) updateData.isFeatured = isFeatured;

      await existingRating.update(updateData);

      // Recalculate internship average rating if rating was changed or approval status changed
      if (rating !== undefined || isApproved !== undefined) {
        await this.updateInternshipRating(existingRating.internshipId);
      }

      const updatedRating = await Rating.findByPk(id, {
        include: [
          {
            model: Internship,
            as: 'internship',
            attributes: ['id', 'title']
          }
        ]
      });

      sendSuccess(res, 'Rating updated successfully', updatedRating);
    } catch (error) {
      console.error('RatingController: Update rating error:', error);
      sendServerError(res, 'Failed to update rating');
    }
  }

  // Approve rating
  async approveRating(req, res) {
    try {
      const { id } = req.params;
      const { isApproved } = req.body;

      const rating = await Rating.findByPk(id);
      if (!rating) {
        return sendNotFound(res, 'Rating not found');
      }

      await rating.update({ isApproved });

      // Update internship average rating
      await this.updateInternshipRating(rating.internshipId);

      sendSuccess(res, `Rating ${isApproved ? 'approved' : 'rejected'} successfully`, rating);
    } catch (error) {
      console.error('RatingController: Approve rating error:', error);
      sendServerError(res, 'Failed to approve rating');
    }
  }

  // Bulk approve ratings
  async bulkApproveRatings(req, res) {
    try {
      const { ratingIds, isApproved } = req.body;

      if (!ratingIds || !Array.isArray(ratingIds) || ratingIds.length === 0) {
        return sendBadRequest(res, 'Rating IDs are required');
      }

      const ratings = await Rating.findAll({
        where: { id: { [Op.in]: ratingIds } }
      });

      if (ratings.length !== ratingIds.length) {
        return sendBadRequest(res, 'Some ratings were not found');
      }

      await Rating.update(
        { isApproved },
        { where: { id: { [Op.in]: ratingIds } } }
      );

      // Update internship average ratings
      const internshipIds = [...new Set(ratings.map(rating => rating.internshipId))];
      for (const internshipId of internshipIds) {
        await this.updateInternshipRating(internshipId);
      }

      sendSuccess(res, `${ratingIds.length} ratings ${isApproved ? 'approved' : 'rejected'} successfully`);
    } catch (error) {
      console.error('RatingController: Bulk approve error:', error);
      sendServerError(res, 'Failed to update ratings');
    }
  }

  // Delete rating
  async deleteRating(req, res) {
    try {
      const { id } = req.params;

      const rating = await Rating.findByPk(id);
      if (!rating) {
        return sendNotFound(res, 'Rating not found');
      }

      const internshipId = rating.internshipId;
      await rating.destroy();

      // Update internship average rating
      await this.updateInternshipRating(internshipId);

      sendSuccess(res, 'Rating deleted successfully');
    } catch (error) {
      console.error('RatingController: Delete rating error:', error);
      sendServerError(res, 'Failed to delete rating');
    }
  }

  // Get rating stats
  async getRatingStats(req, res) {
    try {
      const totalRatings = await Rating.count();
      const approvedRatings = await Rating.count({ where: { isApproved: true } });
      const pendingRatings = await Rating.count({ where: { isApproved: false } });

      const ratingDistribution = await Rating.findAll({
        attributes: [
          'rating',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        where: { isApproved: true },
        group: ['rating'],
        raw: true
      });

      const topRatedInternships = await Rating.findAll({
        attributes: [
          'internshipId',
          [require('sequelize').fn('AVG', require('sequelize').col('rating')), 'avgRating'],
          [require('sequelize').fn('COUNT', require('sequelize').col('Rating.id')), 'ratingCount']
        ],
        include: [
          {
            model: Internship,
            as: 'internship',
            attributes: ['title']
          }
        ],
        where: { isApproved: true },
        group: ['internshipId'],
        having: require('sequelize').literal('COUNT(Rating.id) >= 5'),
        order: [[require('sequelize').literal('avgRating'), 'DESC']],
        limit: 10,
        raw: false
      });

      const recentRatings = await Rating.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      });

      sendSuccess(res, 'Rating stats fetched successfully', {
        total: totalRatings,
        approved: approvedRatings,
        pending: pendingRatings,
        recent: recentRatings,
        distribution: ratingDistribution.reduce((acc, item) => {
          acc[item.rating] = parseInt(item.count);
          return acc;
        }, {}),
        topRatedInternships: topRatedInternships.map(item => ({
          internshipId: item.internshipId,
          internshipTitle: item.internship.title,
          averageRating: parseFloat(item.dataValues.avgRating).toFixed(2),
          ratingCount: parseInt(item.dataValues.ratingCount)
        }))
      });
    } catch (error) {
      console.error('RatingController: Get rating stats error:', error);
      sendServerError(res, 'Failed to fetch rating stats');
    }
  }

  // Get featured ratings
  async getFeaturedRatings(req, res) {
    try {
      const { limit = 6 } = req.query;

      const ratings = await Rating.findAll({
        where: {
          isApproved: true,
          isPublic: true,
          isFeatured: true
        },
        include: [
          {
            model: Internship,
            as: 'internship',
            attributes: ['id', 'title'],
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
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit)
      });

      sendSuccess(res, 'Featured ratings fetched successfully', ratings);
    } catch (error) {
      console.error('RatingController: Get featured ratings error:', error);
      sendServerError(res, 'Failed to fetch featured ratings');
    }
  }

  // Helper method to update internship average rating
  async updateInternshipRating(internshipId) {
    try {
      const ratings = await Rating.findAll({
        where: {
          internshipId,
          isApproved: true
        },
        attributes: ['rating']
      });

      if (ratings.length > 0) {
        const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
        const averageRating = (totalRating / ratings.length).toFixed(2);

        await Internship.update(
          {
            averageRating: parseFloat(averageRating),
            totalRatings: ratings.length
          },
          { where: { id: internshipId } }
        );
      } else {
        await Internship.update(
          {
            averageRating: 0,
            totalRatings: 0
          },
          { where: { id: internshipId } }
        );
      }
    } catch (error) {
      console.error('RatingController: Update internship rating error:', error);
    }
  }
}

module.exports = new RatingController();