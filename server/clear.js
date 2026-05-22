import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'srms'
});

const conn = await pool.getConnection();
try {
  await conn.query('DELETE FROM residents');
  await conn.query("DELETE FROM users WHERE role = 'RESIDENT' OR username = 'ace'");
  await conn.query('DELETE FROM projects');
  await conn.query('DELETE FROM sessions');
  console.log('Tables cleared');
} finally {
  conn.release();
  await pool.end();
}