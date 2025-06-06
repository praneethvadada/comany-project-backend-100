const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, authSchemas } = require('../middleware/validation');

const router = express.Router();

// Basic auth routes
router.post('/login', validate(authSchemas.login), authController.login);
router.post('/signup', validate(authSchemas.signup), authController.signup);
router.post('/logout', authController.logout);

// Password change with current password
router.post('/change-password', 
  authenticate, 
  validate(authSchemas.changePassword), 
  authController.changePassword
);

router.post('/verify-password-change', 
  authenticate, 
  validate(authSchemas.verifyOTP), 
  authController.verifyPasswordChangeOTP
);

// Forgot password routes (multiple endpoints for frontend compatibility)
router.post('/forgot-password', 
  validate(authSchemas.requestPasswordReset), 
  authController.requestPasswordReset
);

router.post('/request-password-reset', 
  validate(authSchemas.requestPasswordReset), 
  authController.requestPasswordReset
);

router.post('/reset-password', 
  validate(authSchemas.resetPassword), 
  authController.resetPassword
);

// Profile routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);

// Debug route
router.get('/otp-stats', authenticate, authController.getOTPStats);

module.exports = router;
// const express = require('express');
// const authController = require('../controllers/authController');
// const { authenticate } = require('../middleware/auth');
// const { validate, authSchemas } = require('../middleware/validation');

// const router = express.Router();

// router.post('/login', validate(authSchemas.login), authController.login);
// router.post('/signup', validate(authSchemas.signup), authController.signup);
// router.post('/logout', authController.logout);

// router.post('/change-password', 
//   authenticate, 
//   validate(authSchemas.changePassword), 
//   authController.changePassword
// );

// router.post('/verify-password-change', 
//   authenticate, 
//   validate(authSchemas.verifyOTP), 
//   authController.verifyPasswordChangeOTP
// );

// router.post('/request-password-reset', 
//   validate(authSchemas.requestPasswordReset), 
//   authController.requestPasswordReset
// );

// router.post('/reset-password', 
//   validate(authSchemas.resetPassword), 
//   authController.resetPassword
// );

// router.get('/profile', authenticate, authController.getProfile);
// router.put('/profile', authenticate, authController.updateProfile);

// router.get('/otp-stats', authenticate, authController.getOTPStats);

// module.exports = router;
// // const express = require('express');
// // const authController = require('../controllers/authController');
// // const { authenticate } = require('../middleware/auth');
// // const { validate, authSchemas } = require('../middleware/validation');

// // const router = express.Router();

// // router.post('/login', validate(authSchemas.login), authController.login);
// // router.post('/signup', validate(authSchemas.signup), authController.signup);
// // router.post('/logout', authController.logout);

// // router.post('/change-password', 
// //   authenticate, 
// //   validate(authSchemas.changePassword), 
// //   authController.changePassword
// // );

// // router.post('/verify-password-change', 
// //   authenticate, 
// //   validate(authSchemas.verifyOTP), 
// //   authController.verifyPasswordChangeOTP
// // );

// // router.post('/request-password-reset', 
// //   validate(authSchemas.requestPasswordReset), 
// //   authController.requestPasswordReset
// // );

// // router.post('/reset-password', 
// //   validate(authSchemas.resetPassword), 
// //   authController.resetPassword
// // );

// // router.get('/profile', authenticate, authController.getProfile);
// // router.put('/profile', authenticate, authController.updateProfile);

// // module.exports = router;
