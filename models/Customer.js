const db = require('../config/db');

class Customer {
  // Get all passengers/customers from standalone table
  static async getAll() {
    const sql = `
      SELECT c.id, c.username, c.email, c.name, c.phone, c.address, c.passport_number, 
             c.assigned_agent_id, c.created_at, a.name AS agent_name
      FROM customers c
      LEFT JOIN agents a ON c.assigned_agent_id = a.id
      ORDER BY c.name ASC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  }

  // Get passengers managed by a specific Agent
  static async getByAgentId(agentId) {
    const sql = `
      SELECT id, username, email, name, phone, address, passport_number, created_at
      FROM customers
      WHERE assigned_agent_id = ?
      ORDER BY name ASC
    `;
    const [rows] = await db.execute(sql, [agentId]);
    return rows;
  }

  // Find passenger by ID
  static async getById(id) {
    const sql = `
      SELECT c.id, c.username, c.email, c.name, c.phone, c.address, c.passport_number, 
             c.assigned_agent_id, c.created_at, a.name AS agent_name
      FROM customers c
      LEFT JOIN agents a ON c.assigned_agent_id = a.id
      WHERE c.id = ?
    `;
    const [rows] = await db.execute(sql, [id]);
    return rows[0] || null;
  }

  // Update newly-created customer profile details (step 2 of registration transaction)
  static async create(id, name, phone, address, passportNumber, assignedAgentId = null, connection = null) {
    const sql = `
      UPDATE customers
      SET name = ?, phone = ?, address = ?, passport_number = ?, assigned_agent_id = ?
      WHERE id = ?
    `;
    const params = [name, phone, address || null, passportNumber || null, assignedAgentId || null, id];
    const execDb = connection || db;
    const [result] = await execDb.execute(sql, params);
    return result;
  }

  // Update customer profile details
  static async update(id, name, phone, address, passportNumber, assignedAgentId = null) {
    const sql = `
      UPDATE customers
      SET name = ?, phone = ?, address = ?, passport_number = ?, assigned_agent_id = ?
      WHERE id = ?
    `;
    const [result] = await db.execute(sql, [
      name, 
      phone, 
      address || null, 
      passportNumber || null, 
      assignedAgentId || null, 
      id
    ]);
    return result.affectedRows > 0;
  }

  // Delete customer directly (cascades automatically to bookings and payments)
  static async delete(id) {
    const [result] = await db.execute('DELETE FROM customers WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Customer;
