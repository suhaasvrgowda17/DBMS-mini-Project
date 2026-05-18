const db = require('../config/db');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Booking = require('../models/Booking');
const Package = require('../models/Package');
const Payment = require('../models/Payment');

// Get customers assigned to currently logged-in Agent
exports.getAssignedCustomers = async (req, res) => {
  try {
    const agentId = req.session.user.id;
    const customers = await Customer.getByAgentId(agentId);
    res.json({ success: true, data: customers });
  } catch (error) {
    console.error('Agent Assigned Customers Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve your customers.' });
  }
};

// Agent registers a new customer under their assignment (Transaction-driven)
exports.createCustomerByAgent = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const agentId = req.session.user.id;
    const { username, email, password, name, phone, address, passport_number } = req.body;

    if (!username || !email || !password || !name || !phone) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Phone number must contain exactly 10 digits.' });
    }

    await connection.beginTransaction();

    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }

    // 1. Create User login credentials in standalone customers table
    const insertId = await User.create(username, email, password, 'customer', connection);
    
    // 2. Populate customer details and assign to current agent in transaction
    await Customer.create(insertId, name, phone, address, passport_number, agentId, connection);

    await connection.commit();
    res.status(201).json({ success: true, message: 'Passenger registered and assigned to you successfully!' });
  } catch (error) {
    await connection.rollback();
    console.error('Agent Customer Creation Transaction Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create customer record.' });
  } finally {
    connection.release();
  }
};

// Update Customer Details (Agent View)
exports.updateCustomerByAgent = async (req, res) => {
  try {
    const agentId = req.session.user.id;
    const { id } = req.params;
    const { name, phone, address, passport_number } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone details are required.' });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Phone number must contain exactly 10 digits.' });
    }

    // Verify customer is assigned to this agent
    const customer = await Customer.getById(id);
    if (!customer || customer.assigned_agent_id !== agentId) {
      return res.status(403).json({ success: false, message: 'Access Denied. You do not manage this customer.' });
    }

    const updated = await Customer.update(id, name, phone, address, passport_number, agentId);
    if (updated) {
      res.json({ success: true, message: 'Customer details updated successfully!' });
    } else {
      res.status(404).json({ success: false, message: 'Customer record not found.' });
    }
  } catch (error) {
    console.error('Agent Update Customer Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update customer.' });
  }
};

// Agent deletes a customer managed by them (CRUD Customer by Agent)
exports.deleteCustomerByAgent = async (req, res) => {
  try {
    const agentId = req.session.user.id;
    const { id } = req.params;

    // Verify customer is managed by this agent
    const customer = await Customer.getById(id);
    if (!customer || customer.assigned_agent_id !== agentId) {
      return res.status(403).json({ success: false, message: 'Access Denied. You do not manage this customer.' });
    }

    const deleted = await Customer.delete(id);
    if (deleted) {
      res.json({ success: true, message: 'Customer record successfully deleted.' });
    } else {
      res.status(404).json({ success: false, message: 'Customer record not found.' });
    }
  } catch (error) {
    console.error('Agent Delete Customer Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete customer.' });
  }
};

// Get Bookings managed by currently logged-in Agent
exports.getAgentBookings = async (req, res) => {
  try {
    const agentId = req.session.user.id;
    const bookings = await Booking.getByAgentId(agentId);
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Agent Get Bookings Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve bookings.' });
  }
};

// Agent creates a booking for their customer (DBMS Transaction Concept)
exports.createBookingByAgent = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const agentId = req.session.user.id;
    const { customer_id, package_id, travel_date, number_of_travelers } = req.body;

    if (!customer_id || !package_id || !travel_date || !number_of_travelers) {
      return res.status(400).json({ success: false, message: 'Please enter booking details.' });
    }

    // Verify customer is managed by this agent
    const customer = await Customer.getById(customer_id);
    if (!customer || customer.assigned_agent_id !== agentId) {
      return res.status(403).json({ success: false, message: 'Access Denied. You can only create bookings for your assigned customers.' });
    }

    // Fetch Package to calculate pricing
    const pack = await Package.getById(package_id);
    if (!pack) {
      return res.status(404).json({ success: false, message: 'Tour Package not found.' });
    }

    const totalPrice = pack.price * parseInt(number_of_travelers);

    // Start database transaction to ensure booking + payment are atomic
    await connection.beginTransaction();

    // 1. Create Booking
    const bookingId = await Booking.create(
      customer_id, 
      package_id, 
      agentId, 
      travel_date, 
      number_of_travelers, 
      totalPrice, 
      connection
    );

    // 2. Generate a pending transaction invoice in payments
    const transactionId = 'TXN-' + Math.floor(100000000 + Math.random() * 900000000);
    await Payment.create(
      bookingId,
      customer_id,
      totalPrice,
      'Bank Transfer',
      transactionId,
      'pending',
      connection
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Booking placed successfully! Initial pending invoice has been generated.',
      bookingId: bookingId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Agent Create Booking Transaction Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create booking due to transaction error.' });
  } finally {
    connection.release();
  }
};

// Agent updates booking status (e.g. Confirming / Cancelling Booking and payments)
exports.updateBookingStatusByAgent = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const agentId = req.session.user.id;
    const { id } = req.params;
    const { status } = req.body; // 'pending', 'confirmed', 'cancelled'

    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid booking status.' });
    }

    // Verify booking is managed by this agent
    const booking = await Booking.getById(id);
    if (!booking || booking.agent_id !== agentId) {
      return res.status(403).json({ success: false, message: 'Access Denied. You do not manage this booking.' });
    }

    await connection.beginTransaction();

    // Update Booking status
    await connection.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);

    // Synchronize payment status accordingly
    let paymentStatus = 'pending';
    if (status === 'confirmed') paymentStatus = 'completed';
    if (status === 'cancelled') paymentStatus = 'refunded';

    await connection.execute('UPDATE payments SET status = ? WHERE booking_id = ?', [paymentStatus, id]);

    await connection.commit();
    res.json({ success: true, message: `Booking and payment updated to '${status}' successfully!` });
  } catch (error) {
    await connection.rollback();
    console.error('Agent Update Booking Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update booking status.' });
  } finally {
    connection.release();
  }
};

// Cancel/Delete Booking (Agent View)
exports.deleteBookingByAgent = async (req, res) => {
  try {
    const agentId = req.session.user.id;
    const { id } = req.params;

    const booking = await Booking.getById(id);
    if (!booking || booking.agent_id !== agentId) {
      return res.status(403).json({ success: false, message: 'Access Denied. You do not manage this booking.' });
    }

    const cancelled = await Booking.delete(id);
    if (cancelled) {
      res.json({ success: true, message: 'Booking and billing invoice deleted successfully.' });
    } else {
      res.status(404).json({ success: false, message: 'Booking not found.' });
    }
  } catch (error) {
    console.error('Agent Cancel Booking Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete booking.' });
  }
};
