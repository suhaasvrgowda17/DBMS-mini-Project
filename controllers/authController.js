const db = require('../config/db');
const User = require('../models/User');
const Customer = require('../models/Customer');

// Handle user Login (Admin, Agent, Customer)
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate request
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please enter both username and password.' });
    }

    // Find base user across separate tables sequentially
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    // Verify Password hash
    const isMatch = await User.verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Password incorrect.' });
    }

    // Retrieve name for display depending on role
    let displayName = user.name || user.username;

    // Store in Session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      admin_level: user.admin_level || null,
      displayName: displayName
    };

    // Determine dashboard redirect URL
    let redirectUrl = '/customer/dashboard';
    if (user.role === 'admin') redirectUrl = '/admin/dashboard';
    if (user.role === 'agent') redirectUrl = '/agent/dashboard';

    res.json({
      success: true,
      message: 'Login successful.',
      redirectUrl: redirectUrl
    });
  } catch (error) {
    console.error('Login Controller Error:', error);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
};

// Handle Customer self-registration (Transaction-driven)
exports.register = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { username, email, password, name, phone, address, passport_number } = req.body;

    // Form validation
    if (!username || !email || !password || !name || !phone) {
      return res.status(400).json({ success: false, message: 'Please complete all required fields.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Phone number must contain exactly 10 digits.' });
    }

    // Start Transaction
    await connection.beginTransaction();

    // Check if user already exists
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Username is already taken.' });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Email address is already registered.' });
    }

    const existingPhone = await User.findByPhone(phone);
    if (existingPhone) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Phone number is already in use.' });
    }

    // 1. Create base user in `customers` table with placeholders for contact details
    const insertId = await User.create(username, email, password, 'customer', connection);

    // 2. Populate customer details in the same transaction
    await Customer.create(insertId, name, phone, address, passport_number, null, connection);

    // Commit Transaction
    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Registration successful! You can now log in.'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Registration Controller Error:', error);
    res.status(500).json({ success: false, message: 'Registration failed due to a database exception.' });
  } finally {
    connection.release();
  }
};

// Handle logout operation
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Session Destruction Error during logout:', err);
      return res.status(500).json({ success: false, message: 'Unable to logout at this time.' });
    }
    res.clearCookie('connect.sid'); // Clear express session ID cookie
    res.redirect('/login');
  });
};

// Retrieve currently logged-in user profile details
exports.getProfile = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    const { id, role } = req.session.user;
    const profile = await User.findById(id, role);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile details not found.' });
    }
    // Remove hashed password from the response
    delete profile.password;
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve profile details.' });
  }
};

// Update currently logged-in user profile and credentials
exports.updateProfile = async (req, res) => {
  const connection = await db.getConnection();
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    const { id, role } = req.session.user;
    const { name, email, phone, address, passport_number, currentPassword, newPassword } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and Email are required.' });
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Phone number must contain exactly 10 digits.' });
    }

    await connection.beginTransaction();

    // Fetch existing user to verify password and details
    const existing = await User.findById(id, role);
    if (!existing) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Verify password if a password update is requested
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
      }
      if (!currentPassword) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Please enter your current password to set a new password.' });
      }
      const isMatch = await User.verifyPassword(currentPassword, existing.password);
      if (!isMatch) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      }
    }

    // Verify email uniqueness across separate tables
    const emailOwner = await User.findByEmail(email);
    if (emailOwner && (emailOwner.id !== id || emailOwner.role !== role)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Email address is already in use by another account.' });
    }

    // Update Profile Columns
    const extraData = { phone, address, passport_number };
    await User.updateProfile(id, role, name, email, extraData, connection);

    // Update password if specified
    if (newPassword) {
      await User.updatePassword(id, role, newPassword, connection);
    }

    await connection.commit();

    // Update active session values
    req.session.user.email = email;
    req.session.user.displayName = name;

    res.json({ success: true, message: 'Profile details updated successfully!' });
  } catch (error) {
    await connection.rollback();
    console.error('Update Profile Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  } finally {
    connection.release();
  }
};
