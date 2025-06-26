const Joi = require('joi');
const { sendBadRequest } = require('../utils/responseHelper');

// const validate = (schema) => {
//   return (req, res, next) => {
//     const { error } = schema.validate(req.body);
//     if (error) {
//       const message = error.details.map(detail => detail.message).join(', ');
//       return sendBadRequest(res, message);
//     }
//     next();
//   };
// };

const validate = (schema) => {
  return (req, res, next) => {
    console.log('🔍 VALIDATION DEBUG - Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 VALIDATION DEBUG - Schema keys allowed:', Object.keys(schema.describe().keys));
    
    const { error } = schema.validate(req.body);
    if (error) {
      console.log('❌ VALIDATION ERROR:', error.details);
      const message = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: `Validation error: ${message}`
      });
    }
    
    console.log('✅ VALIDATION PASSED');
    next();
  };
};

const authSchemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  signup: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
  }),

  requestPasswordReset: Joi.object({
    email: Joi.string().email().required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    otp: Joi.string().length(6).required(),
    newPassword: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
  }),

  verifyOTP: Joi.object({
    token: Joi.string().required(),
    otp: Joi.string().length(6).required()
  })
};

module.exports = {
  validate,
  authSchemas
};