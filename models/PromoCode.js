// TravelMate Promo Code Relational Database Operations Module
const db = require('../config/db');

class PromoCode {
  // Find promo code details by its code string (case-insensitive)
  static async getByCode(code) {
    const sql = 'SELECT * FROM promo_codes WHERE UPPER(code) = ?';
    const [rows] = await db.execute(sql, [code.toUpperCase().trim()]);
    return rows[0] || null;
  }

  // Find promo code by ID
  static async getById(id) {
    const sql = 'SELECT * FROM promo_codes WHERE id = ?';
    const [rows] = await db.execute(sql, [id]);
    return rows[0] || null;
  }

  // Retrieve all active, unexpired promo codes
  static async getAllActive() {
    const sql = "SELECT * FROM promo_codes WHERE status = 'active' AND expiry_date >= CURDATE()";
    const [rows] = await db.execute(sql);
    return rows;
  }
}

module.exports = PromoCode;
