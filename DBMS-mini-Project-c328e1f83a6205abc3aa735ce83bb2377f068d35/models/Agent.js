const db = require('../config/db');

class Agent {
  // Get all agents from standalone table
  static async getAll() {
    const sql = `
      SELECT id, username, email, name, phone, agency_commission, status, created_at
      FROM agents
      ORDER BY name ASC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  }

  // Get active agents only (for assignment drop-downs)
  static async getActive() {
    const sql = `
      SELECT id, name, phone
      FROM agents
      WHERE status = 'active'
      ORDER BY name ASC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  }

  // Find agent profile by ID
  static async getById(id) {
    const sql = `
      SELECT id, username, email, name, phone, agency_commission, status, created_at
      FROM agents
      WHERE id = ?
    `;
    const [rows] = await db.execute(sql, [id]);
    return rows[0] || null;
  }

  // Update newly-created Agent profile details (called as step 2 of registration transaction)
  static async create(id, name, phone, commission = 10.00, status = 'active', connection = null) {
    const sql = `
      UPDATE agents
      SET name = ?, phone = ?, agency_commission = ?, status = ?
      WHERE id = ?
    `;
    const params = [name, phone, commission, status, id];
    const execDb = connection || db;
    const [result] = await execDb.execute(sql, params);
    return result;
  }

  // Update agent profile details
  static async update(id, name, phone, commission, status) {
    const sql = `
      UPDATE agents
      SET name = ?, phone = ?, agency_commission = ?, status = ?
      WHERE id = ?
    `;
    const [result] = await db.execute(sql, [name, phone, commission, status, id]);
    return result.affectedRows > 0;
  }

  // Delete agent directly (removes the standalone agent record; cascades to bookings/customers set null)
  static async delete(id) {
    const [result] = await db.execute('DELETE FROM agents WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Agent;
