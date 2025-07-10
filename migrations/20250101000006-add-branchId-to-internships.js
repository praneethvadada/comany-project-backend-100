// migrations/20250101000006-add-branchId-to-internships.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // 1. Add branchId column to internships table
      await queryInterface.addColumn('internships', 'branchId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      });

      // 2. Modify internshipDomainId to allow null values
      await queryInterface.changeColumn('internships', 'internshipDomainId', {
        type: Sequelize.INTEGER,
        allowNull: true, // Changed from false to true
        references: {
          model: 'internship_domains',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      });

      // 3. Add indexes for better performance
      await queryInterface.addIndex('internships', ['branchId']);
      await queryInterface.addIndex('internships', ['branchId', 'internshipDomainId']);

      console.log('✅ Successfully added branchId column and updated internshipDomainId');
    } catch (error) {
      console.error('❌ Error in migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove indexes
      await queryInterface.removeIndex('internships', ['branchId', 'internshipDomainId']);
      await queryInterface.removeIndex('internships', ['branchId']);

      // Revert internshipDomainId to not allow null
      await queryInterface.changeColumn('internships', 'internshipDomainId', {
        type: Sequelize.INTEGER,
        allowNull: false, // Revert back to false
        references: {
          model: 'internship_domains',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      });

      // Remove branchId column
      await queryInterface.removeColumn('internships', 'branchId');

      console.log('✅ Successfully reverted migration');
    } catch (error) {
      console.error('❌ Error reverting migration:', error);
      throw error;
    }
  }
};