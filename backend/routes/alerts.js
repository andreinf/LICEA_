const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();

router.get('/', verifyToken, asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Alerts endpoint - Coming soon' });
}));

module.exports = router;
