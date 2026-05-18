const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'TravelAgencyManagementSystem',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    multipleStatements: true
  });

  try {
    const sql = fs.readFileSync('database.sql', 'utf8');
    console.log("Executing database.sql inside Aiven Cloud...");
    await pool.query(sql);
    console.log("Migration successful! Discounts table created.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
