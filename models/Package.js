const db = require('../config/db');

class Package {
  // Get all packages
  static async getAll() {
    const [rows] = await db.execute('SELECT * FROM tour_packages ORDER BY id DESC');
    return rows;
  }

  // Get specific package by ID
  static async getById(id) {
    const [rows] = await db.execute('SELECT * FROM tour_packages WHERE id = ?', [id]);
    return rows[0] || null;
  }

  // Create a new package
  static async create(name, destination, price, duration, description, imageUrl = null) {
    const sql = `
      INSERT INTO tour_packages (name, destination, price, duration, description, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      name,
      destination,
      parseFloat(price),
      duration,
      description || null,
      imageUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'
    ];
    const [result] = await db.execute(sql, params);
    return result.insertId;
  }

  // Update an existing package
  static async update(id, name, destination, price, duration, description, imageUrl) {
    const sql = `
      UPDATE tour_packages
      SET name = ?, destination = ?, price = ?, duration = ?, description = ?, image_url = ?
      WHERE id = ?
    `;
    const params = [
      name,
      destination,
      parseFloat(price),
      duration,
      description || null,
      imageUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80',
      id
    ];
    const [result] = await db.execute(sql, params);
    return result.affectedRows > 0;
  }

  // Delete a package
  static async delete(id) {
    const [result] = await db.execute('DELETE FROM tour_packages WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Search packages by name, destination, or description
  static async search(query) {
    const sql = `
      SELECT * FROM tour_packages
      WHERE name LIKE ? OR destination LIKE ? OR description LIKE ?
      ORDER BY id DESC
    `;
    const searchVal = `%${query}%`;
    const [rows] = await db.execute(sql, [searchVal, searchVal, searchVal]);
    return rows;
  }
}

module.exports = Package;
