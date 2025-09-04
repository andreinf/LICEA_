const nodemailer = require('nodemailer');
require('dotenv').config();

// Create email transporter
const createTransporter = () => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email configuration missing. Email features will be disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

const transporter = createTransporter();

// Email templates
const emailTemplates = {
  verification: (name, token) => ({
    subject: 'LICEA - Verify Your Email Address',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">LICEA Educational Platform</h1>
          <p style="color: #666; margin: 10px 0 0 0;">Learning • Innovation • Collaboration • Excellence • Achievement</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 8px; border-left: 4px solid #2563eb;">
          <h2 style="color: #1e293b; margin-top: 0;">Welcome to LICEA, ${name}!</h2>
          
          <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
            Thank you for registering with LICEA Educational Platform. To get started, please verify your email address by clicking the button below.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}" 
               style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
            If the button above doesn't work, copy and paste the following link into your browser:
            <br>
            <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}" style="color: #2563eb; word-break: break-all;">
              ${process.env.FRONTEND_URL}/verify-email?token=${token}
            </a>
          </p>
          
          <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">
              This verification link will expire in 24 hours. If you didn't create an account with LICEA, please ignore this email.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
          <p>© ${new Date().getFullYear()} LICEA Educational Platform. All rights reserved.</p>
        </div>
      </div>
    `
  }),

  passwordReset: (name, token) => ({
    subject: 'LICEA - Password Reset Request',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">LICEA Educational Platform</h1>
          <p style="color: #666; margin: 10px 0 0 0;">Learning • Innovation • Collaboration • Excellence • Achievement</p>
        </div>
        
        <div style="background: #fef2f2; padding: 30px; border-radius: 8px; border-left: 4px solid #ef4444;">
          <h2 style="color: #b91c1c; margin-top: 0;">🔐 Password Reset Request</h2>
          
          <p style="color: #374151; line-height: 1.6;">
            Hi ${name},
          </p>
          
          <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
            We received a request to reset your password for your LICEA account. If you made this request, click the button below to reset your password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}" 
               style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
            If the button above doesn't work, copy and paste the following link into your browser:
            <br>
            <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}" style="color: #ef4444; word-break: break-all;">
              ${process.env.FRONTEND_URL}/reset-password?token=${token}
            </a>
          </p>
          
          <div style="border-top: 1px solid #fee2e2; margin-top: 30px; padding-top: 20px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              <strong>Security Note:</strong> This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
          <p>© ${new Date().getFullYear()} LICEA Educational Platform. All rights reserved.</p>
        </div>
      </div>
    `
  }),

  taskReminder: (studentName, taskTitle, courseName, dueDate) => ({
    subject: `LICEA - Assignment Reminder: ${taskTitle}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">LICEA Educational Platform</h1>
          <p style="color: #666; margin: 10px 0 0 0;">Learning • Innovation • Collaboration • Excellence • Achievement</p>
        </div>
        
        <div style="background: #fefce8; padding: 30px; border-radius: 8px; border-left: 4px solid #eab308;">
          <h2 style="color: #a16207; margin-top: 0;">📚 Assignment Reminder</h2>
          
          <p style="color: #374151; line-height: 1.6;">
            Hi ${studentName},
          </p>
          
          <p style="color: #374151; line-height: 1.6;">
            This is a friendly reminder that you have an assignment due soon:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #fde047;">
            <h3 style="color: #1e293b; margin-top: 0;">${taskTitle}</h3>
            <p style="color: #64748b; margin: 5px 0;"><strong>Course:</strong> ${courseName}</p>
            <p style="color: #dc2626; margin: 5px 0;"><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()} at ${new Date(dueDate).toLocaleTimeString()}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" 
               style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
            Don't wait until the last minute! Log in to your LICEA dashboard to work on your assignment.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
          <p>© ${new Date().getFullYear()} LICEA Educational Platform. All rights reserved.</p>
        </div>
      </div>
    `
  }),

  gradeNotification: (studentName, taskTitle, courseName, grade, feedback) => ({
    subject: `LICEA - Grade Available: ${taskTitle}`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">LICEA Educational Platform</h1>
          <p style="color: #666; margin: 10px 0 0 0;">Learning • Innovation • Collaboration • Excellence • Achievement</p>
        </div>
        
        <div style="background: #f0fdf4; padding: 30px; border-radius: 8px; border-left: 4px solid #16a34a;">
          <h2 style="color: #15803d; margin-top: 0;">🎉 Grade Available</h2>
          
          <p style="color: #374151; line-height: 1.6;">
            Hi ${studentName},
          </p>
          
          <p style="color: #374151; line-height: 1.6;">
            Great news! Your assignment has been graded:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #bbf7d0;">
            <h3 style="color: #1e293b; margin-top: 0;">${taskTitle}</h3>
            <p style="color: #64748b; margin: 5px 0;"><strong>Course:</strong> ${courseName}</p>
            <p style="color: #16a34a; margin: 5px 0; font-size: 18px;"><strong>Grade:</strong> ${grade}%</p>
            ${feedback ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;"><strong style="color: #374151;">Feedback:</strong><p style="color: #6b7280; font-style: italic; margin: 5px 0;">${feedback}</p></div>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" 
               style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Full Details
            </a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
          <p>© ${new Date().getFullYear()} LICEA Educational Platform. All rights reserved.</p>
        </div>
      </div>
    `
  })
};

// Send email function
async function sendEmail(to, template) {
  if (!transporter) {
    console.warn('Email transporter not configured. Email not sent.');
    return { success: false, message: 'Email service not configured' };
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'LICEA Educational Platform <noreply@licea.edu>',
      to,
      subject: template.subject,
      html: template.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
}

// Specific email functions
const sendVerificationEmail = async (email, name, token) => {
  const template = emailTemplates.verification(name, token);
  return await sendEmail(email, template);
};

const sendPasswordResetEmail = async (email, name, token) => {
  const template = emailTemplates.passwordReset(name, token);
  return await sendEmail(email, template);
};

const sendTaskReminderEmail = async (email, studentName, taskTitle, courseName, dueDate) => {
  const template = emailTemplates.taskReminder(studentName, taskTitle, courseName, dueDate);
  return await sendEmail(email, template);
};

const sendGradeNotificationEmail = async (email, studentName, taskTitle, courseName, grade, feedback = null) => {
  const template = emailTemplates.gradeNotification(studentName, taskTitle, courseName, grade, feedback);
  return await sendEmail(email, template);
};

// Test email configuration
const testEmailConfiguration = async () => {
  if (!transporter) {
    return { success: false, message: 'Email configuration missing' };
  }

  try {
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    console.error('❌ Email configuration test failed:', error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTaskReminderEmail,
  sendGradeNotificationEmail,
  testEmailConfiguration,
  sendEmail,
  emailTemplates
};
