const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'LICEA Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Basic API endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    data: { test: true }
  });
});

// Auth endpoints for testing
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Demo authentication (in real implementation, check against database)
  if (email === 'admin@licea.edu' && password === 'admin123') {
    res.json({
      success: true,
      data: {
        user: {
          id: 1,
          name: 'Administrator',
          email: 'admin@licea.edu',
          role: 'admin'
        },
        token: 'demo-jwt-token-' + Date.now()
      },
      message: 'Login successful'
    });
  } else {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      }
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: Date.now(),
        name: req.body.name,
        email: req.body.email,
        role: req.body.role || 'student'
      }
    },
    message: 'Registration successful'
  });
});

app.get('/api/auth/me', (req, res) => {
  // Demo user info
  res.json({
    success: true,
    data: {
      id: 1,
      name: 'Administrator',
      email: 'admin@licea.edu',
      role: 'admin'
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple LICEA Backend running on port ${PORT}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
