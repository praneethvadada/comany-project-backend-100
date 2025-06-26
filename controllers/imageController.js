const { Domain, SubDomain, Project, Image } = require('../models');
const { 
  sendSuccess, 
  sendCreated, 
  sendBadRequest, 
  sendNotFound,
  sendServerError 
} = require('../utils/responseHelper');
const { uploadConfigs, handleUploadError, processUploadedFiles, cleanupTempFiles } = require('../middleware/upload');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

class ImageController {
  // Get all images with filtering
  async getAllImages(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        entityType, 
        entityId,
        sortBy = 'sortOrder',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (page - 1) * limit;
      const whereClause = {};

      if (entityType) whereClause.entityType = entityType;
      if (entityId) whereClause.entityId = entityId;

      const { count, rows: images } = await Image.findAndCountAll({
        where: whereClause,
        order: [[sortBy, sortOrder], ['isMain', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const totalPages = Math.ceil(count / limit);

      sendSuccess(res, 'Images fetched successfully', {
        images,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Get images error:', error);
      sendServerError(res, 'Failed to fetch images');
    }
  }

  // Get image by ID
  async getImageById(req, res) {
    try {
      const { id } = req.params;

      const image = await Image.findByPk(id);
      if (!image) {
        return sendNotFound(res, 'Image not found');
      }

      sendSuccess(res, 'Image fetched successfully', image);
    } catch (error) {
      console.error('Get image by ID error:', error);
      sendServerError(res, 'Failed to fetch image');
    }
  }

  // Upload images
  async uploadImages(req, res) {
    try {
      // Use multer middleware for file upload
      uploadConfigs.multipleImages(req, res, async (err) => {
        if (err) {
          return handleUploadError(err, req, res, () => {});
        }

        try {
          await processUploadedFiles(req, res, () => {});

          const { entityType, entityId, isMain = false } = req.body;
          
          if (!entityType || !entityId) {
            cleanupTempFiles(req.files);
            return sendBadRequest(res, 'entityType and entityId are required');
          }

          // Validate entity exists
          let entity;
          switch (entityType) {
            case 'domain':
              entity = await Domain.findByPk(entityId);
              break;
            case 'subdomain':
              entity = await SubDomain.findByPk(entityId);
              break;
            case 'project':
              entity = await Project.findByPk(entityId);
              break;
            default:
              cleanupTempFiles(req.files);
              return sendBadRequest(res, 'Invalid entity type');
          }

          if (!entity) {
            cleanupTempFiles(req.files);
            return sendBadRequest(res, 'Entity not found');
          }

          if (!req.files || req.files.length === 0) {
            return sendBadRequest(res, 'No files uploaded');
          }

          // Get current max sort order
          const maxSortOrder = await Image.max('sortOrder', {
            where: { entityType, entityId }
          }) || 0;

          // If setting as main, remove main status from existing images
          if (isMain === 'true' || isMain === true) {
            await Image.update(
              { isMain: false },
              { where: { entityType, entityId } }
            );
          }

          // Create image records
          const imagePromises = req.files.map(async (file, index) => {
            return Image.create({
              filename: file.filename,
              originalName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              path: file.path,
              url: file.url,
              entityType,
              entityId: parseInt(entityId),
              isMain: index === 0 && (isMain === 'true' || isMain === true),
              sortOrder: maxSortOrder + index + 1,
              alt: req.body.alt || '',
              caption: req.body.caption || ''
            });
          });

          const images = await Promise.all(imagePromises);

          sendCreated(res, 'Images uploaded successfully', images);
        } catch (error) {
          console.error('Upload images processing error:', error);
          cleanupTempFiles(req.files);
          sendServerError(res, 'Failed to process uploaded images');
        }
      });
    } catch (error) {
      console.error('Upload images error:', error);
      sendServerError(res, 'Failed to upload images');
    }
  }

  // Update image metadata
  async updateImage(req, res) {
    try {
      const { id } = req.params;
      const { isMain, alt, caption, sortOrder } = req.body;

      const image = await Image.findByPk(id);
      if (!image) {
        return sendNotFound(res, 'Image not found');
      }

      // If setting as main, remove main status from other images of same entity
      if (isMain === true) {
        await Image.update(
          { isMain: false },
          { 
            where: { 
              entityType: image.entityType, 
              entityId: image.entityId,
              id: { [Op.ne]: id }
            } 
          }
        );
      }

      await image.update({
        isMain: isMain !== undefined ? isMain : image.isMain,
        alt: alt !== undefined ? alt : image.alt,
        caption: caption !== undefined ? caption : image.caption,
        sortOrder: sortOrder !== undefined ? sortOrder : image.sortOrder
      });

      sendSuccess(res, 'Image updated successfully', image);
    } catch (error) {
      console.error('Update image error:', error);
      sendServerError(res, 'Failed to update image');
    }
  }

  // Reorder images
  async reorderImages(req, res) {
    try {
      const { imageIds } = req.body;

      if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
        return sendBadRequest(res, 'imageIds array is required');
      }

      // Validate all images exist
      const images = await Image.findAll({
        where: { id: { [Op.in]: imageIds } }
      });

      if (images.length !== imageIds.length) {
        return sendBadRequest(res, 'Some images were not found');
      }

      // Check if all images belong to the same entity
      const firstImage = images[0];
      const allSameEntity = images.every(img => 
        img.entityType === firstImage.entityType && 
        img.entityId === firstImage.entityId
      );

      if (!allSameEntity) {
        return sendBadRequest(res, 'All images must belong to the same entity');
      }

      // Update sort orders
      const updatePromises = imageIds.map((imageId, index) => {
        return Image.update(
          { sortOrder: index + 1 },
          { where: { id: imageId } }
        );
      });

      await Promise.all(updatePromises);

      // Fetch updated images
      const updatedImages = await Image.findAll({
        where: { id: { [Op.in]: imageIds } },
        order: [['sortOrder', 'ASC']]
      });

      sendSuccess(res, 'Images reordered successfully', updatedImages);
    } catch (error) {
      console.error('Reorder images error:', error);
      sendServerError(res, 'Failed to reorder images');
    }
  }

  // Delete image
  async deleteImage(req, res) {
    try {
      const { id } = req.params;

      const image = await Image.findByPk(id);
      if (!image) {
        return sendNotFound(res, 'Image not found');
      }

      // Delete physical file
      if (fs.existsSync(image.path)) {
        try {
          fs.unlinkSync(image.path);
        } catch (error) {
          console.error('Failed to delete physical file:', error);
        }
      }

      // If this was the main image, set another image as main
      if (image.isMain) {
        const nextImage = await Image.findOne({
          where: {
            entityType: image.entityType,
            entityId: image.entityId,
            id: { [Op.ne]: id }
          },
          order: [['sortOrder', 'ASC']]
        });

        if (nextImage) {
          await nextImage.update({ isMain: true });
        }
      }

      await image.destroy();

      sendSuccess(res, 'Image deleted successfully');
    } catch (error) {
      console.error('Delete image error:', error);
      sendServerError(res, 'Failed to delete image');
    }
  }

  // Get images by entity
  async getImagesByEntity(req, res) {
    try {
      const { entityType, entityId } = req.params;

      const images = await Image.findAll({
        where: { entityType, entityId },
        order: [['sortOrder', 'ASC'], ['isMain', 'DESC']]
      });

      sendSuccess(res, 'Images fetched successfully', images);
    } catch (error) {
      console.error('Get images by entity error:', error);
      sendServerError(res, 'Failed to fetch images');
    }
  }

  // Bulk delete images
  async bulkDeleteImages(req, res) {
    try {
      const { imageIds } = req.body;

      if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
        return sendBadRequest(res, 'imageIds array is required');
      }

      const images = await Image.findAll({
        where: { id: { [Op.in]: imageIds } }
      });

      if (images.length === 0) {
        return sendBadRequest(res, 'No images found to delete');
      }

      // Delete physical files
      const deleteFilePromises = images.map(image => {
        return new Promise((resolve) => {
          if (fs.existsSync(image.path)) {
            fs.unlink(image.path, (err) => {
              if (err) console.error('Failed to delete file:', image.path, err);
              resolve();
            });
          } else {
            resolve();
          }
        });
      });

      await Promise.all(deleteFilePromises);

      // Delete database records
      await Image.destroy({
        where: { id: { [Op.in]: imageIds } }
      });

      // Check for entities that no longer have main images and set new ones
      const entitiesMap = new Map();
      images.forEach(img => {
        const key = `${img.entityType}-${img.entityId}`;
        if (!entitiesMap.has(key)) {
          entitiesMap.set(key, { entityType: img.entityType, entityId: img.entityId, hadMain: false });
        }
        if (img.isMain) {
          entitiesMap.get(key).hadMain = true;
        }
      });

      // Set new main images for entities that lost their main image
      for (const [key, entity] of entitiesMap) {
        if (entity.hadMain) {
          const nextImage = await Image.findOne({
            where: {
              entityType: entity.entityType,
              entityId: entity.entityId
            },
            order: [['sortOrder', 'ASC']]
          });

          if (nextImage) {
            await nextImage.update({ isMain: true });
          }
        }
      }

      sendSuccess(res, `${images.length} images deleted successfully`, {
        deletedCount: images.length
      });
    } catch (error) {
      console.error('Bulk delete images error:', error);
      sendServerError(res, 'Failed to delete images');
    }
  }

  // Get image statistics
  async getImageStats(req, res) {
    try {
      const { entityType, entityId } = req.query;

      const whereClause = {};
      if (entityType) whereClause.entityType = entityType;
      if (entityId) whereClause.entityId = entityId;

      // Total images
      const totalImages = await Image.count({ where: whereClause });

      // Images by entity type
      const byEntityType = await Image.findAll({
        where: whereClause,
        attributes: [
          'entityType',
          [Image.sequelize.fn('COUNT', Image.sequelize.col('id')), 'count']
        ],
        group: ['entityType'],
        raw: true
      });

      // Total file size
      const totalSize = await Image.sum('size', { where: whereClause }) || 0;

      // Average file size
      const avgSize = totalImages > 0 ? Math.round(totalSize / totalImages) : 0;

      const stats = {
        total: totalImages,
        byEntityType: byEntityType.reduce((acc, item) => {
          acc[item.entityType] = parseInt(item.count);
          return acc;
        }, {}),
        storage: {
          totalSize: totalSize,
          averageSize: avgSize,
          totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
        }
      };

      sendSuccess(res, 'Image statistics fetched successfully', stats);
    } catch (error) {
      console.error('Get image stats error:', error);
      sendServerError(res, 'Failed to fetch image statistics');
    }
  }
}

module.exports = new ImageController();