const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SubDomain = sequelize.define('SubDomain', {
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
    validate: {
      len: [2, 200]
    }
  },
  domainId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'domains',
      key: 'id'
    }
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'sub_domains',
      key: 'id'
    }
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  isLeaf: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
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
  tableName: 'sub_domains',
  indexes: [
    {
      unique: true,
      fields: ['domainId', 'slug']
    }
  ],
  hooks: {
    beforeCreate: (subdomain) => {
      if (!subdomain.slug) {
        subdomain.slug = subdomain.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
      }
    },
    beforeUpdate: (subdomain) => {
      if (subdomain.changed('title') && !subdomain.changed('slug')) {
        subdomain.slug = subdomain.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
      }
    }
  }
});

module.exports = SubDomain;
