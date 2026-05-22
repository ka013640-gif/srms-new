import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'srms'
});

const conn = await pool.getConnection();
try {
  await conn.query("UPDATE residents SET updated_at = NOW() WHERE updated_at IS NULL OR updated_at = '0000-00-00 00:00:00'");
  await conn.query("UPDATE sessions SET updated_at = NOW() WHERE updated_at IS NULL OR updated_at = '0000-00-00 00:00:00'");
  await conn.query("UPDATE projects SET updated_at = NOW() WHERE updated_at IS NULL OR updated_at = '0000-00-00 00:00:00'");
  console.log('Updated dates');
} finally {
  conn.release();
  await pool.end();
}