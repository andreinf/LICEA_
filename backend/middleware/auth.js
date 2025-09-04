const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');
const { APIError } = require('./errorHandler');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new APIError('Access token required', 401, 'TOKEN_REQUIRED');
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is active
    const users = await executeQuery(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );
    
    if (users.length === 0) {
      throw new APIError('User not found', 404, 'USER_NOT_FOUND');
    }
    
    const user = users[0];
    
    if (!user.is_active) {
      throw new APIError('Account is inactive', 403, 'ACCOUNT_INACTIVE');
    }
    
    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new APIError('Invalid token', 401, 'INVALID_TOKEN'));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new APIError('Token expired', 401, 'TOKEN_EXPIRED'));
    }
    next(error);
  }
};

// Check if user has required role(s)
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new APIError('Authentication required', 401, 'AUTH_REQUIRED'));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new APIError(
        `Access denied. Required role: ${roles.join(' or ')}`, 
        403, 
        'INSUFFICIENT_PERMISSIONS'
      ));
    }
    
    next();
  };
};

// Check if user is admin
const requireAdmin = requireRole('admin');

// Check if user is instructor or admin
const requireInstructor = requireRole('instructor', 'admin');

// Check if user is the resource owner or has admin/instructor role
const requireOwnerOrRole = (resourceUserIdField = 'user_id', ...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new APIError('Authentication required', 401, 'AUTH_REQUIRED'));
    }
    
    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check if user has allowed role
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }
    
    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    if (resourceUserId && parseInt(resourceUserId) === req.user.id) {
      return next();
    }
    
    return next(new APIError(
      'Access denied. You can only access your own resources', 
      403, 
      'INSUFFICIENT_PERMISSIONS'
    ));
  };
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is active
    const users = await executeQuery(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );
    
    if (users.length > 0 && users[0].is_active) {
      req.user = users[0];
    }
    
    next();
  } catch (error) {
    // Ignore token errors in optional auth
    next();
  }
};

// Generate access token
const generateAccessToken = (userId, userRole) => {
  return jwt.sign(
    { 
      userId, 
      role: userRole,
      type: 'access'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { 
      userId,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

module.exports = {
  verifyToken,
  requireRole,
  requireAdmin,
  requireInstructor,
  requireOwnerOrRole,
  optionalAuth,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
};
