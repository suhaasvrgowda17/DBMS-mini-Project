const db = require('./config/db');

async function checkDb() {
  try {
    const [rows] = await db.execute('SELECT * FROM discounts');
    console.log("SUCCESS! Found discounts:", rows.length);
  } catch (err) {
    console.error("DATABASE ERROR:", err.message);
  } finally {
    process.exit(0);
  }
}

checkDb();
