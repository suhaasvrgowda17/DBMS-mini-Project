const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { requireAuth } = require('../middleware/authMiddleware');

// Protect all agent endpoints
router.use(requireAuth('agent'));

// Assigned Customer CRUD (Agent View)
router.get('/customers', agentController.getAssignedCustomers);
router.post('/customers', agentController.createCustomerByAgent);
router.put('/customers/:id', agentController.updateCustomerByAgent);
router.delete('/customers/:id', agentController.deleteCustomerByAgent);

// Booking Management
router.get('/bookings', agentController.getAgentBookings);
router.post('/bookings', agentController.createBookingByAgent);
router.put('/bookings/:id/status', agentController.updateBookingStatusByAgent);
router.delete('/bookings/:id', agentController.deleteBookingByAgent);

module.exports = router;
