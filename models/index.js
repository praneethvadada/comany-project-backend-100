// models/index.js - Updated with Internship System
const sequelize = require('../config/database');

const User = require('./User');
const Domain = require('./Domain');
const SubDomain = require('./SubDomain');
const Project = require('./Project');
const Lead = require('./Lead');
const Image = require('./Image');

const Branch = require('./Branch');
const InternshipDomain = require('./InternshipDomain');
const Internship = require('./Internship');
const InternshipLead = require('./InternshipLead');
const Rating = require('./Rating');

// =============================================================================
// EXISTING RELATIONSHIPS (Phase 1 - Projects)
// =============================================================================

// Domain -> SubDomain relationships
Domain.hasMany(SubDomain, { foreignKey: 'domainId', as: 'subDomains' });
SubDomain.belongsTo(Domain, { foreignKey: 'domainId', as: 'domain' });

// SubDomain -> SubDomain (self-referencing)
SubDomain.hasMany(SubDomain, { foreignKey: 'parentId', as: 'children' });
SubDomain.belongsTo(SubDomain, { foreignKey: 'parentId', as: 'parent' });

// SubDomain -> Project relationships
SubDomain.hasMany(Project, { foreignKey: 'subDomainId', as: 'projects' });
Project.belongsTo(SubDomain, { foreignKey: 'subDomainId', as: 'subDomain' });

// Project -> Lead relationships
Project.hasMany(Lead, { foreignKey: 'projectId', as: 'leads' });
Lead.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// =============================================================================
// NEW RELATIONSHIPS (Phase 2 - Internships)
// =============================================================================

// Branch -> InternshipDomain relationships
Branch.hasMany(InternshipDomain, { foreignKey: 'branchId', as: 'internshipDomains' });
InternshipDomain.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });

Internship.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
Branch.hasMany(Internship, { foreignKey: 'branchId', as: 'internships' });
// InternshipDomain -> Internship relationships
InternshipDomain.hasMany(Internship, { foreignKey: 'internshipDomainId', as: 'internships' });
Internship.belongsTo(InternshipDomain, { foreignKey: 'internshipDomainId', as: 'internshipDomain' });

// Internship -> InternshipLead relationships
Internship.hasMany(InternshipLead, { foreignKey: 'internshipId', as: 'internshipLeads' });
InternshipLead.belongsTo(Internship, { foreignKey: 'internshipId', as: 'internship' });

// Internship -> Rating relationships
Internship.hasMany(Rating, { foreignKey: 'internshipId', as: 'ratings' });
Rating.belongsTo(Internship, { foreignKey: 'internshipId', as: 'internship' });

// InternshipLead -> Rating relationships (optional - if rating comes from enrolled student)
InternshipLead.hasMany(Rating, { foreignKey: 'internshipLeadId', as: 'ratings' });
Rating.belongsTo(InternshipLead, { foreignKey: 'internshipLeadId', as: 'internshipLead' });

// =============================================================================
// IMAGE RELATIONSHIPS (Updated for Phase 2)
// =============================================================================

// Existing image relationships (Phase 1)
Domain.hasMany(Image, { 
  foreignKey: 'entityId', 
  constraints: false, 
  scope: { entityType: 'domain' }, 
  as: 'images' 
});

SubDomain.hasMany(Image, { 
  foreignKey: 'entityId', 
  constraints: false, 
  scope: { entityType: 'subdomain' }, 
  as: 'images' 
});

Project.hasMany(Image, { 
  foreignKey: 'entityId', 
  constraints: false, 
  scope: { entityType: 'project' }, 
  as: 'images' 
});

// New image relationships (Phase 2)
Branch.hasMany(Image, { 
  foreignKey: 'entityId', 
  constraints: false, 
  scope: { entityType: 'branch' }, 
  as: 'images' 
});

InternshipDomain.hasMany(Image, { 
  foreignKey: 'entityId', 
  constraints: false, 
  scope: { entityType: 'internshipDomain' }, 
  as: 'images' 
});

Internship.hasMany(Image, { 
  foreignKey: 'entityId', 
  constraints: false, 
  scope: { entityType: 'internship' }, 
  as: 'images' 
});

Internship.hasMany(Image, { 
  foreignKey: 'entityId', 
  constraints: false, 
  scope: { entityType: 'certificate' }, 
  as: 'certificateImages' 
});

// Reverse relationships for images
Image.belongsTo(Domain, { foreignKey: 'entityId', constraints: false, as: 'domain' });
Image.belongsTo(SubDomain, { foreignKey: 'entityId', constraints: false, as: 'subdomain' });
Image.belongsTo(Project, { foreignKey: 'entityId', constraints: false, as: 'project' });
Image.belongsTo(Branch, { foreignKey: 'entityId', constraints: false, as: 'branch' });
Image.belongsTo(InternshipDomain, { foreignKey: 'entityId', constraints: false, as: 'internshipDomain' });
Image.belongsTo(Internship, { foreignKey: 'entityId', constraints: false, as: 'internship' });

module.exports = {
  sequelize,
  // Existing models
  User,
  Domain,
  SubDomain,
  Project,
  Lead,
  Image,
  // New internship models
  Branch,
  InternshipDomain,
  Internship,
  InternshipLead,
  Rating
};

// =============================================================================
// UPDATED IMAGE MODEL (models/Image.js)
// =============================================================================
// Note: The Image model needs to be updated to support new entity types
// Here's the updated Image model:

/*
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
    type: DataTypes.ENUM(
      'domain', 
      'subdomain', 
      'project', 
      'branch', 
      'internshipDomain', 
      'internship', 
      'certificate'
    ),
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
*/


// const sequelize = require('../config/database');
// const User = require('./User');
// const Domain = require('./Domain');
// const SubDomain = require('./SubDomain');
// const Project = require('./Project');
// const Lead = require('./Lead');
// const Image = require('./Image');

// Domain.hasMany(SubDomain, { foreignKey: 'domainId', as: 'subDomains' });
// SubDomain.belongsTo(Domain, { foreignKey: 'domainId', as: 'domain' });

// SubDomain.hasMany(SubDomain, { foreignKey: 'parentId', as: 'children' });
// SubDomain.belongsTo(SubDomain, { foreignKey: 'parentId', as: 'parent' });

// SubDomain.hasMany(Project, { foreignKey: 'subDomainId', as: 'projects' });
// Project.belongsTo(SubDomain, { foreignKey: 'subDomainId', as: 'subDomain' });

// Project.hasMany(Lead, { foreignKey: 'projectId', as: 'leads' });
// Lead.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// Domain.hasMany(Image, { foreignKey: 'entityId', constraints: false, scope: { entityType: 'domain' }, as: 'images' });
// SubDomain.hasMany(Image, { foreignKey: 'entityId', constraints: false, scope: { entityType: 'subdomain' }, as: 'images' });
// Project.hasMany(Image, { foreignKey: 'entityId', constraints: false, scope: { entityType: 'project' }, as: 'images' });

// Image.belongsTo(Domain, { foreignKey: 'entityId', constraints: false, as: 'domain' });
// Image.belongsTo(SubDomain, { foreignKey: 'entityId', constraints: false, as: 'subdomain' });
// Image.belongsTo(Project, { foreignKey: 'entityId', constraints: false, as: 'project' });

// module.exports = {
//   sequelize,
//   User,
//   Domain,
//   SubDomain,
//   Project,
//   Lead,
//   Image
// };
