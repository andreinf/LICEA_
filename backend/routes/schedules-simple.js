const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Ruta schedules-simple funcionando correctamente' });
});

module.exports = router;
