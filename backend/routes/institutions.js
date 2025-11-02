const express = require('express');
const { body, validationResult } = require('express-validator');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const { executeQuery } = require('../config/database');
const router = express.Router();

// Obtener todas las instituciones activas (público para registro)
router.get('/', asyncHandler(async (req, res) => {
  const institutions = await executeQuery(
    `SELECT id, name, code, type, city, country, logo_url 
     FROM institutions 
     WHERE is_active = TRUE 
     ORDER BY name ASC`
  );
  res.json({ success: true, data: institutions });
}));

// Obtener institución por ID
router.get('/:id', verifyToken, asyncHandler(async (req, res) => {
  const institutions = await executeQuery(
    'SELECT * FROM institutions WHERE id = ?',
    [req.params.id]
  );
  
  if (institutions.length === 0) {
    return res.status(404).json({ success: false, message: 'Institución no encontrada' });
  }
  
  res.json({ success: true, data: institutions[0] });
}));

// Crear nueva institución (admin only)
router.post('/',
  verifyToken,
  requireAdmin,
  [
    body('name').trim().notEmpty().withMessage('El nombre es requerido'),
    body('code').trim().notEmpty().withMessage('El código es requerido'),
    body('type').optional().trim(),
    body('city').optional().trim(),
    body('country').optional().trim().default('Colombia'),
    body('logo_url').optional().trim(),
    body('is_active').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError('Datos de validación inválidos', 400, 'VALIDATION_ERROR');
    }

    const { name, code, type, city, country, logo_url, is_active = true } = req.body;

    // Verificar si el código ya existe
    const existing = await executeQuery(
      'SELECT id FROM institutions WHERE code = ?',
      [code]
    );

    if (existing.length > 0) {
      throw new APIError('El código de institución ya existe', 409, 'CODE_EXISTS');
    }

    // Crear institución
    const result = await executeQuery(
      `INSERT INTO institutions (name, code, type, city, country, logo_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, code, type, city, country, logo_url, is_active]
    );

    // Obtener institución creada
    const newInstitution = await executeQuery(
      'SELECT * FROM institutions WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Institución creada exitosamente',
      data: newInstitution[0]
    });
  })
);

// Actualizar institución (admin only)
router.put('/:id',
  verifyToken,
  requireAdmin,
  [
    body('name').optional().trim().notEmpty(),
    body('code').optional().trim().notEmpty(),
    body('type').optional().trim(),
    body('city').optional().trim(),
    body('country').optional().trim(),
    body('logo_url').optional().trim(),
    body('is_active').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new APIError('Datos de validación inválidos', 400, 'VALIDATION_ERROR');
    }

    const { id } = req.params;
    const updates = req.body;

    // Verificar si existe
    const existing = await executeQuery(
      'SELECT id FROM institutions WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      throw new APIError('Institución no encontrada', 404, 'NOT_FOUND');
    }

    // Si se actualiza el código, verificar que no exista
    if (updates.code) {
      const codeCheck = await executeQuery(
        'SELECT id FROM institutions WHERE code = ? AND id != ?',
        [updates.code, id]
      );
      if (codeCheck.length > 0) {
        throw new APIError('El código ya está en uso', 409, 'CODE_EXISTS');
      }
    }

    // Construir query de actualización
    const updateFields = Object.keys(updates);
    if (updateFields.length === 0) {
      throw new APIError('No hay campos para actualizar', 400, 'NO_FIELDS');
    }

    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const values = updateFields.map(field => updates[field]);

    await executeQuery(
      `UPDATE institutions SET ${setClause}, updated_at = NOW() WHERE id = ?`,
      [...values, id]
    );

    // Obtener institución actualizada
    const updated = await executeQuery(
      'SELECT * FROM institutions WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Institución actualizada exitosamente',
      data: updated[0]
    });
  })
);

// Eliminar institución (admin only) - soft delete
router.delete('/:id',
  verifyToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Verificar si existe
    const existing = await executeQuery(
      'SELECT id FROM institutions WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      throw new APIError('Institución no encontrada', 404, 'NOT_FOUND');
    }

    // Verificar si hay usuarios asociados
    const users = await executeQuery(
      'SELECT COUNT(*) as count FROM users WHERE institution_id = ?',
      [id]
    );

    if (users[0].count > 0) {
      // Soft delete si hay usuarios
      await executeQuery(
        'UPDATE institutions SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
        [id]
      );
      res.json({
        success: true,
        message: 'Institución desactivada (tiene usuarios asociados)'
      });
    } else {
      // Hard delete si no hay usuarios
      await executeQuery('DELETE FROM institutions WHERE id = ?', [id]);
      res.json({
        success: true,
        message: 'Institución eliminada exitosamente'
      });
    }
  })
);

module.exports = router;
