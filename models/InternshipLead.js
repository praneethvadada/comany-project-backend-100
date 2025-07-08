// models/InternshipLead.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InternshipLead = sequelize.define('InternshipLead', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [10, 15]
    }
  },
  collegeName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 200]
    }
  },
  branch: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  yearOfStudy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  previousExperience: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  internshipId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'internships',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('new', 'contacted', 'enrolled', 'completed', 'cancelled', 'rejected'),
    defaultValue: 'new'
  },
  enrollmentDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completionDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  certificateIssued: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  certificatePath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'website'
  },
  utmSource: {
    type: DataTypes.STRING,
    allowNull: true
  },
  utmMedium: {
    type: DataTypes.STRING,
    allowNull: true
  },
  utmCampaign: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'internship_leads',
  indexes: [
    {
      fields: ['email']
    },
    {
      fields: ['phoneNumber']
    },
    {
      fields: ['status']
    },
    {
      fields: ['internshipId']
    },
    {
      fields: ['createdAt']
    }
  ]
});

module.exports = InternshipLead;
