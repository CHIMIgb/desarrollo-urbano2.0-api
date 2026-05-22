require('dotenv').config();
const db = require('../server/db');

async function check() {
  try {
    const res = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
