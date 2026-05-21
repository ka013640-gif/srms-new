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
  const [rows] = await conn.query('SELECT user_id, username, password, role, fullName FROM users WHERE username = "resident"');
  const user = rows[0];
  console.log(`Resident: ${user.username}, role: ${user.role}`);
  console.log(`Password hash: ${user.password.substring(0, 30)}...`);

  const match = await bcrypt.compare('resident123', user.password);
  const matchWrong = await bcrypt.compare('resident1234', user.password);
  console.log(`'resident123' matches: ${match}`);
  console.log(`'resident1234' matches: ${matchWrong}`);
} finally {
  conn.release();
  await pool.end();
}
