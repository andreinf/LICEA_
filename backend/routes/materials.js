const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();

// Materials routes - Basic structure
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Materials endpoint - Coming soon' });
}));

module.exports = router;
