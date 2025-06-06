'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await queryInterface.bulkInsert('users', [{
      email: 'admin@projectshowcase.com',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', {
      email: 'admin@projectshowcase.com'
    }, {});
  }
};
