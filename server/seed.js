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
  const [usersCount] = await conn.query('SELECT COUNT(*) as cnt FROM users');
  console.log(`Users: ${usersCount[0].cnt} rows`);

  const hashedPassword = await bcrypt.hash('12345678', 10);

  // Check if admin exists, if not create it
  const [adminCheck] = await conn.query("SELECT user_id FROM users WHERE username = 'admin'");
  if (adminCheck.length === 0) {
    await conn.query(`
      INSERT INTO users (username, password, fullName, role, email)
      VALUES ('admin', ?, 'System Administrator', 'ADMIN', 'admin@barangay.gov.ph')
    `, [hashedPassword]);
    console.log('Admin created.');
  }

  // Insert residents if none exist
  const [residentCheck] = await conn.query("SELECT user_id FROM users WHERE role = 'RESIDENT' LIMIT 1");
  if (residentCheck.length === 0) {
    let maleCount = 0, femaleCount = 0;

    for (let i = 1; i <= 40; i++) {
      const name = i.toString().padStart(4, '0');
      const email = `residentemail${name}@gmail.com`;
      const gender = maleCount < 24 ? 'Male' : 'Female';
      if (gender === 'Male') maleCount++; else femaleCount++;

      await conn.query(`
        INSERT INTO users (username, password, fullName, role, email)
        VALUES (?, ?, ?, 'RESIDENT', ?)
      `, [name, hashedPassword, name, email]);
    }
    console.log('Residents created.');
  }

  // Get all resident user_ids for profiles
  const [residentUsers] = await conn.query("SELECT user_id, username FROM users WHERE role = 'RESIDENT' ORDER BY username");

  // Insert resident profiles if none exist
  const [residentsCount] = await conn.query('SELECT COUNT(*) as cnt FROM residents');
  if (residentsCount[0].cnt === 0) {
    // Create distribution arrays
    const ages = [];
    for (let i = 0; i < 20; i++) ages.push({ birthday: '2000-01-01', age: 26 }); // adults
    for (let i = 0; i < 12; i++) ages.push({ birthday: '2010-01-01', age: 16 });  // children
    for (let i = 0; i < 8; i++) ages.push({ birthday: '1960-01-01', age: 66 });   // seniors
    // Shuffle to distribute evenly
    for (let i = ages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ages[i], ages[j]] = [ages[j], ages[i]];
    }

    const genders = [];
    for (let i = 0; i < 24; i++) genders.push('Male');
    for (let i = 0; i < 16; i++) genders.push('Female');
    for (let i = genders.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [genders[i], genders[j]] = [genders[j], genders[i]];
    }

    for (let i = 0; i < residentUsers.length; i++) {
      const { user_id, username } = residentUsers[i];
      const name = username;
      const { birthday, age } = ages[i];
      const gender = genders[i];
      const contact = `090000000${(i + 1).toString().padStart(2, '0')}`;

      await conn.query(`
        INSERT INTO residents (user_id, full_name, age, gender, birthday, address, contact, occupation, civil_status, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [user_id, name, age, gender, birthday, 'Calabanga, Camarines Sur', contact, 'occupation', 'Single', 'Active']);
    }
    console.log('Resident profiles seeded.');
  }

  // Insert projects (001-004)
  const [projectsCount] = await conn.query('SELECT COUNT(*) as cnt FROM projects');
  if (projectsCount[0].cnt === 0) {
    const statuses = ['ACTIVE', 'PENDING', 'COMPLETED', 'CANCELLED'];
    for (let i = 1; i <= 4; i++) {
      await conn.query(`
        INSERT INTO projects (name, description, status, budget, start_date, end_date)
        VALUES (?, 'desc', ?, 10000, '2020-01-01', '2030-01-01')
      `, [`${i}`, statuses[i - 1]]);
    }
    console.log('Projects seeded.');
  }

  // Insert sessions (001-004)
  const [sessionsCount] = await conn.query('SELECT COUNT(*) as cnt FROM sessions');
  if (sessionsCount[0].cnt === 0) {
    const statuses = ['ACTIVE', 'SCHEDULED', 'ACTIVE', 'COMPLETED'];
    for (let i = 1; i <= 4; i++) {
      await conn.query(`
        INSERT INTO sessions (title, description, date, time, location, status)
        VALUES (?, 'desc', ?, '10:00:00', 'Barangay Hall', ?)
      `, [`${i}`, `202${i}-01-01`, statuses[i - 1]]);
    }
    console.log('Sessions seeded.');
  }

  const [final] = await conn.query('SELECT user_id, username, fullName, role FROM users');
  console.log('\nAll users:', JSON.stringify(final, null, 2));
} finally {
  conn.release();
  await pool.end();
}