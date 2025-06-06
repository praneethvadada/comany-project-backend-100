const { verifyToken } = require('../utils/jwtHelper');
const { User } = require('../models');
const { sendUnauthorized } = require('../utils/responseHelper');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(res, 'Access token required');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user || !user.isActive) {
      return sendUnauthorized(res, 'User not found or inactive');
    }

    req.user = user;
    next();
  } catch (error) {
    return sendUnauthorized(res, 'Invalid token');
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

module.exports = {
  authenticate,
  adminOnly
};