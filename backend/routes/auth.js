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

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset attempts per hour
  message: {
    error: 'Too many password reset attempts, please try again later.',
  },
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *               - privacyConsent
 *               - termsAccepted
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePassword123!
 *               role:
 *                 type: string
 *                 enum: [student, instructor, admin]
 *                 example: student
 *               privacyConsent:
 *                 type: boolean
 *                 example: true
 *               termsAccepted:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
router.post('/register', 
  authLimiter,
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Name must be between 2 and 255 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('role')
      .isIn(['student', 'instructor', 'admin'])
      .withMessage('Role must be student, instructor, or admin'),
    body('privacyConsent')
      .isBoolean()
      .custom(value => value === true)
      .withMessage('Privacy consent is required'),
    body('termsAccepted')
      .isBoolean()
      .custom(value => value === true)
      .withMessage('Terms acceptance is required')
  ],
  asyncHandler(async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError('Validation failed', 400, 'VALIDATION_ERROR');
    }

    const { name, email, password, role, privacyConsent, termsAccepted } = req.body;

    // Check if email already exists
    const existingUsers = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      throw new APIError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user and verification token in transaction
    const queries = [
      {
        sql: `INSERT INTO users (name, email, password_hash, role, privacy_consent, terms_accepted) 
              VALUES (?, ?, ?, ?, ?, ?)`,
        params: [name, email, passwordHash, role, privacyConsent, termsAccepted]
      }
    ];

    const results = await executeTransaction(queries);
    const userId = results[0].insertId;

    // Insert email verification token
    await executeQuery(
      'INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, verificationToken, tokenExpiry]
    );

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, name, verificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email sending fails
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      data: {
        userId,
        email,
        name,
        role
      }
    });
  })
);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify user email address
 *     tags: [Authentication]
 */
router.post('/verify-email',
  [
    body('token')
      .notEmpty()
      .withMessage('Verification token is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError('Validation failed', 400, 'VALIDATION_ERROR');
    }

    const { token } = req.body;

    // Find verification token
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

    // Update user as verified and delete verification token
    const queries = [
      {
        sql: 'UPDATE users SET email_verified = true WHERE id = ?',
        params: [verification.user_id]
      },
      {
        sql: 'DELETE FROM email_verifications WHERE id = ?',
        params: [verification.id]
      }
    ];

    await executeTransaction(queries);

    res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });
  })
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 */
router.post('/login',
  authLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError('Validation failed', 400, 'VALIDATION_ERROR');
    }

    const { email, password } = req.body;

    // Get user with password
    const users = await executeQuery(
      `SELECT id, name, email, role, password_hash, email_verified, is_active, 
              failed_login_attempts, locked_until 
       FROM users WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      throw new APIError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const user = users[0];

    // Check if account is locked
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      const lockoutMinutes = Math.ceil((new Date(user.locked_until) - new Date()) / (1000 * 60));
      throw new APIError(
        `Account is locked. Try again in ${lockoutMinutes} minutes.`,
        423,
        'ACCOUNT_LOCKED'
      );
    }

    // Check if account is active
    if (!user.is_active) {
      throw new APIError('Account is deactivated', 403, 'ACCOUNT_INACTIVE');
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      // Increment failed login attempts
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
      const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION) || 15;
      const newFailedAttempts = user.failed_login_attempts + 1;
      
      let lockUntil = null;
      if (newFailedAttempts >= maxAttempts) {
        lockUntil = new Date(Date.now() + lockoutDuration * 60 * 1000);
      }

      await executeQuery(
        'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
        [newFailedAttempts, lockUntil, user.id]
      );

      throw new APIError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Check email verification
    if (!user.email_verified) {
      throw new APIError('Please verify your email address before logging in', 403, 'EMAIL_NOT_VERIFIED');
    }

    // Reset failed login attempts and update last login
    await executeQuery(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  })
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 */
router.post('/refresh',
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError('Validation failed', 400, 'VALIDATION_ERROR');
    }

    const { refreshToken } = req.body;

    try {
      const decoded = verifyRefreshToken(refreshToken);
      
      // Check if user still exists and is active
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
        data: {
          accessToken: newAccessToken
        }
      });
    } catch (error) {
      throw new APIError('Invalid refresh token', 401, 'INVALID_TOKEN');
    }
  })
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 */
router.post('/forgot-password',
  passwordResetLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError('Validation failed', 400, 'VALIDATION_ERROR');
    }

    const { email } = req.body;

    // Check if user exists
    const users = await executeQuery(
      'SELECT id, name, email FROM users WHERE email = ? AND is_active = true',
      [email]
    );

    // Always return success to prevent email enumeration
    if (users.length === 0) {
      return res.json({
        success: true,
        message: 'If the email exists in our system, you will receive password reset instructions.'
      });
    }

    const user = users[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing password reset tokens for this user
    await executeQuery(
      'DELETE FROM password_resets WHERE user_id = ?',
      [user.id]
    );

    // Insert new password reset token
    await executeQuery(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, resetToken, tokenExpiry]
    );

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Don't expose email sending errors
    }

    res.json({
      success: true,
      message: 'If the email exists in our system, you will receive password reset instructions.'
    });
  })
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 */
router.post('/reset-password',
  authLimiter,
  [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError('Validation failed', 400, 'VALIDATION_ERROR');
    }

    const { token, password } = req.body;

    // Find valid reset token
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

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update password and mark token as used
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
  })
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.post('/logout',
  verifyToken,
  asyncHandler(async (req, res) => {
    // In a more sophisticated implementation, you would:
    // 1. Add the token to a blacklist/revocation list
    // 2. Store blacklisted tokens in Redis or database
    // 3. Check blacklist in the auth middleware
    
    // For now, we'll just respond with success
    // The client should delete the stored tokens
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  })
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me',
  verifyToken,
  asyncHandler(async (req, res) => {
    const user = await executeQuery(
      `SELECT id, name, email, role, email_verified, registration_date, last_login
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (user.length === 0) {
      throw new APIError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: user[0]
    });
  })
);

module.exports = router;
