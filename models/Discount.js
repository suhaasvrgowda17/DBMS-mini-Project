// TravelMate Discount Relational Database Operations Module
const db = require('../config/db');

class Discount {
  // Find discount details by its promo code string (case-insensitive)
  static async getByCode(code) {
    const sql = 'SELECT * FROM discounts WHERE UPPER(promo_code) = ?';
    const [rows] = await db.execute(sql, [code.toUpperCase().trim()]);
    return rows[0] || null;
  }

  // Retrieve all active, unexpired discounts
  static async getAllActive() {
    const sql = "SELECT * FROM discounts WHERE status = 'active' AND expiry_date >= CURDATE()";
    const [rows] = await db.execute(sql);
    return rows;
  }

  // Retrieve ALL discounts (for admin dashboard)
  static async getAll() {
    const sql = "SELECT * FROM discounts ORDER BY created_at DESC";
    const [rows] = await db.execute(sql);
    return rows;
  }
}

module.exports = Discount;
