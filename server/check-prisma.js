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
  // What does prisma actually send when we findUnique('resident') include resident
  const [users] = await conn.query(
    `SELECT SQL_NO_CACHE u.user_id, u.username, u.password, u.fullName, u.role, u.email,
            r.resident_id, r.full_name, r.age, r.gender, r.birthday, r.address, r.contact, r.occupation, r.civil_status, r.status, r.created_at, r.updated_at
     FROM users u
     LEFT JOIN residents r ON r.user_id = u.user_id
     WHERE u.username = 'resident'`
  );
  console.log('Residents field names:', Object.keys(users[0]));
  console.log(`has_resident field: ${users[0].resident_id}`);
  console.log(JSON.stringify(users[0], null, 2));

  // Verify bcrypt compare works here
  const valid = await bcrypt.compare('resident123', users[0].password);
  console.log(`'resident123' valid via bcrypt.compare: ${valid}`);

  console.log('\nAll users in DB:');
  const [all] = await conn.query('SELECT user_id, username, password, role, fullName FROM users');
  all.forEach(u => {
    bcrypt.compare('resident123', u.password).then(v => console.log(`  ${u.username} (${u.role}) 'resident123': ${v}`));
  });
} finally {
  conn.release();
  await pool.end();
}
