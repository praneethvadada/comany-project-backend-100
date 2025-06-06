module.exports = {
  USER_ROLES: {
    ADMIN: 'admin'
  },
  IMAGE_TYPES: {
    DOMAIN: 'domain',
    SUBDOMAIN: 'subdomain',
    PROJECT: 'project'
  },
  FILE_TYPES: {
    IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },
  MAX_IMAGES_PER_ENTITY: 10,
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  }
};
