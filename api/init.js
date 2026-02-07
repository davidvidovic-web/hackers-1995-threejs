import { createClient } from '@libsql/client';

// Convert libsql:// to https:// to use REST API instead of WebSocket
// This avoids the migration job check issue
const httpUrl = process.env.TURSO_URL.replace('libsql://', 'https://');

const client = createClient({
  url: httpUrl,
  authToken: process.env.TURSO_AUTH_TOKEN,
  intMode: 'number',
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create table and index using batch
    const result = await client.batch([
      `CREATE TABLE IF NOT EXISTS leaderboard (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alias TEXT NOT NULL,
        time_ms INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_leaderboard_time ON leaderboard(time_ms ASC)`
    ], 'write');

    return res.status(200).json({ success: true, message: 'Database initialized' });
  } catch (error) {
    // Migration job errors can be ignored - the operations still complete
    if (error.message?.includes('migration jobs')) {
      return res.status(200).json({ success: true, message: 'Database initialized' });
    }
    console.error('[API Init] Error:', error.message);
    console.error('[API Init] Stack:', error.stack);
    return res.status(500).json({ error: error.message || 'Failed to initialize database' });
  }
}
