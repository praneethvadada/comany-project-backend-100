'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('projects', {
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
      abstract: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      blockDiagram: {
        type: Sequelize.STRING,
        allowNull: true
      },
      specifications: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      learningOutcomes: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      subDomainId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'sub_domains',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      isFeatured: {
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
      leadCount: {
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

    await queryInterface.addIndex('projects', ['slug']);
    await queryInterface.addIndex('projects', ['subDomainId']);
    await queryInterface.addIndex('projects', ['isActive']);
    await queryInterface.addIndex('projects', ['isFeatured']);
    await queryInterface.addIndex('projects', ['sortOrder']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('projects');
  }
};
