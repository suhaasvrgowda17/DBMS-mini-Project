const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const Booking = require('../models/Booking');
const Agent = require('../models/Agent');

// Landing / Home Page
router.get('/', (req, res) => {
  res.render('index', { 
    title: 'Welcome to TravelMate | Travel Agency',
    user: req.session.user || null 
  });
});

// Login / Register Page
router.get('/login', (req, res) => {
  // If already authenticated, redirect immediately to their respective dashboard
  if (req.session && req.session.user) {
    const user = req.session.user;
    if (user.role === 'admin') return res.redirect('/admin/dashboard');
    if (user.role === 'agent') return res.redirect('/agent/dashboard');
    if (user.role === 'customer') return res.redirect('/customer/dashboard');
  }
  res.render('login', { 
    title: 'Login & Register | TravelMate',
    user: null 
  });
});

// Admin Dashboard Screen
router.get('/admin/dashboard', requireAuth('admin'), async (req, res) => {
  try {
    const activeAgents = await Agent.getActive();
    res.render('admin_dashboard', {
      title: 'Admin Command Center | TravelMate',
      user: req.session.user,
      agentsList: activeAgents
    });
  } catch (error) {
    console.error('Web View Admin Dashboard Loading Error:', error);
    res.status(500).send('Error rendering administrative dashboard.');
  }
});

// Agent Dashboard Screen
router.get('/agent/dashboard', requireAuth('agent'), async (req, res) => {
  res.render('agent_dashboard', {
    title: 'Agent Workspace | TravelMate',
    user: req.session.user
  });
});

// Customer Dashboard Screen
router.get('/customer/dashboard', requireAuth('customer'), (req, res) => {
  res.render('customer_dashboard', {
    title: 'My Travel Planner | TravelMate',
    user: req.session.user
  });
});

// Premium Printable Travel Invoice
router.get('/invoice/:bookingId', requireAuth(['admin', 'agent', 'customer']), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.getById(bookingId);
    
    if (!booking) {
      return res.status(404).send('Invoice booking details not found.');
    }

    // Secure checking: Customers can only open their OWN invoices!
    const currentUser = req.session.user;
    if (currentUser.role === 'customer' && booking.customer_id !== currentUser.id) {
      return res.status(403).send('Access Denied. You do not own this invoice.');
    }

    // Agents can only open bookings assigned to them
    if (currentUser.role === 'agent' && booking.agent_id !== currentUser.id) {
      return res.status(403).send('Access Denied. You do not manage this booking invoice.');
    }

    res.render('invoice', {
      title: `Invoice #${booking.transaction_id || bookingId} | TravelMate`,
      booking: booking,
      user: currentUser
    });
  } catch (error) {
    console.error('Invoice Print Error:', error);
    res.status(500).send('Error compiling printable invoice.');
  }
});

module.exports = router;
