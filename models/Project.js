const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 300]
    }
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [2, 300]
    }
  },
  abstract: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  blockDiagram: {
    type: DataTypes.STRING,
    allowNull: true
  },
  specifications: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  learningOutcomes: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  subDomainId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sub_domains',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  leadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'projects',
  hooks: {
    beforeCreate: (project) => {
      if (!project.slug) {
        project.slug = project.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
      }
    },
    beforeUpdate: (project) => {
      if (project.changed('title') && !project.changed('slug')) {
        project.slug = project.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
      }
    }
  }
});

module.exports = Project;
