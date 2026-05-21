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
  // Check users
  const [usersCount] = await conn.query('SELECT COUNT(*) as cnt FROM users');
  console.log(`Users: ${usersCount[0].cnt} rows`);
  if (usersCount[0].cnt > 0) {
    const [users] = await conn.query('SELECT user_id, username, role FROM users');
    console.log(JSON.stringify(users, null, 2));
  } else {
    console.log('No users — inserting seed data...');

    const hashedAdmin = await bcrypt.hash('admin123', 10);
    const hashedResident = await bcrypt.hash('resident123', 10);

    await conn.query(`
      INSERT INTO users (username, password, fullName, role, email)
      VALUES
        ('admin',    ?, 'System Administrator', 'ADMIN',    'admin@barangay.gov.ph'),
        ('resident', ?, 'Juan Dela Cruz',       'RESIDENT', NULL),
        ('official', ?, 'Maria Santos',          'OFFICIAL', NULL)
    `, [hashedAdmin, hashedResident, hashedResident]);

    console.log('Users seeded.');
  }

  // Insert resident profile for user_id=2 (resident account)
  const [residentsCount] = await conn.query('SELECT COUNT(*) as cnt FROM residents');
  if (residentsCount[0].cnt === 0) {
    await conn.query(`
      INSERT INTO residents (user_id, full_name, age, gender, birthday, address, contact, occupation, civil_status, status)
      VALUES (2, 'Juan Dela Cruz', 30, 'Male', '1995-05-15', '123 Main Street', '09123456789', 'Farmer', 'Single', 'Active')
    `);
    console.log('Resident profile seeded.');
  }

  // Insert official
  const [officialsCount] = await conn.query('SELECT COUNT(*) as cnt FROM officials');
  if (officialsCount[0].cnt === 0) {
    await conn.query(`
      INSERT INTO officials (name, position, contact, term_start, is_active)
      VALUES ('Maria Santos', 'Barangay Secretary', '09129876543', '2024-07-01', true)
    `);
    console.log('Official seeded.');
  }

  // Insert a sample project if none exist
  const [projectsCount] = await conn.query('SELECT COUNT(*) as cnt FROM projects');
  if (projectsCount[0].cnt === 0) {
    await conn.query(`
      INSERT INTO projects (name, description, status, budget, start_date, end_date)
      VALUES ('Road Repair', 'Repair main barangay road', 'ACTIVE', 50000, '2026-01-15', '2026-06-30')
    `);
    console.log('Project seeded.');
  }

  // Insert a session if none exist
  const [sessionsCount] = await conn.query('SELECT COUNT(*) as cnt FROM sessions');
  if (sessionsCount[0].cnt === 0) {
    await conn.query(`
      INSERT INTO sessions (title, description, date, time, location, status)
      VALUES ('Monthly Assembly', 'Regular barangay assembly meeting', '2026-06-15', '09:00:00', 'Barangay Hall', 'SCHEDULED')
    `);
    console.log('Session seeded.');
  }

  // Final verification
  const [final] = await conn.query('SELECT user_id, username, fullName, role FROM users');
  console.log('\nAll users:', JSON.stringify(final, null, 2));
} finally {
  conn.release();
  await pool.end();
}
