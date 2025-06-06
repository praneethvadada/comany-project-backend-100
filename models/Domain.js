const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Domain = sequelize.define('Domain', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 200]
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
      len: [2, 200]
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
  tableName: 'domains',
  hooks: {
    beforeCreate: (domain) => {
      if (!domain.slug) {
        domain.slug = domain.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
      }
    },
    beforeUpdate: (domain) => {
      if (domain.changed('title') && !domain.changed('slug')) {
        domain.slug = domain.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
      }
    }
  }
});

module.exports = Domain;
