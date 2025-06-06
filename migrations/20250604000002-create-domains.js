'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('domains', {
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
        allowNull: false,
        unique: true
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

    await queryInterface.addIndex('domains', ['slug']);
    await queryInterface.addIndex('domains', ['isActive']);
    await queryInterface.addIndex('domains', ['sortOrder']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('domains');
  }
};
