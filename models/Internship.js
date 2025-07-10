// models/Internship.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Internship = sequelize.define('Internship', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 200]
    }
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  shortDescription: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  learningOutcomes: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  topBenefits: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  realTimeProjects: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  duration: {
    type: DataTypes.STRING,
    allowNull: true // Can be auto-calculated
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  originalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  maxLearners: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  currentLearners: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  averageRating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00
  },
  totalRatings: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  certificateTemplate: {
    type: DataTypes.STRING,
    allowNull: true // Path to certificate template
  },
  prerequisites: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  internshipDomainId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'internship_domains',
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
  isComingSoon: {
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
  enrollmentCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'internships',
  hooks: {
    beforeCreate: (internship) => {
      if (!internship.slug) {
        internship.slug = internship.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
      }
      // Calculate duration if not provided
      if (!internship.duration && internship.startDate && internship.endDate) {
        const diffTime = Math.abs(new Date(internship.endDate) - new Date(internship.startDate));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(diffDays / 7);
        internship.duration = weeks > 0 ? `${weeks} weeks` : `${diffDays} days`;
      }
    },
    beforeUpdate: (internship) => {
      if (internship.changed('title') && !internship.changed('slug')) {
        internship.slug = internship.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
      }
      // Recalculate duration if dates changed
      if ((internship.changed('startDate') || internship.changed('endDate')) && !internship.changed('duration')) {
        const diffTime = Math.abs(new Date(internship.endDate) - new Date(internship.startDate));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(diffDays / 7);
        internship.duration = weeks > 0 ? `${weeks} weeks` : `${diffDays} days`;
      }
    }
  }
});

module.exports = Internship;