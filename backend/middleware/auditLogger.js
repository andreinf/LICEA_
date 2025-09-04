const { executeQuery } = require('../config/database');

// Extract entity information from request
function extractEntityInfo(req) {
  const { method, path, params, body } = req;
  
  // Skip logging for certain paths
  const skipPaths = ['/health', '/api-docs', '/uploads'];
  if (skipPaths.some(skipPath => path.startsWith(skipPath))) {
    return null;
  }
  
  let entityType = null;
  let entityId = null;
  let action = null;
  
  // Parse route to determine entity type and action
  const pathParts = path.split('/').filter(Boolean);
  
  if (pathParts.length >= 2 && pathParts[0] === 'api') {
    entityType = pathParts[1];
    
    // Remove 's' from plural entity types
    if (entityType.endsWith('s') && entityType !== 'schedules') {
      entityType = entityType.slice(0, -1);
    }
    
    // Determine action based on method and path structure
    switch (method) {
      case 'POST':
        action = 'CREATE';
        break;
      case 'GET':
        action = pathParts.length > 2 && params.id ? 'READ' : 'LIST';
        break;
      case 'PUT':
      case 'PATCH':
        action = 'UPDATE';
        entityId = params.id;
        break;
      case 'DELETE':
        action = 'DELETE';
        entityId = params.id;
        break;
    }
    
    // Special cases for specific endpoints
    if (pathParts.includes('login')) {
      action = 'LOGIN';
      entityType = 'user';
    } else if (pathParts.includes('logout')) {
      action = 'LOGOUT';
      entityType = 'user';
    } else if (pathParts.includes('register')) {
      action = 'REGISTER';
      entityType = 'user';
    } else if (pathParts.includes('submit')) {
      action = 'SUBMIT';
      entityType = 'submission';
    } else if (pathParts.includes('grade')) {
      action = 'GRADE';
      entityType = 'submission';
    }
    
    // Extract entity ID from various sources
    if (!entityId) {
      entityId = params.id || params.userId || params.courseId || params.taskId || body.id;
    }
  }
  
  return { entityType, entityId, action };
}

// Audit logger middleware
const auditLogger = async (req, res, next) => {
  // Skip if not an API request or if it's a GET request (to avoid logging every read)
  if (!req.path.startsWith('/api') || req.method === 'GET') {
    return next();
  }
  
  const startTime = Date.now();
  const originalSend = res.send;
  let responseData = null;
  
  // Capture response data
  res.send = function(data) {
    responseData = data;
    return originalSend.call(this, data);
  };
  
  // Continue with the request
  res.on('finish', async () => {
    try {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Extract entity information
      const entityInfo = extractEntityInfo(req);
      if (!entityInfo) return;
      
      const { entityType, entityId, action } = entityInfo;
      
      // Only log significant actions
      const significantActions = [
        'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 
        'REGISTER', 'SUBMIT', 'GRADE', 'ENROLL', 'UPLOAD'
      ];
      
      if (!significantActions.includes(action)) {
        return;
      }
      
      // Prepare audit log entry
      const userId = req.user?.id || null;
      const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      // Get old values for UPDATE operations
      let oldValues = null;
      let newValues = null;
      
      if (action === 'UPDATE' && entityId) {
        // This would need to be implemented based on specific entity types
        // For now, we'll store the request body as new values
        newValues = JSON.stringify(req.body);
      } else if (action === 'CREATE') {
        newValues = JSON.stringify(req.body);
      }
      
      // Insert audit log
      await executeQuery(`
        INSERT INTO audit_logs (
          user_id, action, entity_type, entity_id, 
          old_values, new_values, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        action,
        entityType,
        entityId,
        oldValues,
        newValues,
        ipAddress,
        userAgent
      ]);
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Audit Log: ${action} ${entityType}${entityId ? ` (ID: ${entityId})` : ''} by user ${userId || 'anonymous'} - ${res.statusCode} in ${duration}ms`);
      }
      
    } catch (error) {
      // Don't fail the request if audit logging fails
      console.error('Audit logging error:', error.message);
    }
  });
  
  next();
};

// Function to get audit logs (for admin dashboard)
const getAuditLogs = async (filters = {}, page = 1, limit = 50) => {
  const { userId, action, entityType, startDate, endDate } = filters;
  
  let whereConditions = [];
  let params = [];
  
  if (userId) {
    whereConditions.push('al.user_id = ?');
    params.push(userId);
  }
  
  if (action) {
    whereConditions.push('al.action = ?');
    params.push(action);
  }
  
  if (entityType) {
    whereConditions.push('al.entity_type = ?');
    params.push(entityType);
  }
  
  if (startDate) {
    whereConditions.push('al.created_at >= ?');
    params.push(startDate);
  }
  
  if (endDate) {
    whereConditions.push('al.created_at <= ?');
    params.push(endDate);
  }
  
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
  const query = `
    SELECT 
      al.id,
      al.action,
      al.entity_type,
      al.entity_id,
      al.ip_address,
      al.created_at,
      u.name as user_name,
      u.email as user_email,
      u.role as user_role
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ${whereClause}
    ORDER BY al.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  const offset = (page - 1) * limit;
  params.push(limit, offset);
  
  const logs = await executeQuery(query, params);
  
  // Get total count
  const countQuery = `
    SELECT COUNT(*) as count 
    FROM audit_logs al 
    ${whereClause}
  `;
  
  const [countResult] = await executeQuery(countQuery, params.slice(0, -2));
  
  return {
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult.count,
      pages: Math.ceil(countResult.count / limit)
    }
  };
};

module.exports = { auditLogger, getAuditLogs };
