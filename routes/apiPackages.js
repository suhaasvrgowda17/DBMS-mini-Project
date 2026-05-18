const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');
const { requireAuth } = require('../middleware/authMiddleware');

// Get packages (Open to all authenticated roles for booking/viewing, and guests)
router.get('/', packageController.getPackages);

// Admin-only tour package modification endpoints
router.post('/', requireAuth('admin'), packageController.createPackage);
router.put('/:id', requireAuth('admin'), packageController.updatePackage);
router.delete('/:id', requireAuth('admin'), packageController.deletePackage);

module.exports = router;
