const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

// Authentication Routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/logout', authController.logout);

// Profile Management Routes (authenticated)
router.get('/profile', requireAuth(), authController.getProfile);
router.put('/profile', requireAuth(), authController.updateProfile);

module.exports = router;
