import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

// Quick login sanity check
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'srms'
});

const conn = await pool.getConnection();
try {
  // Get admin user details
  const [rows] = await conn.query('SELECT user_id, username, password FROM users WHERE username = "admin"');
  const admin = rows[0];
  console.log(`Admin user found: ${admin ? admin.username : 'NOT FOUND'}`);

  if (admin) {
    console.log(`  Password prefix: ${admin.password.substring(0, 20)}...`);
    const valid = await bcrypt.compare('admin123', admin.password);
    console.log(`  'admin123' matches: ${valid}`);
    const validWrong = await bcrypt.compare('wrongpassword', admin.password);
    console.log(`  'wrongpassword' matches: ${validWrong}`);
  }

  // Get resident user details  
  const [rows2] = await conn.query('SELECT user_id, username, password, role FROM users WHERE username = "resident"');
  const resident = rows2[0];
  console.log(`\nResident user found: ${resident ? resident.username : 'NOT FOUND'}`);
  if (resident) {
    console.log(`  Role: ${resident.role}`);
    const valid = await bcrypt.compare('resident123', resident.password);
    console.log(`  'resident123' matches: ${valid}`);
  }

  // Get official user details
  const [rows3] = await conn.query('SELECT user_id, username, password, role FROM users WHERE username = "official"');
  const official = rows3[0];
  console.log(`\nOfficial user found: ${official ? official.username : 'NOT FOUND'}`);
  if (official) {
    console.log(`  Role: ${official.role}`);
    const valid = await bcrypt.compare('resident123', official.password);
    console.log(`  'resident123' matches: ${valid}`);
  }
} finally {
  conn.release();
  await pool.end();
}
