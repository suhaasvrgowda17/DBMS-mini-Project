const db = require('../config/db');
const User = require('../models/User');
const Agent = require('../models/Agent');
const Customer = require('../models/Customer');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Discount = require('../models/Discount');

// Get high-level Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const stats = await Booking.getStats();
    
    // Get recent bookings for analytics
    const bookings = await Booking.getAll();
    const recentBookings = bookings.slice(0, 5);

    // Get recent payments
    const payments = await Payment.getAll();
    const recentPayments = payments.slice(0, 5);

    res.json({
      success: true,
      stats: {
        totalRevenue: stats.totalRevenue || 0,
        totalBookings: stats.totalBookings || 0,
        activePackages: stats.activePackages || 0,
        totalAgents: stats.totalAgents || 0
      },
      recentBookings,
      recentPayments
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve stats.' });
  }
};

// --- AGENT CRUD CONTROLLERS ---

exports.getAgents = async (req, res) => {
  try {
    const agents = await Agent.getAll();
    res.json({ success: true, data: agents });
  } catch (error) {
    console.error('Get Agents Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve agent records.' });
  }
};

exports.createAgent = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { username, email, password, name, phone, agency_commission, status } = req.body;

    if (!username || !email || !password || !name || !phone) {
      return res.status(400).json({ success: false, message: 'Missing required credentials.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Phone number must contain exactly 10 digits.' });
    }

    await connection.beginTransaction();

    // Check pre-existing username/email across separate tables
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }

    // 1. Create agent entry (hashes password automatically)
    const insertId = await User.create(username, email, password, 'agent', connection);
    
    // 2. Populate detailed agent info in the same transaction
    await Agent.create(insertId, name, phone, agency_commission || 10.00, status || 'active', connection);

    await connection.commit();
    res.status(201).json({ success: true, message: 'Agent registered successfully!' });
  } catch (error) {
    await connection.rollback();
    console.error('Create Agent Transaction Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create agent.' });
  } finally {
    connection.release();
  }
};

exports.updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, agency_commission, status } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and Phone are required.' });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Phone number must contain exactly 10 digits.' });
    }

    const updated = await Agent.update(id, name, phone, agency_commission, status);
    if (updated) {
      res.json({ success: true, message: 'Agent details updated successfully!' });
    } else {
      res.status(404).json({ success: false, message: 'Agent record not found.' });
    }
  } catch (error) {
    console.error('Update Agent Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update agent details.' });
  }
};

exports.deleteAgent = async (req, res) => {
  try {
    const { id } = req.params;
    // Deleting directly from standalone agents table cascades/nulls related records
    const deleted = await Agent.delete(id);
    if (deleted) {
      res.json({ success: true, message: 'Agent profile and login credentials deleted.' });
    } else {
      res.status(404).json({ success: false, message: 'Agent not found.' });
    }
  } catch (error) {
    console.error('Delete Agent Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete agent.' });
  }
};

// --- CUSTOMER CRUD CONTROLLERS (ADMIN) ---

exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.getAll();
    res.json({ success: true, data: customers });
  } catch (error) {
    console.error('Get Customers Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve passenger records.' });
  }
};

exports.createCustomerByAdmin = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { username, email, password, name, phone, address, passport_number, assigned_agent_id } = req.body;

    if (!username || !email || !password || !name || !phone) {
      return res.status(400).json({ success: false, message: 'Missing required credentials.' });
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

    // 1. Create entry in standalone customers table
    const insertId = await User.create(username, email, password, 'customer', connection);
    
    // 2. Populate passenger info in transaction
    await Customer.create(insertId, name, phone, address, passport_number, assigned_agent_id || null, connection);

    await connection.commit();
    res.status(201).json({ success: true, message: 'Customer registered successfully!' });
  } catch (error) {
    await connection.rollback();
    console.error('Create Customer Transaction Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create customer.' });
  } finally {
    connection.release();
  }
};

exports.updateCustomerByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, passport_number, assigned_agent_id } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and Phone details are required.' });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Phone number must contain exactly 10 digits.' });
    }

    const updated = await Customer.update(id, name, phone, address, passport_number, assigned_agent_id || null);
    if (updated) {
      res.json({ success: true, message: 'Customer details updated successfully!' });
    } else {
      res.status(404).json({ success: false, message: 'Customer record not found.' });
    }
  } catch (error) {
    console.error('Update Customer By Admin Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update customer details.' });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Customer.delete(id);
    if (deleted) {
      res.json({ success: true, message: 'Customer profile and login credentials deleted.' });
    } else {
      res.status(404).json({ success: false, message: 'Customer not found.' });
    }
  } catch (error) {
    console.error('Delete Customer Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete customer.' });
  }
};

// --- BOOKINGS & PAYMENTS MASTER CRUD ---

exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.getAll();
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Admin Get Bookings Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve bookings ledger.' });
  }
};

exports.deleteBookingByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Booking.delete(id);
    if (deleted) {
      res.json({ success: true, message: 'Booking reservation deleted successfully.' });
    } else {
      res.status(404).json({ success: false, message: 'Booking not found.' });
    }
  } catch (error) {
    console.error('Admin Delete Booking Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete booking.' });
  }
};

exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.getAll();
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('Admin Get Payments Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve payments audit logs.' });
  }
};

// --- DISCOUNTS MANAGEMENT ---
exports.getDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.getAll();
    res.json({ success: true, data: discounts });
  } catch (error) {
    console.error('Admin Get Discounts Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve discount records.' });
  }
};

// --- ADMINS DIRECTORY ---
exports.getAdmins = async (req, res) => {
  try {
    const [admins] = await db.execute('SELECT id, username, email, name, role FROM admins ORDER BY id ASC');
    res.json({ success: true, data: admins });
  } catch (error) {
    console.error('Admin Get Admins Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve administrator records.' });
  }
};
