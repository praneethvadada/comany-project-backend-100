// migrations/20250101000004-create-ratings.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ratings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      review: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reviewerName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      reviewerEmail: {
        type: Sequelize.STRING,
        allowNull: false
      },
      reviewerDesignation: {
        type: Sequelize.STRING,
        allowNull: true
      },
      reviewerCompany: {
        type: Sequelize.STRING,
        allowNull: true
      },
      internshipId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'internships',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      internshipLeadId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'internship_leads',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      isApproved: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      isFeatured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      helpfulCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      reportCount: {
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
    await queryInterface.addIndex('ratings', ['internshipId']);
    await queryInterface.addIndex('ratings', ['internshipLeadId']);
    await queryInterface.addIndex('ratings', ['isApproved']);
    await queryInterface.addIndex('ratings', ['isPublic']);
    await queryInterface.addIndex('ratings', ['isFeatured']);
    await queryInterface.addIndex('ratings', ['rating']);
    await queryInterface.addIndex('ratings', ['reviewerEmail', 'internshipId'], { unique: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ratings');
  }
};

