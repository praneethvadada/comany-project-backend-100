'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('images', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      filename: {
        type: Sequelize.STRING,
        allowNull: false
      },
      originalName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      mimeType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      size: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      path: {
        type: Sequelize.STRING,
        allowNull: false
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false
      },
      entityType: {
        type: Sequelize.ENUM('domain', 'subdomain', 'project'),
        allowNull: false
      },
      entityId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      isMain: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      alt: {
        type: Sequelize.STRING,
        allowNull: true
      },
      caption: {
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

    await queryInterface.addIndex('images', ['entityType', 'entityId']);
    await queryInterface.addIndex('images', ['entityType', 'entityId', 'isMain']);
    await queryInterface.addIndex('images', ['sortOrder']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('images');
  }
};
