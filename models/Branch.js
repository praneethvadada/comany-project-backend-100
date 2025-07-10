// models/Branch.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Branch = sequelize.define('Branch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [2, 20]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [2, 100]
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  hasDomains: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
}, {
  tableName: 'branches',
  hooks: {
    beforeCreate: (branch) => {
      if (!branch.slug) {
        branch.slug = branch.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
      }
    },
    beforeUpdate: (branch) => {
      if (branch.changed('name') && !branch.changed('slug')) {
        branch.slug = branch.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
      }
    }
  }
});

module.exports = Branch;






