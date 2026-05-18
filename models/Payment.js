const db = require('../config/db');

class Payment {
  // Get all payment records for administrative views
  static async getAll() {
    const sql = `
      SELECT p.id, p.booking_id, p.customer_id, p.amount, p.payment_method, p.transaction_id, p.status, p.payment_date,
             c.name AS customer_name, tp.name AS package_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN customers c ON b.customer_id = c.id
      JOIN tour_packages tp ON b.package_id = tp.id
      ORDER BY p.payment_date DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  }

  // Get specific payment record by its booking ID
  static async getByBookingId(bookingId) {
    const sql = 'SELECT * FROM payments WHERE booking_id = ?';
    const [rows] = await db.execute(sql, [bookingId]);
    return rows[0] || null;
  }

  // Log a new payment record (supports standard transactions)
  static async create(bookingId, customerId, amount, paymentMethod, transactionId, status = 'pending', connection = null) {
    const sql = `
      INSERT INTO payments (booking_id, customer_id, amount, payment_method, transaction_id, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      bookingId,
      customerId,
      parseFloat(amount),
      paymentMethod,
      transactionId,
      status
    ];

    const execDb = connection || db;
    const [result] = await execDb.execute(sql, params);
    return result.insertId;
  }

  // Update a payment status (e.g. from pending to completed, refunded)
  static async updateStatus(id, status) {
    const sql = 'UPDATE payments SET status = ? WHERE id = ?';
    const [result] = await db.execute(sql, [status, id]);
    return result.affectedRows > 0;
  }

  // Update a payment status by its booking ID
  static async updateStatusByBookingId(bookingId, status) {
    const sql = 'UPDATE payments SET status = ? WHERE booking_id = ?';
    const [result] = await db.execute(sql, [status, bookingId]);
    return result.affectedRows > 0;
  }

  // Retrieve payment and customer history for a specific customer
  static async getPaymentHistoryByCustomerId(customerId) {
    const sql = `
      SELECT p.id, p.booking_id, p.amount, p.payment_method, p.transaction_id, p.status, p.payment_date,
             tp.name AS package_name
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN tour_packages tp ON b.package_id = tp.id
      WHERE b.customer_id = ?
      ORDER BY p.payment_date DESC
    `;
    const [rows] = await db.execute(sql, [customerId]);
    return rows;
  }
}

module.exports = Payment;
