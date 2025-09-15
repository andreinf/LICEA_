const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { executeQuery, executeTransaction } = require('../config/database');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  verifyToken 
} = require('../middleware/auth');
const { APIError, asyncHandler } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');

const router = express.Router();

// Rate limiting configuration
const createLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max: process.env.NODE_ENV === 'production' ? max : max * 10,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development' && req.ip === '::1'
});

const authLimiter = createLimiter(15 * 60 * 1000, 5, 'Too many authentication attempts, please try again later.');
const passwordResetLimiter = createLimiter(60 * 60 * 1000, 3, 'Too many password reset attempts, please try again later.');

// Validation schemas
const validationSchemas = {
  register: [
    body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
    body('role').isIn(['student', 'instructor', 'admin']).withMessage('Invalid role'),
    body('privacyConsent').custom(value => value === true).withMessage('Privacy consent is required'),
    body('termsAccepted').custom(value => value === true).withMessage('Terms acceptance is required')
  ],
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  forgotPassword: [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address')
  ],
  resetPassword: [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must meet complexity requirements')
  ],
  refreshToken: [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ],
  verifyEmail: [
    body('token').notEmpty().withMessage('Verification token is required')
  ]
};

// Helper functions
const validateRequest = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new APIError('Validation failed', 400, 'VALIDATION_ERROR');
  }
};

const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

const generateToken = () => crypto.randomBytes(32).toString('hex');

const checkAccountLock = (user) => {
  if (user.locked_until && new Date() < new Date(user.locked_until)) {
    const lockoutMinutes = Math.ceil((new Date(user.locked_until) - new Date()) / (1000 * 60));
    throw new APIError(`Account is locked. Try again in ${lockoutMinutes} minutes.`, 423, 'ACCOUNT_LOCKED');
  }
};

const handleFailedLogin = async (user) => {
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION) || 15;
  const newFailedAttempts = user.failed_login_attempts + 1;
  
  const lockUntil = newFailedAttempts >= maxAttempts ? 
    new Date(Date.now() + lockoutDuration * 60 * 1000) : null;

  await executeQuery(
    'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
    [newFailedAttempts, lockUntil, user.id]
  );
};

const resetLoginAttempts = async (userId) => {
  await executeQuery(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?',
    [userId]
  );
};

// Routes
router.post('/register', authLimiter, validationSchemas.register, asyncHandler(async (req, res) => {
  validateRequest(req);
  const { name, email, password, role, privacyConsent, termsAccepted } = req.body;

  // Check if email exists
  const existingUsers = await executeQuery('SELECT id FROM users WHERE email = ?', [email]);
  if (existingUsers.length > 0) {
    throw new APIError('Email already registered', 409, 'EMAIL_EXISTS');
  }

  // Create user
  const passwordHash = await hashPassword(password);
  const verificationToken = generateToken();
  const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const queries = [{
    sql: `INSERT INTO users (name, email, password_hash, role, privacy_consent, terms_accepted) 
          VALUES (?, ?, ?, ?, ?, ?)`,
    params: [name, email, passwordHash, role, privacyConsent, termsAccepted]
  }];

  const results = await executeTransaction(queries);
  const userId = results[0].insertId;

  // Handle verification based on environment
  if (process.env.NODE_ENV === 'development') {
    await executeQuery('UPDATE users SET is_verified = true WHERE id = ?', [userId]);
    console.log(`🔓 Auto-verified user ${email} for development`);
  } else {
    await executeQuery(
      'INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, verificationToken, tokenExpiry]
    );
    
    try {
      await emailService.sendVerificationEmail(email, name, verificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }
  }

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please check your email to verify your account.',
    data: { userId, email, name, role }
  });
}));

router.post('/verify-email', validationSchemas.verifyEmail, asyncHandler(async (req, res) => {
  validateRequest(req);
  const { token } = req.body;

  const verifications = await executeQuery(
    `SELECT ev.*, u.email, u.name 
     FROM email_verifications ev
     JOIN users u ON ev.user_id = u.id
     WHERE ev.token = ? AND ev.expires_at > NOW()`,
    [token]
  );

  if (verifications.length === 0) {
    throw new APIError('Invalid or expired verification token', 400, 'INVALID_TOKEN');
  }

  const verification = verifications[0];
  const queries = [
    { sql: 'UPDATE users SET is_verified = true WHERE id = ?', params: [verification.user_id] },
    { sql: 'DELETE FROM email_verifications WHERE id = ?', params: [verification.id] }
  ];

  await executeTransaction(queries);

  res.json({
    success: true,
    message: 'Email verified successfully. You can now log in.'
  });
}));

router.post('/login', authLimiter, validationSchemas.login, asyncHandler(async (req, res) => {
  validateRequest(req);
  const { email, password } = req.body;

  const users = await executeQuery(
    `SELECT id, name, email, role, password_hash, is_verified, is_active, 
            failed_login_attempts, locked_until 
     FROM users WHERE email = ?`,
    [email]
  );

  if (users.length === 0) {
    throw new APIError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const user = users[0];
  
  // Security checks
  checkAccountLock(user);
  
  if (!user.is_active) {
    throw new APIError('Account is deactivated', 403, 'ACCOUNT_INACTIVE');
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    await handleFailedLogin(user);
    throw new APIError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.is_verified) {
    throw new APIError('Please verify your email address before logging in', 403, 'EMAIL_NOT_VERIFIED');
  }

  // Success - reset attempts and generate tokens
  await resetLoginAttempts(user.id);
  
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      tokens: { accessToken, refreshToken }
    }
  });
}));

router.post('/refresh', validationSchemas.refreshToken, asyncHandler(async (req, res) => {
  validateRequest(req);
  const { refreshToken } = req.body;

  try {
    const decoded = verifyRefreshToken(refreshToken);
    
    const users = await executeQuery(
      'SELECT id, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0 || !users[0].is_active) {
      throw new APIError('Invalid refresh token', 401, 'INVALID_TOKEN');
    }

    const user = users[0];
    const newAccessToken = generateAccessToken(user.id, user.role);

    res.json({
      success: true,
      data: { accessToken: newAccessToken }
    });
  } catch (error) {
    throw new APIError('Invalid refresh token', 401, 'INVALID_TOKEN');
  }
}));

router.post('/forgot-password', passwordResetLimiter, validationSchemas.forgotPassword, asyncHandler(async (req, res) => {
  validateRequest(req);
  const { email } = req.body;

  const users = await executeQuery(
    'SELECT id, name, email FROM users WHERE email = ? AND is_active = true',
    [email]
  );

  // Always return success to prevent email enumeration
  const successMessage = 'If the email exists in our system, you will receive password reset instructions.';
  
  if (users.length === 0) {
    return res.json({ success: true, message: successMessage });
  }

  const user = users[0];
  const resetToken = generateToken();
  const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Replace existing tokens
  await executeQuery('DELETE FROM password_resets WHERE user_id = ?', [user.id]);
  await executeQuery(
    'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
    [user.id, resetToken, tokenExpiry]
  );

  try {
    await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
  }

  res.json({ success: true, message: successMessage });
}));

router.post('/reset-password', authLimiter, validationSchemas.resetPassword, asyncHandler(async (req, res) => {
  validateRequest(req);
  const { token, password } = req.body;

  const resets = await executeQuery(
    `SELECT pr.*, u.id as user_id 
     FROM password_resets pr
     JOIN users u ON pr.user_id = u.id
     WHERE pr.token = ? AND pr.expires_at > NOW() AND pr.used = false AND u.is_active = true`,
    [token]
  );

  if (resets.length === 0) {
    throw new APIError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
  }

  const reset = resets[0];
  const passwordHash = await hashPassword(password);

  const queries = [
    { 
      sql: 'UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
      params: [passwordHash, reset.user_id]
    },
    { 
      sql: 'UPDATE password_resets SET used = true WHERE id = ?',
      params: [reset.id]
    }
  ];

  await executeTransaction(queries);

  res.json({
    success: true,
    message: 'Password reset successfully. You can now log in with your new password.'
  });
}));

router.post('/logout', verifyToken, asyncHandler(async (req, res) => {
  // In production, implement token blacklisting here
  res.json({ success: true, message: 'Logout successful' });
}));

router.get('/me', verifyToken, asyncHandler(async (req, res) => {
  const user = await executeQuery(
    `SELECT id, name, email, role, email_verified, registration_date, last_login
     FROM users WHERE id = ?`,
    [req.user.id]
  );

  if (user.length === 0) {
    throw new APIError('User not found', 404, 'USER_NOT_FOUND');
  }

  res.json({ success: true, data: user[0] });
}));

module.exports = router;