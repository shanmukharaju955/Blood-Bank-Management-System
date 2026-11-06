const express = require('express');
const router = express.Router();
const donorController = require('../controllers/donorController');
const { requireAdmin } = require('../middleware/authMiddleware');
const { validateDonor } = require('../middleware/validationMiddleware');

// Public routes
router.get('/', donorController.getAllDonors);
router.get('/:id', donorController.getDonorById);
router.post('/', validateDonor, donorController.createDonor);

// Admin-only management routes
router.put('/:id', requireAdmin, validateDonor, donorController.updateDonor);
router.delete('/:id', requireAdmin, donorController.deleteDonor);

module.exports = router;
