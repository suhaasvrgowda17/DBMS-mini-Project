const db = require('../config/db');

class Booking {
  // Get all bookings with customer, package, and agent details (JOIN report query)
  static async getAll() {
    const sql = `
      SELECT b.id, b.customer_id, c.name AS customer_name, b.package_id, p.name AS package_name, 
             b.agent_id, a.name AS agent_name, b.travel_date, b.number_of_travelers, 
             b.total_price, b.status, b.booking_date, b.booking_reference, pm.status AS payment_status,
             b.agent_assignment_status
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN tour_packages p ON b.package_id = p.id
      LEFT JOIN agents a ON b.agent_id = a.id
      LEFT JOIN payments pm ON pm.booking_id = b.id
      ORDER BY b.booking_date DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  }

  // Get specific booking details by ID
  static async getById(id) {
    const sql = `
      SELECT b.id, b.customer_id, c.name AS customer_name, c.phone AS customer_phone, 
             c.passport_number AS customer_passport, c.address AS customer_address,
             b.package_id, p.name AS package_name, p.destination AS package_destination, 
             p.duration AS package_duration, p.price AS package_unit_price,
             b.agent_id, a.name AS agent_name, a.phone AS agent_phone, a.email AS agent_email,
             b.travel_date, b.number_of_travelers, b.total_price, b.status, b.booking_date, b.booking_reference,
             pm.status AS payment_status, pm.transaction_id, pm.payment_method, pm.amount AS payment_amount,
             b.agent_assignment_status,
             pc.promo_code AS promo_code, pc.discount_percent AS promo_discount
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN tour_packages p ON b.package_id = p.id
      LEFT JOIN agents a ON b.agent_id = a.id
      LEFT JOIN payments pm ON pm.booking_id = b.id
      LEFT JOIN discounts pc ON b.applied_promo_code = pc.promo_code
      WHERE b.id = ?
    `;
    const [rows] = await db.execute(sql, [id]);
    return rows[0] || null;
  }

  // Get bookings for a specific customer
  static async getByCustomerId(customerId) {
    const sql = `
      SELECT b.id, b.customer_id, b.package_id, p.name AS package_name, p.destination AS package_destination,
             b.agent_id, a.name AS agent_name, a.phone AS agent_phone, a.email AS agent_email, b.travel_date, b.number_of_travelers, 
             b.total_price, b.status, b.booking_date, b.booking_reference, pm.status AS payment_status, pm.transaction_id,
             b.agent_assignment_status, pc.promo_code AS promo_code, pc.discount_percent AS promo_discount
      FROM bookings b
      JOIN tour_packages p ON b.package_id = p.id
      LEFT JOIN agents a ON b.agent_id = a.id
      LEFT JOIN payments pm ON pm.booking_id = b.id
      LEFT JOIN discounts pc ON b.applied_promo_code = pc.promo_code
      WHERE b.customer_id = ?
      ORDER BY b.booking_date DESC
    `;
    const [rows] = await db.execute(sql, [customerId]);
    return rows;
  }

  // Get bookings managed by a specific agent (e.g. for agent dashboard)
  static async getByAgentId(agentId) {
    const sql = `
      SELECT b.id, b.customer_id, c.name AS customer_name, b.package_id, p.name AS package_name, 
             b.travel_date, b.number_of_travelers, b.total_price, b.status, b.booking_date, b.booking_reference,
             pm.status AS payment_status, b.agent_assignment_status
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN tour_packages p ON b.package_id = p.id
      LEFT JOIN payments pm ON pm.booking_id = b.id
      WHERE b.agent_id = ?
      ORDER BY b.booking_date DESC
    `;
    const [rows] = await db.execute(sql, [agentId]);
    return rows;
  }

  // Create a new booking (supports external transaction connection)
  static async create(customerId, packageId, agentId, travelDate, numberOfTravelers, totalPrice, appliedPromoCode = null, connection = null) {
    const bookingReference = `TM-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
    const sql = `
      INSERT INTO bookings (customer_id, package_id, agent_id, travel_date, number_of_travelers, total_price, booking_reference, applied_promo_code, status, agent_assignment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unassigned')
    `;
    const params = [
      customerId,
      packageId,
      agentId ? parseInt(agentId) : null,
      travelDate,
      parseInt(numberOfTravelers),
      parseFloat(totalPrice),
      bookingReference,
      appliedPromoCode ? appliedPromoCode.toUpperCase().trim() : null
    ];

    const execDb = connection || db;
    const [result] = await execDb.execute(sql, params);
    return result.insertId;
  }

  // Update booking status ('pending', 'confirmed', 'cancelled')
  static async updateStatus(id, status) {
    const sql = 'UPDATE bookings SET status = ? WHERE id = ?';
    const [result] = await db.execute(sql, [status, id]);
    return result.affectedRows > 0;
  }

  // Cancel/Delete booking (cascades payments deleted if using ON DELETE CASCADE, or update status to cancelled)
  static async delete(id) {
    const [result] = await db.execute('DELETE FROM bookings WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Count dashboard metrics for admin panel
  static async getStats() {
    const queries = {
      totalRevenue: "SELECT SUM(amount) AS count FROM payments WHERE status = 'completed'",
      totalBookings: "SELECT COUNT(*) AS count FROM bookings",
      activePackages: "SELECT COUNT(*) AS count FROM tour_packages",
      totalAgents: "SELECT COUNT(*) AS count FROM agents WHERE status = 'active'"
    };

    const stats = {};
    for (const [key, sql] of Object.entries(queries)) {
      const [rows] = await db.execute(sql);
      stats[key] = rows[0].count || 0;
    }
    return stats;
  }
}

module.exports = Booking;
