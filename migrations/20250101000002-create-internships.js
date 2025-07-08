// migrations/20250101000002-create-internships.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('internships', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      shortDescription: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      learningOutcomes: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      topBenefits: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      realTimeProjects: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      duration: {
        type: Sequelize.STRING,
        allowNull: true
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      originalPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      maxLearners: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      currentLearners: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      averageRating: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0.00
      },
      totalRatings: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      certificateTemplate: {
        type: Sequelize.STRING,
        allowNull: true
      },
      prerequisites: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      internshipDomainId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'internship_domains',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      isFeatured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      isComingSoon: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      viewCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      enrollmentCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes
    await queryInterface.addIndex('internships', ['internshipDomainId']);
    await queryInterface.addIndex('internships', ['isActive']);
    await queryInterface.addIndex('internships', ['isFeatured']);
    await queryInterface.addIndex('internships', ['isComingSoon']);
    await queryInterface.addIndex('internships', ['averageRating']);
    await queryInterface.addIndex('internships', ['startDate']);
    await queryInterface.addIndex('internships', ['endDate']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('internships');
  }
};

