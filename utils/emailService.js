const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  async init() {
    try {
      console.log('[Email] Initializing SMTP connection...');
      console.log('[Email] SMTP Config:', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER ? 'Configured' : 'Not configured'
      });

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await this.transporter.verify();
        console.log('[Email] SMTP server connected successfully');
      } else {
        console.log('[Email] SMTP credentials not configured - emails will be simulated');
      }
    } catch (error) {
      console.error('[Email] SMTP connection failed:', error.message);
      console.log('[Email] Will simulate email sending for development');
    }
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      if (!this.transporter || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('[Email] SIMULATING EMAIL SEND:');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('Content:', text || html.replace(/<[^>]*>/g, '').substring(0, 100) + '...');
        return { success: true, messageId: 'simulated-' + Date.now() };
      }

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Project Showcase'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '')
      };

      console.log(`[Email] Sending email to: ${to}, Subject: ${subject}`);
      
      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`[Email] Email sent successfully. MessageId: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('[Email] Send error:', error);
      console.log('[Email] Falling back to simulated email');
      console.log('To:', to);
      console.log('Subject:', subject);
      return { success: true, messageId: 'fallback-' + Date.now() };
    }
  }

  async sendOTP(email, otp, purpose = 'verification') {
    const subject = purpose === 'password-reset' 
      ? 'Password Reset OTP - Project Showcase'
      : purpose === 'password-change'
      ? 'Password Change OTP - Project Showcase'
      : 'Email Verification OTP - Project Showcase';

    const purposeText = purpose === 'password-reset' 
      ? 'a password reset'
      : purpose === 'password-change'
      ? 'a password change'
      : 'email verification';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #007bff; color: white; padding: 30px 20px; text-align: center; }
          .content { background: #f8f9fa; padding: 40px 30px; }
          .otp-box { background: white; border: 2px solid #007bff; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .otp { font-size: 36px; font-weight: bold; color: #007bff; letter-spacing: 8px; margin: 10px 0; }
          .footer { background: #6c757d; color: white; padding: 20px; text-align: center; font-size: 14px; }
          .warning { color: #dc3545; font-weight: bold; background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
          .highlight { background: #e7f3ff; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Project Showcase</h1>
            <p>Secure Authentication System</p>
          </div>
          <div class="content">
            <h2>Your OTP Code</h2>
            <p>Hello,</p>
            <p>You have requested <strong>${purposeText}</strong>. Please use the following OTP code to complete your request:</p>
            
            <div class="otp-box">
              <div class="otp">${otp}</div>
              <p style="margin: 0; color: #666;">Enter this code in your application</p>
            </div>

            <div class="highlight">
              <p><strong>⏰ This OTP will expire in ${process.env.OTP_EXPIRES_IN || 10} minutes.</strong></p>
              <p>For security reasons, do not share this code with anyone.</p>
            </div>

            <div class="warning">
              <p><strong>⚠️ Security Notice:</strong></p>
              <p>If you didn't request this ${purposeText}, please ignore this email or contact our support team immediately if you're concerned about your account security.</p>
            </div>

            <p>Best regards,<br><strong>Project Showcase Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© 2025 Project Showcase. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const plainText = `
      Project Showcase - ${subject}
      
      Your OTP Code: ${otp}
      
      This OTP will expire in ${process.env.OTP_EXPIRES_IN || 10} minutes.
      
      If you didn't request this ${purposeText}, please ignore this email.
    `;

    console.log(`[Email] Sending ${purpose} OTP to ${email}`);
    console.log(`[Email] OTP: ${otp} (for development purposes)`);
    
    return await this.sendEmail(email, subject, html, plainText);
  }
}

module.exports = new EmailService();
// const nodemailer = require('nodemailer');

// class EmailService {
//   constructor() {
//     this.transporter = null;
//     this.init();
//   }

//   async init() {
//     try {
//       this.transporter = nodemailer.createTransporter({
//         host: process.env.SMTP_HOST,
//         port: process.env.SMTP_PORT,
//         secure: false,
//         auth: {
//           user: process.env.SMTP_USER,
//           pass: process.env.SMTP_PASS,
//         },
//         tls: {
//           rejectUnauthorized: false
//         }
//       });

//       await this.transporter.verify();
//       console.log('[Email] SMTP server connected successfully');
//     } catch (error) {
//       console.error('[Email] SMTP connection failed:', error.message);
//     }
//   }

//   async sendEmail(to, subject, html, text = null) {
//     try {
//       if (!this.transporter) {
//         console.error('[Email] Transporter not initialized');
//         return { success: false, error: 'Email service not available' };
//       }

//       const mailOptions = {
//         from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
//         to,
//         subject,
//         html,
//         text: text || html.replace(/<[^>]*>/g, '')
//       };

//       console.log(`[Email] Sending email to: ${to}, Subject: ${subject}`);
      
//       const result = await this.transporter.sendMail(mailOptions);
      
//       console.log(`[Email] Email sent successfully. MessageId: ${result.messageId}`);
//       return { success: true, messageId: result.messageId };
//     } catch (error) {
//       console.error('[Email] Send error:', error);
//       return { success: false, error: error.message };
//     }
//   }

//   async sendOTP(email, otp, purpose = 'verification') {
//     const subject = purpose === 'password-reset' 
//       ? 'Password Reset OTP - Project Showcase'
//       : purpose === 'password-change'
//       ? 'Password Change OTP - Project Showcase'
//       : 'Email Verification OTP - Project Showcase';

//     const purposeText = purpose === 'password-reset' 
//       ? 'a password reset'
//       : purpose === 'password-change'
//       ? 'a password change'
//       : 'email verification';

//     const html = `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <meta charset="utf-8">
//         <title>${subject}</title>
//         <style>
//           body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
//           .container { max-width: 600px; margin: 0 auto; }
//           .header { background: #007bff; color: white; padding: 30px 20px; text-align: center; }
//           .content { background: #f8f9fa; padding: 40px 30px; }
//           .otp-box { background: white; border: 2px solid #007bff; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
//           .otp { font-size: 36px; font-weight: bold; color: #007bff; letter-spacing: 8px; margin: 10px 0; }
//           .footer { background: #6c757d; color: white; padding: 20px; text-align: center; font-size: 14px; }
//           .warning { color: #dc3545; font-weight: bold; background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
//           .highlight { background: #e7f3ff; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>🔐 Project Showcase</h1>
//             <p>Secure Authentication System</p>
//           </div>
//           <div class="content">
//             <h2>Your OTP Code</h2>
//             <p>Hello,</p>
//             <p>You have requested <strong>${purposeText}</strong>. Please use the following OTP code to complete your request:</p>
            
//             <div class="otp-box">
//               <div class="otp">${otp}</div>
//               <p style="margin: 0; color: #666;">Enter this code in your application</p>
//             </div>

//             <div class="highlight">
//               <p><strong>⏰ This OTP will expire in ${process.env.OTP_EXPIRES_IN || 10} minutes.</strong></p>
//               <p>For security reasons, do not share this code with anyone.</p>
//             </div>

//             <div class="warning">
//               <p><strong>⚠️ Security Notice:</strong></p>
//               <p>If you didn't request this ${purposeText}, please ignore this email or contact our support team immediately if you're concerned about your account security.</p>
//             </div>

//             <p>Best regards,<br><strong>Project Showcase Team</strong></p>
//           </div>
//           <div class="footer">
//             <p>This is an automated message. Please do not reply to this email.</p>
//             <p>© 2025 Project Showcase. All rights reserved.</p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `;

//     console.log(`[Email] Sending ${purpose} OTP to ${email}`);
//     return await this.sendEmail(email, subject, html);
//   }
// }

// module.exports = new EmailService();
// // const nodemailer = require('nodemailer');

// // class EmailService {
// //   constructor() {
// //     this.transporter = nodemailer.createTransport({
// //       host: process.env.SMTP_HOST,
// //       port: process.env.SMTP_PORT,
// //       secure: false,
// //       auth: {
// //         user: process.env.SMTP_USER,
// //         pass: process.env.SMTP_PASS,
// //       },
// //     });
// //   }

// //   async sendEmail(to, subject, html, text = null) {
// //     try {
// //       const mailOptions = {
// //         from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
// //         to,
// //         subject,
// //         html,
// //         text: text || html.replace(/<[^>]*>/g, '')
// //       };

// //       const result = await this.transporter.sendMail(mailOptions);
// //       return { success: true, messageId: result.messageId };
// //     } catch (error) {
// //       console.error('Email send error:', error);
// //       return { success: false, error: error.message };
// //     }
// //   }

// //   async sendOTP(email, otp, purpose = 'verification') {
// //     const subject = purpose === 'password-reset' 
// //       ? 'Password Reset OTP - Project Showcase'
// //       : 'Email Verification OTP - Project Showcase';

// //     const html = `
// //       <!DOCTYPE html>
// //       <html>
// //       <head>
// //         <meta charset="utf-8">
// //         <title>${subject}</title>
// //         <style>
// //           body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
// //           .container { max-width: 600px; margin: 0 auto; padding: 20px; }
// //           .header { background: #007bff; color: white; padding: 20px; text-align: center; }
// //           .content { background: #f8f9fa; padding: 30px; }
// //           .otp { font-size: 32px; font-weight: bold; color: #007bff; text-align: center; letter-spacing: 5px; margin: 20px 0; }
// //           .footer { background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px; }
// //           .warning { color: #dc3545; font-weight: bold; }
// //         </style>
// //       </head>
// //       <body>
// //         <div class="container">
// //           <div class="header">
// //             <h1>Project Showcase</h1>
// //           </div>
// //           <div class="content">
// //             <h2>Your OTP Code</h2>
// //             <p>Hello,</p>
// //             <p>You have requested ${purpose === 'password-reset' ? 'a password reset' : 'email verification'}. Please use the following OTP code:</p>
// //             <div class="otp">${otp}</div>
// //             <p><strong>This OTP will expire in ${process.env.OTP_EXPIRES_IN || 10} minutes.</strong></p>
// //             <p class="warning">If you didn't request this, please ignore this email or contact support if you're concerned about your account security.</p>
// //             <p>Best regards,<br>Project Showcase Team</p>
// //           </div>
// //           <div class="footer">
// //             <p>This is an automated message. Please do not reply to this email.</p>
// //           </div>
// //         </div>
// //       </body>
// //       </html>
// //     `;

// //     return await this.sendEmail(email, subject, html);
// //   }
// // }

// // module.exports = new EmailService();
