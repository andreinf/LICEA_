const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import database config
const { testConnection } = require('./config/database');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'LICEA Educational Platform API',
    version: '1.0.0'
  });
});

// Welcome message
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to LICEA Educational Platform API',
    version: '1.0.0',
    health: '/health'
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    await testConnection();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 LICEA Educational Platform API running on port ${PORT}`);
      console.log(`❤️  Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
