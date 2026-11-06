const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { requireAdmin } = require('../middleware/authMiddleware');
const { validateStock } = require('../middleware/validationMiddleware');

// Public read routes
router.get('/', stockController.getAllStock);
router.get('/summary', stockController.getStockSummary);

// Admin-only mutation routes
router.post('/', requireAdmin, validateStock, stockController.addStockBatch);
router.put('/:id', requireAdmin, validateStock, stockController.updateStockBatch);
router.delete('/:id', requireAdmin, stockController.deleteStockBatch);

module.exports = router;
