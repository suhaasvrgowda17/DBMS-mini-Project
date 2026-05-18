const db = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
  // Find a user by their username (checks admins, agents, and customers sequentially)
  static async findByUsername(username) {
    // 1. Check admins
    let [rows] = await db.execute('SELECT *, \'admin\' AS role FROM admins WHERE username = ?', [username]);
    if (rows[0]) return rows[0];

    // 2. Check agents
    [rows] = await db.execute('SELECT *, \'agent\' AS role FROM agents WHERE username = ?', [username]);
    if (rows[0]) return rows[0];

    // 3. Check customers
    [rows] = await db.execute('SELECT *, \'customer\' AS role FROM customers WHERE username = ?', [username]);
    if (rows[0]) return rows[0];

    return null;
  }

  // Find a user by their email
  static async findByEmail(email) {
    // 1. Check admins
    let [rows] = await db.execute('SELECT *, \'admin\' AS role FROM admins WHERE email = ?', [email]);
    if (rows[0]) return rows[0];

    // 2. Check agents
    [rows] = await db.execute('SELECT *, \'agent\' AS role FROM agents WHERE email = ?', [email]);
    if (rows[0]) return rows[0];

    // 3. Check customers
    [rows] = await db.execute('SELECT *, \'customer\' AS role FROM customers WHERE email = ?', [email]);
    if (rows[0]) return rows[0];

    return null;
  }

  // Find a user by their phone (only agents and customers have phones)
  static async findByPhone(phone) {
    // 1. Check agents
    let [rows] = await db.execute('SELECT *, \'agent\' AS role FROM agents WHERE phone = ?', [phone]);
    if (rows[0]) return rows[0];

    // 2. Check customers
    [rows] = await db.execute('SELECT *, \'customer\' AS role FROM customers WHERE phone = ?', [phone]);
    if (rows[0]) return rows[0];

    return null;
  }

  // Find a user by their ID and role
  static async findById(id, role = null) {
    if (role === 'admin') {
      const [rows] = await db.execute('SELECT *, \'admin\' AS role FROM admins WHERE id = ?', [id]);
      return rows[0] || null;
    }
    if (role === 'agent') {
      const [rows] = await db.execute('SELECT *, \'agent\' AS role FROM agents WHERE id = ?', [id]);
      return rows[0] || null;
    }
    if (role === 'customer') {
      const [rows] = await db.execute('SELECT *, \'customer\' AS role FROM customers WHERE id = ?', [id]);
      return rows[0] || null;
    }

    // Fallback if role is not supplied (search all tables)
    let [rows] = await db.execute('SELECT *, \'admin\' AS role FROM admins WHERE id = ?', [id]);
    if (rows[0]) return rows[0];
    [rows] = await db.execute('SELECT *, \'agent\' AS role FROM agents WHERE id = ?', [id]);
    if (rows[0]) return rows[0];
    [rows] = await db.execute('SELECT *, \'customer\' AS role FROM customers WHERE id = ?', [id]);
    return rows[0] || null;
  }

  // Create a new credential entry in the respective table (returns insertion ID)
  static async create(username, email, password, role, connection = null) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const execDb = connection || db;

    if (role === 'admin') {
      const sql = 'INSERT INTO admins (username, email, password, name) VALUES (?, ?, ?, ?)';
      const [result] = await execDb.execute(sql, [username, email, hashedPassword, 'System Admin']);
      return result.insertId;
    }
    
    if (role === 'agent') {
      const sql = 'INSERT INTO agents (username, email, password, name, phone, agency_commission, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
      const [result] = await execDb.execute(sql, [username, email, hashedPassword, '', '', 10.00, 'active']);
      return result.insertId;
    }
    
    if (role === 'customer') {
      const sql = 'INSERT INTO customers (username, email, password, name, phone, address, passport_number, assigned_agent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      const [result] = await execDb.execute(sql, [username, email, hashedPassword, '', '', null, null, null]);
      return result.insertId;
    }

    throw new Error(`Invalid role '${role}' for credential creation.`);
  }

  // Verify raw password matches hash
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Update profile details for a user based on their active ID and role
  static async updateProfile(id, role, name, email, extraData = {}, connection = null) {
    const execDb = connection || db;
    if (role === 'admin') {
      const sql = 'UPDATE admins SET name = ?, email = ? WHERE id = ?';
      const [result] = await execDb.execute(sql, [name, email, id]);
      return result.affectedRows > 0;
    }
    if (role === 'agent') {
      const { phone } = extraData;
      const sql = 'UPDATE agents SET name = ?, email = ?, phone = ? WHERE id = ?';
      const [result] = await execDb.execute(sql, [name, email, phone, id]);
      return result.affectedRows > 0;
    }
    if (role === 'customer') {
      const { phone, address, passport_number } = extraData;
      const sql = 'UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, passport_number = ? WHERE id = ?';
      const [result] = await execDb.execute(sql, [name, email, phone, address || null, passport_number || null, id]);
      return result.affectedRows > 0;
    }
    return false;
  }

  // Update password
  static async updatePassword(id, role, newPassword, connection = null) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const execDb = connection || db;
    let sql = '';
    if (role === 'admin') sql = 'UPDATE admins SET password = ? WHERE id = ?';
    else if (role === 'agent') sql = 'UPDATE agents SET password = ? WHERE id = ?';
    else if (role === 'customer') sql = 'UPDATE customers SET password = ? WHERE id = ?';
    else return false;

    const [result] = await execDb.execute(sql, [hashedPassword, id]);
    return result.affectedRows > 0;
  }
}

module.exports = User;
