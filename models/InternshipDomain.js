// models/InternshipDomain.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InternshipDomain = sequelize.define('InternshipDomain', {
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  branchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'internship_domains',
  indexes: [
    {
      unique: true,
      fields: ['branchId', 'slug']
    }
  ],
  hooks: {
    beforeCreate: (domain) => {
      if (!domain.slug) {
        domain.slug = domain.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
      }
    },
    beforeUpdate: (domain) => {
      if (domain.changed('name') && !domain.changed('slug')) {
        domain.slug = domain.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
      }
    }
  }
});

module.exports = InternshipDomain;