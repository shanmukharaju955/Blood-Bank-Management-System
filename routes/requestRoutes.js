const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { requireAdmin } = require('../middleware/authMiddleware');
const { validateBloodRequest } = require('../middleware/validationMiddleware');

// Public request submission and tracking
router.post('/', validateBloodRequest, requestController.createRequest);
router.get('/track', requestController.trackRequest);

// List requests (Public/Admin filtered)
router.get('/', requestController.getAllRequests);

// Admin-only transactional operations
router.post('/:id/approve', requireAdmin, requestController.approveRequest);
router.post('/:id/reject', requireAdmin, requestController.rejectRequest);
router.post('/:id/fulfill', requireAdmin, requestController.fulfillRequest);

module.exports = router;
