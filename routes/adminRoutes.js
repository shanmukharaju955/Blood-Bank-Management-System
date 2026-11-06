const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/authMiddleware');

// Admin Authentication
router.post('/login', adminController.login);
router.post('/logout', adminController.logout);
router.get('/me', adminController.getCurrentAdmin);

// Protected Admin Dashboard Analytics & Profile
router.get('/stats', requireAdmin, adminController.getDashboardStats);
router.put('/profile', requireAdmin, adminController.updateProfile);

module.exports = router;
