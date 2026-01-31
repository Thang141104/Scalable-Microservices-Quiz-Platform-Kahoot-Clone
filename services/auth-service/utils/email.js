const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send OTP email
const sendOTPEmail = async (email, otp, username) => {
  try {
    const mailOptions = {
      from: `"Quiz App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - Quiz Application',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-code { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Quiz Application</h1>
              <p>Email Verification</p>
            </div>
            <div class="content">
              <h2>Hello ${username}!</h2>
              <p>Thank you for registering with Quiz App. To complete your registration, please verify your email address.</p>
              
              <p>Your verification code is:</p>
              <div class="otp-code">${otp}</div>
              
              <div class="warning">
                ⚠️ This code will expire in <strong>10 minutes</strong>
              </div>
              
              <p>If you didn't request this verification code, please ignore this email.</p>
              
              <p>Best regards,<br>Quiz App Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>&copy; 2025 Quiz Application. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    throw new Error('Failed to send verification email');
  }
};

// Send welcome email after verification
const sendWelcomeEmail = async (email, username) => {
  try {
    const mailOptions = {
      from: `"Quiz App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Quiz Application! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .features { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .feature-item { margin: 10px 0; padding-left: 25px; position: relative; }
            .feature-item:before { content: "✓"; position: absolute; left: 0; color: #667eea; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Quiz App!</h1>
            </div>
            <div class="content">
              <h2>Hi ${username}!</h2>
              <p>Your account has been successfully verified. You're now ready to create amazing quizzes!</p>
              
              <div class="features">
                <h3>What you can do:</h3>
                <div class="feature-item">Create interactive quizzes</div>
                <div class="feature-item">Host live game sessions</div>
                <div class="feature-item">Track player performance</div>
                <div class="feature-item">View detailed analytics</div>
              </div>
              
              <center>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3006'}" class="button">Start Creating Quizzes</a>
              </center>
              
              <p>If you have any questions, feel free to reach out to our support team.</p>
              
              <p>Happy quizzing!<br>Quiz App Team</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent');
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
  }
};

module.exports = { sendOTPEmail, sendWelcomeEmail };
