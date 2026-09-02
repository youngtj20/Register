import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'checkin_db',
});

try {
  const [rows] = await connection.query('SELECT COUNT(*) AS count FROM events');
  if (rows[0].count > 0) {
    console.log('Events already exist, skipping seed.');
  } else {
    const id = randomUUID();
    const code = `SELF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const startsAt = new Date();
    startsAt.setHours(9, 0, 0, 0);
    const endsAt = new Date(startsAt);
    endsAt.setHours(18, 0, 0, 0);
    await connection.query(
      'INSERT INTO events (id, name, venue, starts_at, ends_at, status, self_checkin_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, 'Sample Union Meeting', 'Main Hall', startsAt, endsAt, 'active', code]
    );
    console.log(`Seeded sample event. Self check-in link code: ${code}`);
  }
} finally {
  await connection.end();
}
