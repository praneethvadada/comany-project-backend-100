'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('leads', {
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
      domainInterest: {
        type: Sequelize.STRING,
        allowNull: false
      },
      projectId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('new', 'contacted', 'converted', 'closed'),
        defaultValue: 'new'
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
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('leads', ['email']);
    await queryInterface.addIndex('leads', ['phoneNumber']);
    await queryInterface.addIndex('leads', ['projectId']);
    await queryInterface.addIndex('leads', ['status']);
    await queryInterface.addIndex('leads', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('leads');
  }
};
