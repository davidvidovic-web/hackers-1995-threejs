import { createClient } from '@libsql/client';

// Convert libsql:// to https:// for direct HTTP API access
const httpUrl = process.env.TURSO_URL.replace('libsql://', 'https://');

// Direct HTTP API function to bypass libsql client migration checks
async function executeSQL(sql, args = []) {
  const response = await fetch(httpUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.TURSO_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      statements: [{ q: sql, params: args }]
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
  }
  
  const data = await response.json();
  return data[0];
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      // Submit score
      const { alias, time_ms } = req.body;
      
      if (!alias || !time_ms) {
        return res.status(400).json({ error: 'Missing alias or time_ms' });
      }

      await executeSQL('INSERT INTO leaderboard (alias, time_ms) VALUES (?, ?)', [alias, time_ms]);

      return res.status(201).json({ success: true });
    }

    if (req.method === 'GET') {
      // Get top scores with pagination
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const result = await executeSQL(
        'SELECT alias, time_ms FROM leaderboard ORDER BY time_ms ASC LIMIT ? OFFSET ?', 
        [limit, offset]
      );
      
      // Turso HTTP API returns rows as arrays, need to map to objects
      const rows = result.results?.rows || [];
      const columns = result.results?.columns || [];
      
      const scores = rows.map(row => {
        const obj = {};
        columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        return obj;
      });
      
      return res.status(200).json({ scores });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[API Leaderboard] Error:', error.message);
    console.error('[API Leaderboard] Stack:', error.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
