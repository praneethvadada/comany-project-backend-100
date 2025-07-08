// migrations/20250101000005-update-images-for-internships.js - FIXED VERSION
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // First, let's check what enum values currently exist
      const [results] = await queryInterface.sequelize.query(
        "SHOW COLUMNS FROM images LIKE 'entityType'"
      );
      
      console.log('Current entityType column info:', results);

      // Update the enum to include new values
      // Note: In MySQL, we need to recreate the enum with all values
      await queryInterface.changeColumn('images', 'entityType', {
        type: Sequelize.ENUM(
          'domain', 
          'subdomain', 
          'project', 
          'branch', 
          'internshipDomain', 
          'internship', 
          'certificate'
        ),
        allowNull: false
      });

      console.log('✅ Updated entityType enum successfully');

      // Try to add the index, but ignore error if it already exists
      try {
        await queryInterface.addIndex('images', {
          fields: ['entityType', 'entityId', 'isMain'],
          name: 'images_entity_type_entity_id_is_main_new'
        });
        console.log('✅ Added new index successfully');
      } catch (indexError) {
        console.log('ℹ️  Index might already exist, skipping:', indexError.message);
      }

    } catch (error) {
      console.error('❌ Error updating images table:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Revert the enum to original values
      await queryInterface.changeColumn('images', 'entityType', {
        type: Sequelize.ENUM('domain', 'subdomain', 'project'),
        allowNull: false
      });

      // Remove the index we added (if it exists)
      try {
        await queryInterface.removeIndex('images', 'images_entity_type_entity_id_is_main_new');
      } catch (error) {
        console.log('ℹ️  Index removal failed (might not exist):', error.message);
      }

    } catch (error) {
      console.error('❌ Error reverting images table:', error);
      throw error;
    }
  }
};