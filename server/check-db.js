import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'srms'
});

const conn = await pool.getConnection();
try {
  const [rows] = await conn.query('SHOW TABLES');
  const tables = rows.map(r => Object.values(r)[0]);

  // Check which migration tables exist to understand DB state
  console.log('All tables in srms:', JSON.stringify(tables, null, 2));

  for (const t of tables) {
    const [cnt] = await conn.query(`SELECT COUNT(*) as cnt FROM ${t}`);
    console.log(`${t}: ${cnt[0].cnt} rows`);
  }
} finally {
  conn.release();
  await pool.end();
}
