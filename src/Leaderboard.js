// Leaderboard API Client (uses Vercel serverless functions)

// Use relative path for API calls - Vercel handles routing
const API_BASE = '/api';

export async function initLeaderboard() {
  try {
    const response = await fetch(`${API_BASE}/init`, {
      method: 'POST',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[Leaderboard] Init failed:', data);
      throw new Error(data.error || `Init failed: ${response.statusText}`);
    }
    
    return true;
  } catch (err) {
    console.error("[Leaderboard] Failed to init:", err);
    return false;
  }
}

export async function submitScore(alias, timeMs) {
  try {
    const response = await fetch(`${API_BASE}/leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alias, time_ms: timeMs }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Leaderboard] Submit failed:', data);
      throw new Error(data.error || `Submit failed: ${response.statusText}`);
    }

    return true;
  } catch (err) {
    console.error("[Leaderboard] Failed to submit score:", err);
    return false;
  }
}

export async function getTopScores(limit = 50, offset = 0) {
  try {
    const response = await fetch(`${API_BASE}/leaderboard?limit=${limit}&offset=${offset}`);
    
    const data = await response.json();

    if (!response.ok) {
      console.error('[Leaderboard] Fetch failed:', data);
      throw new Error(data.error || `Fetch failed: ${response.statusText}`);
    }

    return data.scores || [];
  } catch (err) {
    console.error("[Leaderboard] Failed to fetch leaderboard:", err);
    return [];
  }
}

export function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10); // 2 digits
    
    // Pad with zeros
    const m = minutes.toString().padStart(2, '0');
    const s = seconds.toString().padStart(2, '0');
    const msStr = milliseconds.toString().padStart(2, '0');
    
    return `${m}:${s}:${msStr}`;
}
