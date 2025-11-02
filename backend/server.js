const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Import database config
const { testConnection } = require('./config/database');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
// const { auditLogger } = require('./middleware/auditLogger'); // comentado temporalmente

// Import routes - usando versiones simples sin problemas ESM
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const coursesApiRoutes = require('./routes/courses-api');
const gradesApiRoutes = require('./routes/grades-api');
const schedulesApiRoutes = require('./routes/schedules-api');
// const materialRoutes = require('./routes/materials');
const taskRoutes = require('./routes/tasks');
const submissionRoutes = require('./routes/submissions');
const groupRoutes = require('./routes/groups');
const attendanceRoutes = require('./routes/attendance');
// const alertRoutes = require('./routes/alerts');
// const reportRoutes = require('./routes/reports');
const chatRoutes = require('./routes/chat');
const aiAssistantRoutes = require('./routes/ai-assistant');
const notificationRoutes = require('./routes/notifications');
const institutionRoutes = require('./routes/institutions');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting (development only)
if (process.env.NODE_ENV === 'development') {
  app.set('trust proxy', 1);
}

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LICEA Educational Platform API',
      version: '1.0.0',
      description: 'Complete educational platform API with user management, courses, assignments, and AI features',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js'], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
}));

// Rate limiting (más permisivo en desarrollo)
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 1) * 60 * 1000, // 1 minuto
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 1000, // 1000 requests por minuto en desarrollo
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  skip: (req) => {
    // En desarrollo, ser más permisivo
    return process.env.NODE_ENV === 'development';
  }
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Audit logging middleware
// app.use(auditLogger); // comentado temporalmente

// API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'LICEA Educational Platform API',
    version: '1.0.0'
  });
});

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// API routes - habilitando rutas simples funcionando
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', coursesApiRoutes);
app.use('/api/grades', gradesApiRoutes);
app.use('/api/schedules', schedulesApiRoutes);
// app.use('/api/materials', materialRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/attendance', attendanceRoutes);
// app.use('/api/alerts', alertRoutes);
// app.use('/api/reports', reportRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai-assistant', aiAssistantRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/institutions', institutionRoutes);

// Welcome message
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to LICEA Educational Platform API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.method} ${req.path} was not found.`
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Test database connection
    await testConnection();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 LICEA Educational Platform API running on port ${PORT}`);
      console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
      console.log(`❤️  Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
