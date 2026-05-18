const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/authMiddleware');

// Protect all admin endpoints
router.use(requireAuth('admin'));

// Admin Dashboard Analytics
router.get('/stats', adminController.getDashboardStats);

// Agent Profile Management
router.get('/agents', adminController.getAgents);
router.post('/agents', adminController.createAgent);
router.put('/agents/:id', adminController.updateAgent);
router.delete('/agents/:id', adminController.deleteAgent);

// Customer Management (Admin View)
router.get('/customers', adminController.getCustomers);
router.post('/customers', adminController.createCustomerByAdmin);
router.put('/customers/:id', adminController.updateCustomerByAdmin);
router.delete('/customers/:id', adminController.deleteCustomer);

// Bookings Ledger Management
router.get('/bookings', adminController.getBookings);
router.delete('/bookings/:id', adminController.deleteBookingByAdmin);

// Payments Ledger Audit Logs
router.get('/payments', adminController.getPayments);

// Discounts / Promo Codes
router.get('/discounts', adminController.getDiscounts);

// Administrators Directory
router.get('/administrators', adminController.getAdministrators);

module.exports = router;
