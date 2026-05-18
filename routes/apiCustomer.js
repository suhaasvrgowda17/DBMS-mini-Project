const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { requireAuth } = require('../middleware/authMiddleware');

// Protect all customer endpoints
router.use(requireAuth('customer'));

// Customer Actions
router.get('/packages', customerController.getAvailablePackages);
router.get('/bookings', customerController.getBookingHistory);
router.post('/bookings', customerController.bookPackage);
router.post('/payment', customerController.processPayment);
router.put('/bookings/:id/cancel', customerController.cancelBooking);
router.get('/promo/validate', customerController.validatePromoCode);

module.exports = router;
