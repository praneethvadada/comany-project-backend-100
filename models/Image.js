const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Image = sequelize.define('Image', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  entityType: {
    type: DataTypes.ENUM('domain', 'subdomain', 'project'),
    allowNull: false
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  isMain: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  alt: {
    type: DataTypes.STRING,
    allowNull: true
  },
  caption: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'images',
  indexes: [
    {
      fields: ['entityType', 'entityId']
    },
    {
      fields: ['entityType', 'entityId', 'isMain']
    }
  ]
});

module.exports = Image;
