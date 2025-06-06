const { User } = require('../models');
const { generateToken } = require('../utils/jwtHelper');
const emailService = require('../utils/emailService');
const otpService = require('../utils/otpService');
const { 
  sendSuccess, 
  sendCreated, 
  sendBadRequest, 
  sendUnauthorized, 
  sendNotFound,
  sendServerError 
} = require('../utils/responseHelper');

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      console.log(`[Auth] Login attempt for email: ${email}`);

      const user = await User.findOne({ where: { email } });
      if (!user || !user.isActive) {
        console.log(`[Auth] User not found or inactive: ${email}`);
        return sendUnauthorized(res, 'Invalid credentials');
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        console.log(`[Auth] Invalid password for user: ${email}`);
        return sendUnauthorized(res, 'Invalid credentials');
      }

      const token = generateToken({ 
        id: user.id, 
        email: user.email, 
        role: user.role 
      });

      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };

      console.log(`[Auth] Login successful for user: ${email}`);
      sendSuccess(res, 'Login successful', { user: userData, token });
    } catch (error) {
      console.error('[Auth] Login error:', error);
      sendServerError(res, 'Login failed');
    }
  }

  async signup(req, res) {
    try {
      const { name, email, password } = req.body;

      console.log(`[Auth] Signup attempt for email: ${email}`);

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        console.log(`[Auth] User already exists: ${email}`);
        return sendBadRequest(res, 'User already exists with this email');
      }

      const user = await User.create({
        name,
        email,
        password,
        role: 'admin'
      });

      const token = generateToken({ 
        id: user.id, 
        email: user.email, 
        role: user.role 
      });

      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };

      console.log(`[Auth] Signup successful for user: ${email}`);
      sendCreated(res, 'User created successfully', { user: userData, token });
    } catch (error) {
      console.error('[Auth] Signup error:', error);
      sendServerError(res, 'Signup failed');
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      console.log(`[Auth] Change password request for user ID: ${userId}`);

      const user = await User.findByPk(userId);
      if (!user) {
        console.log(`[Auth] User not found: ${userId}`);
        return sendNotFound(res, 'User not found');
      }

      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        console.log(`[Auth] Invalid current password for user: ${userId}`);
        return sendBadRequest(res, 'Current password is incorrect');
      }

      const otp = otpService.generateOTP();
      const token = otpService.store(userId, otp, 'password-change');

      otpService.storePendingAction(token, {
        userId,
        newPassword,
        type: 'password-change'
      });

      console.log(`[Auth] Sending OTP email for password change. User: ${userId}, Token: ${token.substring(0, 8)}...`);

      const emailResult = await emailService.sendOTP(user.email, otp, 'password-change');
      if (!emailResult.success) {
        console.error(`[Auth] Failed to send OTP email:`, emailResult.error);
        return sendServerError(res, 'Failed to send OTP email');
      }

      console.log(`[Auth] OTP sent successfully for password change. User: ${userId}`);
      sendSuccess(res, 'OTP sent to your email. Please verify to complete password change.', { 
        token,
        message: 'Check your email for 6-digit OTP code',
        expiresIn: '10 minutes'
      });
    } catch (error) {
      console.error('[Auth] Change password error:', error);
      sendServerError(res, 'Failed to initiate password change');
    }
  }

  async verifyPasswordChangeOTP(req, res) {
    try {
      const { token, otp } = req.body;

      console.log(`[Auth] Verifying password change OTP. Token: ${token ? token.substring(0, 8) + '...' : 'null'}, OTP: ${otp}`);

      if (!token || !otp) {
        console.log(`[Auth] Missing token or OTP`);
        return sendBadRequest(res, 'Token and OTP are required');
      }

      const verification = otpService.verify(token, otp);
      if (!verification.success) {
        console.log(`[Auth] OTP verification failed:`, verification.error);
        return sendBadRequest(res, verification.error);
      }

      if (verification.purpose !== 'password-change') {
        console.log(`[Auth] Invalid OTP purpose: ${verification.purpose}`);
        return sendBadRequest(res, 'Invalid OTP purpose');
      }

      const pendingAction = otpService.getPendingAction(token);
      if (!pendingAction || pendingAction.type !== 'password-change') {
        console.log(`[Auth] Invalid or missing pending action`);
        return sendBadRequest(res, 'Invalid password change session');
      }

      const userId = verification.identifier;
      if (pendingAction.userId !== userId) {
        console.log(`[Auth] User ID mismatch: ${pendingAction.userId} vs ${userId}`);
        return sendBadRequest(res, 'Invalid password change session');
      }

      console.log(`[Auth] Updating password for user: ${userId}`);

      await User.update(
        { password: pendingAction.newPassword },
        { where: { id: userId }, individualHooks: true }
      );

      otpService.clearOTP(token);

      console.log(`[Auth] Password changed successfully for user: ${userId}`);
      sendSuccess(res, 'Password changed successfully');
    } catch (error) {
      console.error('[Auth] Verify password change OTP error:', error);
      sendServerError(res, 'Failed to verify OTP');
    }
  }

  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      console.log(`[Auth] Password reset request for email: ${email}`);

      const user = await User.findOne({ where: { email } });
      if (!user || !user.isActive) {
        console.log(`[Auth] User not found for password reset: ${email}`);
        // Security: Don't reveal if email exists or not
        return sendSuccess(res, 'If the email exists, a password reset OTP has been sent', {
          message: 'Check your email for the 6-digit OTP code if your email is registered',
          expiresIn: '10 minutes'
        });
      }

      const otp = otpService.generateOTP();
      const token = otpService.store(user.id, otp, 'password-reset');

      console.log(`[Auth] Sending password reset OTP. User: ${user.id}, Token: ${token.substring(0, 8)}...`);

      const emailResult = await emailService.sendOTP(user.email, otp, 'password-reset');
      if (!emailResult.success) {
        console.error(`[Auth] Failed to send reset email:`, emailResult.error);
        return sendServerError(res, 'Failed to send reset email');
      }

      console.log(`[Auth] Password reset OTP sent successfully. User: ${user.id}`);
      sendSuccess(res, 'Password reset OTP sent to your email', { 
        token,
        message: 'Check your email for the 6-digit OTP code',
        expiresIn: '10 minutes'
      });
    } catch (error) {
      console.error('[Auth] Request password reset error:', error);
      sendServerError(res, 'Failed to process password reset request');
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, otp, newPassword } = req.body;

      console.log(`[Auth] Resetting password. Token: ${token ? token.substring(0, 8) + '...' : 'null'}, OTP: ${otp}`);

      if (!token || !otp || !newPassword) {
        console.log(`[Auth] Missing required fields for password reset`);
        return sendBadRequest(res, 'Token, OTP, and new password are required');
      }

      const verification = otpService.verify(token, otp);
      if (!verification.success) {
        console.log(`[Auth] Password reset OTP verification failed:`, verification.error);
        return sendBadRequest(res, verification.error);
      }

      if (verification.purpose !== 'password-reset') {
        console.log(`[Auth] Invalid OTP purpose for password reset: ${verification.purpose}`);
        return sendBadRequest(res, 'Invalid OTP purpose');
      }

      const userId = verification.identifier;
      const user = await User.findByPk(userId);
      
      if (!user || !user.isActive) {
        console.log(`[Auth] User not found for password reset: ${userId}`);
        return sendNotFound(res, 'User not found');
      }

      console.log(`[Auth] Updating password for user: ${userId}`);

      await User.update(
        { password: newPassword },
        { where: { id: userId }, individualHooks: true }
      );

      otpService.clearOTP(token);

      console.log(`[Auth] Password reset successfully for user: ${userId}`);
      sendSuccess(res, 'Password reset successfully. You can now login with your new password.');
    } catch (error) {
      console.error('[Auth] Reset password error:', error);
      sendServerError(res, 'Failed to reset password');
    }
  }

  async getProfile(req, res) {
    try {
      const userData = {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt
      };

      sendSuccess(res, 'Profile fetched successfully', userData);
    } catch (error) {
      console.error('[Auth] Get profile error:', error);
      sendServerError(res, 'Failed to fetch profile');
    }
  }

  async updateProfile(req, res) {
    try {
      const { name } = req.body;
      const userId = req.user.id;

      await User.update({ name }, { where: { id: userId } });

      const updatedUser = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      sendSuccess(res, 'Profile updated successfully', {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      });
    } catch (error) {
      console.error('[Auth] Update profile error:', error);
      sendServerError(res, 'Failed to update profile');
    }
  }

  async logout(req, res) {
    try {
      sendSuccess(res, 'Logged out successfully');
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      sendServerError(res, 'Failed to logout');
    }
  }

  async getOTPStats(req, res) {
    try {
      const stats = otpService.getStats();
      sendSuccess(res, 'OTP stats fetched', stats);
    } catch (error) {
      console.error('[Auth] Get OTP stats error:', error);
      sendServerError(res, 'Failed to fetch OTP stats');
    }
  }
}

module.exports = new AuthController();


// const { User } = require('../models');
// const { generateToken } = require('../utils/jwtHelper');
// const emailService = require('../utils/emailService');
// const otpService = require('../utils/otpService');
// const { 
//   sendSuccess, 
//   sendCreated, 
//   sendBadRequest, 
//   sendUnauthorized, 
//   sendNotFound,
//   sendServerError 
// } = require('../utils/responseHelper');

// class AuthController {
//   async login(req, res) {
//     try {
//       const { email, password } = req.body;

//       console.log(`[Auth] Login attempt for email: ${email}`);

//       const user = await User.findOne({ where: { email } });
//       if (!user || !user.isActive) {
//         console.log(`[Auth] User not found or inactive: ${email}`);
//         return sendUnauthorized(res, 'Invalid credentials');
//       }

//       const isPasswordValid = await user.comparePassword(password);
//       if (!isPasswordValid) {
//         console.log(`[Auth] Invalid password for user: ${email}`);
//         return sendUnauthorized(res, 'Invalid credentials');
//       }

//       const token = generateToken({ 
//         id: user.id, 
//         email: user.email, 
//         role: user.role 
//       });

//       const userData = {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role
//       };

//       console.log(`[Auth] Login successful for user: ${email}`);
//       sendSuccess(res, 'Login successful', { user: userData, token });
//     } catch (error) {
//       console.error('[Auth] Login error:', error);
//       sendServerError(res, 'Login failed');
//     }
//   }

//   async signup(req, res) {
//     try {
//       const { name, email, password } = req.body;

//       console.log(`[Auth] Signup attempt for email: ${email}`);

//       const existingUser = await User.findOne({ where: { email } });
//       if (existingUser) {
//         console.log(`[Auth] User already exists: ${email}`);
//         return sendBadRequest(res, 'User already exists with this email');
//       }

//       const user = await User.create({
//         name,
//         email,
//         password,
//         role: 'admin'
//       });

//       const token = generateToken({ 
//         id: user.id, 
//         email: user.email, 
//         role: user.role 
//       });

//       const userData = {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role
//       };

//       console.log(`[Auth] Signup successful for user: ${email}`);
//       sendCreated(res, 'User created successfully', { user: userData, token });
//     } catch (error) {
//       console.error('[Auth] Signup error:', error);
//       sendServerError(res, 'Signup failed');
//     }
//   }

//   async changePassword(req, res) {
//     try {
//       const { currentPassword, newPassword } = req.body;
//       const userId = req.user.id;

//       console.log(`[Auth] Change password request for user ID: ${userId}`);

//       const user = await User.findByPk(userId);
//       if (!user) {
//         console.log(`[Auth] User not found: ${userId}`);
//         return sendNotFound(res, 'User not found');
//       }

//       const isCurrentPasswordValid = await user.comparePassword(currentPassword);
//       if (!isCurrentPasswordValid) {
//         console.log(`[Auth] Invalid current password for user: ${userId}`);
//         return sendBadRequest(res, 'Current password is incorrect');
//       }

//       const otp = otpService.generateOTP();
//       const token = otpService.store(userId, otp, 'password-change');

//       otpService.storePendingAction(token, {
//         userId,
//         newPassword,
//         type: 'password-change'
//       });

//       console.log(`[Auth] Sending OTP email for password change. User: ${userId}, Token: ${token.substring(0, 8)}...`);

//       const emailResult = await emailService.sendOTP(user.email, otp, 'password-change');
//       if (!emailResult.success) {
//         console.error(`[Auth] Failed to send OTP email:`, emailResult.error);
//         return sendServerError(res, 'Failed to send OTP email');
//       }

//       console.log(`[Auth] OTP sent successfully for password change. User: ${userId}`);
//       sendSuccess(res, 'OTP sent to your email. Please verify to complete password change.', { 
//         token,
//         message: 'Check your email for OTP',
//         expiresIn: '10 minutes'
//       });
//     } catch (error) {
//       console.error('[Auth] Change password error:', error);
//       sendServerError(res, 'Failed to initiate password change');
//     }
//   }

//   async verifyPasswordChangeOTP(req, res) {
//     try {
//       const { token, otp } = req.body;

//       console.log(`[Auth] Verifying password change OTP. Token: ${token ? token.substring(0, 8) + '...' : 'null'}, OTP: ${otp}`);

//       if (!token || !otp) {
//         console.log(`[Auth] Missing token or OTP`);
//         return sendBadRequest(res, 'Token and OTP are required');
//       }

//       const verification = otpService.verify(token, otp);
//       if (!verification.success) {
//         console.log(`[Auth] OTP verification failed:`, verification.error);
//         return sendBadRequest(res, verification.error);
//       }

//       if (verification.purpose !== 'password-change') {
//         console.log(`[Auth] Invalid OTP purpose: ${verification.purpose}`);
//         return sendBadRequest(res, 'Invalid OTP purpose');
//       }

//       const pendingAction = otpService.getPendingAction(token);
//       if (!pendingAction || pendingAction.type !== 'password-change') {
//         console.log(`[Auth] Invalid or missing pending action`);
//         return sendBadRequest(res, 'Invalid password change session');
//       }

//       const userId = verification.identifier;
//       if (pendingAction.userId !== userId) {
//         console.log(`[Auth] User ID mismatch: ${pendingAction.userId} vs ${userId}`);
//         return sendBadRequest(res, 'Invalid password change session');
//       }

//       console.log(`[Auth] Updating password for user: ${userId}`);

//       await User.update(
//         { password: pendingAction.newPassword },
//         { where: { id: userId }, individualHooks: true }
//       );

//       otpService.clearOTP(token);

//       console.log(`[Auth] Password changed successfully for user: ${userId}`);
//       sendSuccess(res, 'Password changed successfully');
//     } catch (error) {
//       console.error('[Auth] Verify password change OTP error:', error);
//       sendServerError(res, 'Failed to verify OTP');
//     }
//   }

//   async requestPasswordReset(req, res) {
//     try {
//       const { email } = req.body;

//       console.log(`[Auth] Password reset request for email: ${email}`);

//       const user = await User.findOne({ where: { email } });
//       if (!user || !user.isActive) {
//         console.log(`[Auth] User not found for password reset: ${email}`);
//         return sendSuccess(res, 'If the email exists, a reset link has been sent');
//       }

//       const otp = otpService.generateOTP();
//       const token = otpService.store(user.id, otp, 'password-reset');

//       console.log(`[Auth] Sending password reset OTP. User: ${user.id}, Token: ${token.substring(0, 8)}...`);

//       const emailResult = await emailService.sendOTP(user.email, otp, 'password-reset');
//       if (!emailResult.success) {
//         console.error(`[Auth] Failed to send reset email:`, emailResult.error);
//         return sendServerError(res, 'Failed to send reset email');
//       }

//       console.log(`[Auth] Password reset OTP sent successfully. User: ${user.id}`);
//       sendSuccess(res, 'Password reset OTP sent to your email', { 
//         token,
//         message: 'Check your email for OTP',
//         expiresIn: '10 minutes'
//       });
//     } catch (error) {
//       console.error('[Auth] Request password reset error:', error);
//       sendServerError(res, 'Failed to process password reset request');
//     }
//   }

//   async resetPassword(req, res) {
//     try {
//       const { token, otp, newPassword } = req.body;

//       console.log(`[Auth] Resetting password. Token: ${token ? token.substring(0, 8) + '...' : 'null'}, OTP: ${otp}`);

//       if (!token || !otp || !newPassword) {
//         console.log(`[Auth] Missing required fields for password reset`);
//         return sendBadRequest(res, 'Token, OTP, and new password are required');
//       }

//       const verification = otpService.verify(token, otp);
//       if (!verification.success) {
//         console.log(`[Auth] Password reset OTP verification failed:`, verification.error);
//         return sendBadRequest(res, verification.error);
//       }

//       if (verification.purpose !== 'password-reset') {
//         console.log(`[Auth] Invalid OTP purpose for password reset: ${verification.purpose}`);
//         return sendBadRequest(res, 'Invalid OTP purpose');
//       }

//       const userId = verification.identifier;
//       const user = await User.findByPk(userId);
      
//       if (!user || !user.isActive) {
//         console.log(`[Auth] User not found for password reset: ${userId}`);
//         return sendNotFound(res, 'User not found');
//       }

//       console.log(`[Auth] Updating password for user: ${userId}`);

//       await User.update(
//         { password: newPassword },
//         { where: { id: userId }, individualHooks: true }
//       );

//       otpService.clearOTP(token);

//       console.log(`[Auth] Password reset successfully for user: ${userId}`);
//       sendSuccess(res, 'Password reset successfully');
//     } catch (error) {
//       console.error('[Auth] Reset password error:', error);
//       sendServerError(res, 'Failed to reset password');
//     }
//   }

//   async getProfile(req, res) {
//     try {
//       const userData = {
//         id: req.user.id,
//         name: req.user.name,
//         email: req.user.email,
//         role: req.user.role,
//         createdAt: req.user.createdAt
//       };

//       sendSuccess(res, 'Profile fetched successfully', userData);
//     } catch (error) {
//       console.error('[Auth] Get profile error:', error);
//       sendServerError(res, 'Failed to fetch profile');
//     }
//   }

//   async updateProfile(req, res) {
//     try {
//       const { name } = req.body;
//       const userId = req.user.id;

//       await User.update({ name }, { where: { id: userId } });

//       const updatedUser = await User.findByPk(userId, {
//         attributes: { exclude: ['password'] }
//       });

//       sendSuccess(res, 'Profile updated successfully', {
//         id: updatedUser.id,
//         name: updatedUser.name,
//         email: updatedUser.email,
//         role: updatedUser.role
//       });
//     } catch (error) {
//       console.error('[Auth] Update profile error:', error);
//       sendServerError(res, 'Failed to update profile');
//     }
//   }

//   async logout(req, res) {
//     try {
//       sendSuccess(res, 'Logged out successfully');
//     } catch (error) {
//       console.error('[Auth] Logout error:', error);
//       sendServerError(res, 'Failed to logout');
//     }
//   }

//   async getOTPStats(req, res) {
//     try {
//       const stats = otpService.getStats();
//       sendSuccess(res, 'OTP stats fetched', stats);
//     } catch (error) {
//       console.error('[Auth] Get OTP stats error:', error);
//       sendServerError(res, 'Failed to fetch OTP stats');
//     }
//   }
// }

// module.exports = new AuthController();
// // const { User } = require('../models');
// // const { generateToken } = require('../utils/jwtHelper');
// // const emailService = require('../utils/emailService');
// // const otpService = require('../utils/otpService');
// // const { 
// //   sendSuccess, 
// //   sendCreated, 
// //   sendBadRequest, 
// //   sendUnauthorized, 
// //   sendNotFound,
// //   sendServerError 
// // } = require('../utils/responseHelper');

// // class AuthController {
// //   async login(req, res) {
// //     try {
// //       const { email, password } = req.body;

// //       const user = await User.findOne({ where: { email } });
// //       if (!user || !user.isActive) {
// //         return sendUnauthorized(res, 'Invalid credentials');
// //       }

// //       const isPasswordValid = await user.comparePassword(password);
// //       if (!isPasswordValid) {
// //         return sendUnauthorized(res, 'Invalid credentials');
// //       }

// //       const token = generateToken({ 
// //         id: user.id, 
// //         email: user.email, 
// //         role: user.role 
// //       });

// //       const userData = {
// //         id: user.id,
// //         name: user.name,
// //         email: user.email,
// //         role: user.role
// //       };

// //       sendSuccess(res, 'Login successful', { user: userData, token });
// //     } catch (error) {
// //       console.error('Login error:', error);
// //       sendServerError(res, 'Login failed');
// //     }
// //   }

// //   async signup(req, res) {
// //     try {
// //       const { name, email, password } = req.body;

// //       const existingUser = await User.findOne({ where: { email } });
// //       if (existingUser) {
// //         return sendBadRequest(res, 'User already exists with this email');
// //       }

// //       const user = await User.create({
// //         name,
// //         email,
// //         password,
// //         role: 'admin'
// //       });

// //       const token = generateToken({ 
// //         id: user.id, 
// //         email: user.email, 
// //         role: user.role 
// //       });

// //       const userData = {
// //         id: user.id,
// //         name: user.name,
// //         email: user.email,
// //         role: user.role
// //       };

// //       sendCreated(res, 'User created successfully', { user: userData, token });
// //     } catch (error) {
// //       console.error('Signup error:', error);
// //       sendServerError(res, 'Signup failed');
// //     }
// //   }

// //   async changePassword(req, res) {
// //     try {
// //       const { currentPassword, newPassword } = req.body;
// //       const userId = req.user.id;

// //       const user = await User.findByPk(userId);
// //       if (!user) {
// //         return sendNotFound(res, 'User not found');
// //       }

// //       const isCurrentPasswordValid = await user.comparePassword(currentPassword);
// //       if (!isCurrentPasswordValid) {
// //         return sendBadRequest(res, 'Current password is incorrect');
// //       }

// //       const otp = otpService.generateOTP();
// //       const token = otpService.store(userId, otp, 'password-change');

// //       const emailResult = await emailService.sendOTP(user.email, otp, 'password-change');
// //       if (!emailResult.success) {
// //         return sendServerError(res, 'Failed to send OTP email');
// //       }

// //       req.session = req.session || {};
// //       req.session.pendingPasswordChange = {
// //         userId,
// //         newPassword,
// //         token
// //       };

// //       sendSuccess(res, 'OTP sent to your email. Please verify to complete password change.', { 
// //         token,
// //         message: 'Check your email for OTP' 
// //       });
// //     } catch (error) {
// //       console.error('Change password error:', error);
// //       sendServerError(res, 'Failed to change password');
// //     }
// //   }

// //   async verifyPasswordChangeOTP(req, res) {
// //     try {
// //       const { token, otp } = req.body;

// //       const verification = otpService.verify(token, otp);
// //       if (!verification.success) {
// //         return sendBadRequest(res, verification.error);
// //       }

// //       if (verification.purpose !== 'password-change') {
// //         return sendBadRequest(res, 'Invalid OTP purpose');
// //       }

// //       const userId = verification.identifier;
// //       const pendingChange = req.session?.pendingPasswordChange;

// //       if (!pendingChange || pendingChange.userId !== userId || pendingChange.token !== token) {
// //         return sendBadRequest(res, 'Invalid password change session');
// //       }

// //       await User.update(
// //         { password: pendingChange.newPassword },
// //         { where: { id: userId }, individualHooks: true }
// //       );

// //       delete req.session.pendingPasswordChange;

// //       sendSuccess(res, 'Password changed successfully');
// //     } catch (error) {
// //       console.error('Verify password change OTP error:', error);
// //       sendServerError(res, 'Failed to verify OTP');
// //     }
// //   }

// //   async requestPasswordReset(req, res) {
// //     try {
// //       const { email } = req.body;

// //       const user = await User.findOne({ where: { email } });
// //       if (!user || !user.isActive) {
// //         return sendSuccess(res, 'If the email exists, a reset link has been sent');
// //       }

// //       const otp = otpService.generateOTP();
// //       const token = otpService.store(user.id, otp, 'password-reset');

// //       const emailResult = await emailService.sendOTP(user.email, otp, 'password-reset');
// //       if (!emailResult.success) {
// //         return sendServerError(res, 'Failed to send reset email');
// //       }

// //       sendSuccess(res, 'Password reset OTP sent to your email', { 
// //         token,
// //         message: 'Check your email for OTP' 
// //       });
// //     } catch (error) {
// //       console.error('Request password reset error:', error);
// //       sendServerError(res, 'Failed to process password reset request');
// //     }
// //   }

// //   async resetPassword(req, res) {
// //     try {
// //       const { token, otp, newPassword } = req.body;

// //       const verification = otpService.verify(token, otp);
// //       if (!verification.success) {
// //         return sendBadRequest(res, verification.error);
// //       }

// //       if (verification.purpose !== 'password-reset') {
// //         return sendBadRequest(res, 'Invalid OTP purpose');
// //       }

// //       const userId = verification.identifier;
// //       const user = await User.findByPk(userId);
      
// //       if (!user || !user.isActive) {
// //         return sendNotFound(res, 'User not found');
// //       }

// //       await User.update(
// //         { password: newPassword },
// //         { where: { id: userId }, individualHooks: true }
// //       );

// //       sendSuccess(res, 'Password reset successfully');
// //     } catch (error) {
// //       console.error('Reset password error:', error);
// //       sendServerError(res, 'Failed to reset password');
// //     }
// //   }

// //   async getProfile(req, res) {
// //     try {
// //       const userData = {
// //         id: req.user.id,
// //         name: req.user.name,
// //         email: req.user.email,
// //         role: req.user.role,
// //         createdAt: req.user.createdAt
// //       };

// //       sendSuccess(res, 'Profile fetched successfully', userData);
// //     } catch (error) {
// //       console.error('Get profile error:', error);
// //       sendServerError(res, 'Failed to fetch profile');
// //     }
// //   }

// //   async updateProfile(req, res) {
// //     try {
// //       const { name } = req.body;
// //       const userId = req.user.id;

// //       await User.update({ name }, { where: { id: userId } });

// //       const updatedUser = await User.findByPk(userId, {
// //         attributes: { exclude: ['password'] }
// //       });

// //       sendSuccess(res, 'Profile updated successfully', {
// //         id: updatedUser.id,
// //         name: updatedUser.name,
// //         email: updatedUser.email,
// //         role: updatedUser.role
// //       });
// //     } catch (error) {
// //       console.error('Update profile error:', error);
// //       sendServerError(res, 'Failed to update profile');
// //     }
// //   }

// //   async logout(req, res) {
// //     try {
// //       if (req.session) {
// //         req.session.destroy();
// //       }
      
// //       sendSuccess(res, 'Logged out successfully');
// //     } catch (error) {
// //       console.error('Logout error:', error);
// //       sendServerError(res, 'Failed to logout');
// //     }
// //   }
// // }

// // module.exports = new AuthController();