import mysql from 'mysql2/promise';
import { PrismaClient } from '@prisma/client';

// Run with: node check-full.js
// Script just to inspect what Prisma actually sees

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'srms'
});

const conn = await pool.getConnection();
try {
  // Check users schema
  const [userCols] = await conn.query('SHOW COLUMNS FROM users');
  console.log('Users columns:');
  userCols.forEach(c => console.log(`  ${c.Field}: ${c.Type} Null=${c.Null} Default=${c.Default}`));

  console.log('\nResident cols:');
  const [resCols] = await conn.query('SHOW COLUMNS FROM residents');
  resCols.forEach(c => console.log(`  ${c.Field}: ${c.Type}`));
} finally {
  conn.release();
  await pool.end();
}
