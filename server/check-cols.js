import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'srms'
});

const conn = await pool.getConnection();
try {
  // Check columns in residents table
  const [rows] = await conn.query('DESCRIBE residents');
  console.log('Residents columns:', rows.map(r => r.Field));

  // Check columns in users table  
  const [rows2] = await conn.query('DESCRIBE users');
  console.log('Users columns:', rows2.map(r => r.Field));
} finally {
  conn.release();
  await pool.end();
}
