const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'TravelAgencyManagementSystem',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test database connection immediately
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✔ MySQL Database connected successfully.');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed. Please ensure MySQL is running and credentials in .env are correct.');
    console.error('Error Details:', error.message);
  }
})();

module.exports = pool;
