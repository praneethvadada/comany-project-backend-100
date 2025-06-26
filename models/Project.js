// models/Project.js - FIXED VERSION WITH WORKING SLUG GENERATION

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
      console.log('🔨 HOOK: beforeCreate triggered for project:', project.title);
      
      if (!project.slug) {
        // ✅ FIXED: Proper slug generation
        const slug = project.title
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')           // Remove special characters except hyphens and underscores
          .replace(/[\s_-]+/g, '-')           // Replace spaces, underscores, and multiple hyphens with single hyphen
          .replace(/^-+|-+$/g, '');           // Remove leading and trailing hyphens
        
        project.slug = slug;
        console.log('🔗 HOOK: Generated slug:', slug, 'from title:', project.title);
      }
      
      console.log('🏁 HOOK: beforeCreate completed, project.slug =', project.slug);
    },
    
    beforeUpdate: (project) => {
      console.log('🔨 HOOK: beforeUpdate triggered for project:', project.title);
      
      if (project.changed('title') && !project.changed('slug')) {
        // ✅ FIXED: Proper slug generation
        const slug = project.title
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')           // Remove special characters except hyphens and underscores
          .replace(/[\s_-]+/g, '-')           // Replace spaces, underscores, and multiple hyphens with single hyphen
          .replace(/^-+|-+$/g, '');           // Remove leading and trailing hyphens
        
        project.slug = slug;
        console.log('🔗 HOOK: Updated slug:', slug, 'from new title:', project.title);
      }
      
      console.log('🏁 HOOK: beforeUpdate completed, project.slug =', project.slug);
    }
  }
});

module.exports = Project;


// const { DataTypes } = require('sequelize');
// const sequelize = require('../config/database');

// const Project = sequelize.define('Project', {
//   id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true
//   },
//   title: {
//     type: DataTypes.STRING,
//     allowNull: false,
//     validate: {
//       len: [2, 300]
//     }
//   },
//   slug: {
//     type: DataTypes.STRING,
//     allowNull: false,
//     unique: true,
//     validate: {
//       len: [2, 300]
//     }
//   },
//   abstract: {
//     type: DataTypes.TEXT,
//     allowNull: false
//   },
//   blockDiagram: {
//     type: DataTypes.STRING,
//     allowNull: true
//   },
//   specifications: {
//     type: DataTypes.TEXT,
//     allowNull: false
//   },
//   learningOutcomes: {
//     type: DataTypes.TEXT,
//     allowNull: false
//   },
//   subDomainId: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//     references: {
//       model: 'sub_domains',
//       key: 'id'
//     }
//   },
//   isActive: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: true
//   },
//   isFeatured: {
//     type: DataTypes.BOOLEAN,
//     defaultValue: false
//   },
//   sortOrder: {
//     type: DataTypes.INTEGER,
//     defaultValue: 0
//   },
//   viewCount: {
//     type: DataTypes.INTEGER,
//     defaultValue: 0
//   },
//   leadCount: {
//     type: DataTypes.INTEGER,
//     defaultValue: 0
//   }
// }, {
//   tableName: 'projects',
//   hooks: {
//     beforeCreate: (project) => {
//       if (!project.slug) {
//         project.slug = project.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
//       }
//     },
//     beforeUpdate: (project) => {
//       if (project.changed('title') && !project.changed('slug')) {
//         project.slug = project.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-');
//       }
//     }
//   }
// });

// module.exports = Project;
