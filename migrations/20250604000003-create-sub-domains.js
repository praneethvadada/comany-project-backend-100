'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sub_domains', {
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
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false
      },
      domainId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'domains',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      parentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'sub_domains',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      level: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      isLeaf: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      sortOrder: {
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

    await queryInterface.addIndex('sub_domains', ['domainId']);
    await queryInterface.addIndex('sub_domains', ['parentId']);
    await queryInterface.addIndex('sub_domains', ['domainId', 'slug'], { unique: true });
    await queryInterface.addIndex('sub_domains', ['isLeaf']);
    await queryInterface.addIndex('sub_domains', ['isActive']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sub_domains');
  }
};
