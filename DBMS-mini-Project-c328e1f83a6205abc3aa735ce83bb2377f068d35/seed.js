const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  let connection;
  try {
    // Connect without selecting DB first to support drop/create database commands
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('✔ Connected to MySQL successfully. Parsing schema...');
    
    const sqlPath = path.join(__dirname, 'database.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Remove comments
    const cleanSql = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // Split statements by semicolon while respecting constraints
    const statements = cleanSql.split(/;\s*$/m);

    for (let statement of statements) {
      statement = statement.trim();
      if (!statement) continue;

      try {
        await connection.query(statement);
      } catch (err) {
        console.error('❌ Error executing statement:\n', statement);
        console.error('Error Details:', err.message);
        process.exit(1);
      }
    }

    console.log('🚀 Database schema created, validated, and seeded perfectly!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
})();
