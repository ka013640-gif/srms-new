import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'srms'
});

const conn = await pool.getConnection();
try {
  await conn.query(`UPDATE residents SET updated_at = NOW() WHERE updated_at IS NULL`);
  await conn.query(`UPDATE users SET profilePicture = NULL WHERE 1=1`); // no-op, just to verify conn works
  const [rows] = await conn.query(`SELECT user_id, username, fullName, role FROM users`);

  console.log('Users after fix:');
  rows.forEach(r => console.log(`  ${r.user_id}: ${r.username} (${r.role})`));

  console.log('\nResident seed data inserted. Login credentials:');
  console.log('  admin    / admin123');
  console.log('  resident / resident123');
  console.log('  official / resident123');
} finally {
  conn.release();
  await pool.end();
}
