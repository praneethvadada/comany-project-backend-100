const crypto = require('crypto');

let otpStoreInstance = null;

class OTPService {
  constructor() {
    if (otpStoreInstance) {
      return otpStoreInstance;
    }
    
    this.otpStore = new Map();
    this.pendingActions = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    
    otpStoreInstance = this;
    console.log('[OTP Service] Initialized new instance');
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  store(identifier, otp, purpose = 'verification', expiresInMinutes = 10, additionalData = {}) {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    const token = this.generateToken();
    
    console.log(`[OTP Service] Storing OTP for ${purpose}:`, {
      token: token.substring(0, 8) + '...',
      identifier,
      otp,
      expiresAt: expiresAt.toISOString(),
      storeSize: this.otpStore.size
    });
    
    this.otpStore.set(token, {
      identifier,
      otp,
      purpose,
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
      ...additionalData
    });

    console.log(`[OTP Service] After storing - store size: ${this.otpStore.size}`);
    return token;
  }

  storePendingAction(token, actionData) {
    console.log(`[OTP Service] Storing pending action:`, {
      token: token.substring(0, 8) + '...',
      actionType: actionData.type,
      pendingActionsSize: this.pendingActions.size
    });
    
    this.pendingActions.set(token, {
      ...actionData,
      createdAt: new Date()
    });
    
    console.log(`[OTP Service] After storing action - pending actions size: ${this.pendingActions.size}`);
  }

  getPendingAction(token) {
    const action = this.pendingActions.get(token);
    console.log(`[OTP Service] Getting pending action:`, {
      token: token.substring(0, 8) + '...',
      found: !!action,
      actionType: action?.type
    });
    return action;
  }

  verify(token, otp) {
    console.log(`[OTP Service] Verifying OTP:`, {
      token: token ? token.substring(0, 8) + '...' : 'null',
      otp: otp ? otp.substring(0, 3) + '***' : 'null',
      storeSize: this.otpStore.size,
      pendingActionsSize: this.pendingActions.size
    });

    this.listStoredTokens();

    const stored = this.otpStore.get(token);
    
    if (!stored) {
      console.log(`[OTP Service] Token not found in store`);
      return { success: false, error: 'Invalid or expired OTP token' };
    }

    console.log(`[OTP Service] Found stored OTP:`, {
      purpose: stored.purpose,
      expiresAt: stored.expiresAt.toISOString(),
      attempts: stored.attempts,
      expired: new Date() > stored.expiresAt,
      createdAt: stored.createdAt.toISOString()
    });

    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(token);
      this.pendingActions.delete(token);
      console.log(`[OTP Service] OTP expired and removed`);
      return { success: false, error: 'OTP has expired' };
    }

    stored.attempts += 1;

    if (stored.attempts > 3) {
      this.otpStore.delete(token);
      this.pendingActions.delete(token);
      console.log(`[OTP Service] Too many attempts - removed`);
      return { success: false, error: 'Too many invalid attempts' };
    }

    if (stored.otp !== otp) {
      console.log(`[OTP Service] OTP mismatch: expected ${stored.otp}, got ${otp}`);
      return { success: false, error: 'Invalid OTP' };
    }

    const result = {
      success: true,
      identifier: stored.identifier,
      purpose: stored.purpose,
      data: stored
    };

    console.log(`[OTP Service] OTP verified successfully`);
    return result;
  }

  clearOTP(token) {
    console.log(`[OTP Service] Clearing OTP:`, {
      token: token ? token.substring(0, 8) + '...' : 'null'
    });
    
    const otpDeleted = this.otpStore.delete(token);
    const actionDeleted = this.pendingActions.delete(token);
    
    console.log(`[OTP Service] Cleared - OTP: ${otpDeleted}, Action: ${actionDeleted}`);
    console.log(`[OTP Service] After clearing - store size: ${this.otpStore.size}, actions: ${this.pendingActions.size}`);
  }

  invalidate(token) {
    return this.clearOTP(token);
  }

  listStoredTokens() {
    console.log(`[OTP Service] Currently stored tokens:`);
    let count = 0;
    for (const [token, data] of this.otpStore.entries()) {
      count++;
      console.log(`  ${count}. ${token.substring(0, 8)}... - ${data.purpose} - ${data.otp} - expires: ${data.expiresAt.toISOString()}`);
    }
    if (count === 0) {
      console.log(`  No tokens stored`);
    }
  }

  cleanup() {
    const now = new Date();
    let cleaned = 0;
    
    for (const [token, data] of this.otpStore.entries()) {
      if (now > data.expiresAt) {
        this.otpStore.delete(token);
        this.pendingActions.delete(token);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[OTP Service] Cleaned up ${cleaned} expired OTPs`);
    }
  }

  getStats() {
    return {
      otpCount: this.otpStore.size,
      pendingActionsCount: this.pendingActions.size,
      tokens: Array.from(this.otpStore.keys()).map(token => ({
        token: token.substring(0, 8) + '...',
        purpose: this.otpStore.get(token).purpose,
        expiresAt: this.otpStore.get(token).expiresAt
      }))
    };
  }
}

module.exports = new OTPService();



// const crypto = require('crypto');

// class OTPService {
//   constructor() {
//     this.otpStore = new Map();
//     this.pendingActions = new Map();
//     this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
//   }

//   generateOTP() {
//     return Math.floor(100000 + Math.random() * 900000).toString();
//   }

//   generateToken() {
//     return crypto.randomBytes(32).toString('hex');
//   }

//   store(identifier, otp, purpose = 'verification', expiresInMinutes = 10, additionalData = {}) {
//     const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
//     const token = this.generateToken();
    
//     console.log(`[OTP Service] Storing OTP for ${purpose}:`, {
//       token: token.substring(0, 8) + '...',
//       identifier,
//       otp,
//       expiresAt,
//       additionalData
//     });
    
//     this.otpStore.set(token, {
//       identifier,
//       otp,
//       purpose,
//       expiresAt,
//       attempts: 0,
//       ...additionalData
//     });

//     return token;
//   }

//   storePendingAction(token, actionData) {
//     console.log(`[OTP Service] Storing pending action:`, {
//       token: token.substring(0, 8) + '...',
//       actionData
//     });
//     this.pendingActions.set(token, actionData);
//   }

//   getPendingAction(token) {
//     const action = this.pendingActions.get(token);
//     console.log(`[OTP Service] Getting pending action:`, {
//       token: token.substring(0, 8) + '...',
//       found: !!action
//     });
//     return action;
//   }

//   verify(token, otp) {
//     console.log(`[OTP Service] Verifying OTP:`, {
//       token: token ? token.substring(0, 8) + '...' : 'null',
//       otp,
//       storeSize: this.otpStore.size
//     });

//     const stored = this.otpStore.get(token);
    
//     if (!stored) {
//       console.log(`[OTP Service] Token not found in store`);
//       return { success: false, error: 'Invalid or expired OTP token' };
//     }

//     console.log(`[OTP Service] Found stored OTP:`, {
//       purpose: stored.purpose,
//       expiresAt: stored.expiresAt,
//       attempts: stored.attempts,
//       expired: new Date() > stored.expiresAt
//     });

//     if (new Date() > stored.expiresAt) {
//       this.otpStore.delete(token);
//       this.pendingActions.delete(token);
//       console.log(`[OTP Service] OTP expired`);
//       return { success: false, error: 'OTP has expired' };
//     }

//     stored.attempts += 1;

//     if (stored.attempts > 3) {
//       this.otpStore.delete(token);
//       this.pendingActions.delete(token);
//       console.log(`[OTP Service] Too many attempts`);
//       return { success: false, error: 'Too many invalid attempts' };
//     }

//     if (stored.otp !== otp) {
//       console.log(`[OTP Service] OTP mismatch: expected ${stored.otp}, got ${otp}`);
//       return { success: false, error: 'Invalid OTP' };
//     }

//     const result = {
//       success: true,
//       identifier: stored.identifier,
//       purpose: stored.purpose,
//       data: stored
//     };

//     console.log(`[OTP Service] OTP verified successfully`);
//     return result;
//   }

//   clearOTP(token) {
//     console.log(`[OTP Service] Clearing OTP:`, {
//       token: token ? token.substring(0, 8) + '...' : 'null'
//     });
//     this.otpStore.delete(token);
//     this.pendingActions.delete(token);
//   }

//   invalidate(token) {
//     return this.clearOTP(token);
//   }

//   cleanup() {
//     const now = new Date();
//     let cleaned = 0;
    
//     for (const [token, data] of this.otpStore.entries()) {
//       if (now > data.expiresAt) {
//         this.otpStore.delete(token);
//         this.pendingActions.delete(token);
//         cleaned++;
//       }
//     }
    
//     if (cleaned > 0) {
//       console.log(`[OTP Service] Cleaned up ${cleaned} expired OTPs`);
//     }
//   }

//   getStats() {
//     return {
//       otpCount: this.otpStore.size,
//       pendingActionsCount: this.pendingActions.size
//     };
//   }
// }

// module.exports = new OTPService();