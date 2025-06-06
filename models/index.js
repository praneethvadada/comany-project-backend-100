const sequelize = require('../config/database');
const User = require('./User');
const Domain = require('./Domain');
const SubDomain = require('./SubDomain');
const Project = require('./Project');
const Lead = require('./Lead');
const Image = require('./Image');

Domain.hasMany(SubDomain, { foreignKey: 'domainId', as: 'subDomains' });
SubDomain.belongsTo(Domain, { foreignKey: 'domainId', as: 'domain' });

SubDomain.hasMany(SubDomain, { foreignKey: 'parentId', as: 'children' });
SubDomain.belongsTo(SubDomain, { foreignKey: 'parentId', as: 'parent' });

SubDomain.hasMany(Project, { foreignKey: 'subDomainId', as: 'projects' });
Project.belongsTo(SubDomain, { foreignKey: 'subDomainId', as: 'subDomain' });

Project.hasMany(Lead, { foreignKey: 'projectId', as: 'leads' });
Lead.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

Domain.hasMany(Image, { foreignKey: 'entityId', constraints: false, scope: { entityType: 'domain' }, as: 'images' });
SubDomain.hasMany(Image, { foreignKey: 'entityId', constraints: false, scope: { entityType: 'subdomain' }, as: 'images' });
Project.hasMany(Image, { foreignKey: 'entityId', constraints: false, scope: { entityType: 'project' }, as: 'images' });

Image.belongsTo(Domain, { foreignKey: 'entityId', constraints: false, as: 'domain' });
Image.belongsTo(SubDomain, { foreignKey: 'entityId', constraints: false, as: 'subdomain' });
Image.belongsTo(Project, { foreignKey: 'entityId', constraints: false, as: 'project' });

module.exports = {
  sequelize,
  User,
  Domain,
  SubDomain,
  Project,
  Lead,
  Image
};
