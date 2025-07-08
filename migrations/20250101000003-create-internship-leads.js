// migrations/20250101000003-create-internship-leads.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('internship_leads', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      fullName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      phoneNumber: {
        type: Sequelize.STRING,
        allowNull: false
      },
      collegeName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      branch: {
        type: Sequelize.STRING,
        allowNull: false
      },
      city: {
        type: Sequelize.STRING,
        allowNull: false
      },
      yearOfStudy: {
        type: Sequelize.STRING,
        allowNull: true
      },
      previousExperience: {
        type: Sequelize.TEXT,
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
        onDelete: 'RESTRICT'
      },
      status: {
        type: Sequelize.ENUM('new', 'contacted', 'enrolled', 'completed', 'cancelled', 'rejected'),
        defaultValue: 'new'
      },
      enrollmentDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completionDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      certificateIssued: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      certificatePath: {
        type: Sequelize.STRING,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      source: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'website'
      },
      utmSource: {
        type: Sequelize.STRING,
        allowNull: true
      },
      utmMedium: {
        type: Sequelize.STRING,
        allowNull: true
      },
      utmCampaign: {
        type: Sequelize.STRING,
        allowNull: true
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
    await queryInterface.addIndex('internship_leads', ['email']);
    await queryInterface.addIndex('internship_leads', ['phoneNumber']);
    await queryInterface.addIndex('internship_leads', ['internshipId']);
    await queryInterface.addIndex('internship_leads', ['status']);
    await queryInterface.addIndex('internship_leads', ['createdAt']);
    await queryInterface.addIndex('internship_leads', ['email', 'internshipId'], { unique: false });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('internship_leads');
  }
};

