/**
 * Leaderboard — reads from GitHub Gist (public, works on GitHub Pages)
 * Writes go to local API when available (ngrok server)
 */

const GIST_RAW_URL = 'https://gist.githubusercontent.com/AkadMascot/963ee96e5f73fa14179f701cfe693951/raw/leaderboard.json';

export interface LeaderboardEntry {
  name: string;
  steps: number;
  section: number;
  outcome: string;
  timestamp: number;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  total: number;
  lastUpdated?: string;
}

/**
 * Fetch leaderboard — tries local API first, falls back to Gist
 */
export async function fetchLeaderboard(): Promise<LeaderboardData> {
  // Try local API first (ngrok/server mode)
  try {
    const res = await fetch('/api/leaderboard', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  // Fallback: read from Gist (GitHub Pages mode)
  try {
    const res = await fetch(GIST_RAW_URL + '?t=' + Date.now(), { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  return { entries: [], total: 0 };
}

/**
 * Submit score — tries local API, falls back to localStorage
 */
export async function submitScore(entry: Omit<LeaderboardEntry, 'timestamp'>): Promise<{ rank: number } | null> {
  const payload = { ...entry, timestamp: Date.now() };

  // Try local API first
  try {
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  // Fallback: save to localStorage leaderboard
  try {
    const stored = localStorage.getItem('calabouco-leaderboard');
    const data: LeaderboardData = stored ? JSON.parse(stored) : { entries: [], total: 0 };
    data.entries.push({ ...payload, timestamp: Date.now() });
    data.entries.sort((a, b) => b.steps - a.steps);
    data.entries = data.entries.slice(0, 50);
    data.total = data.entries.length;
    localStorage.setItem('calabouco-leaderboard', JSON.stringify(data));
    const rank = data.entries.findIndex(e => e.timestamp === payload.timestamp) + 1;
    return { rank };
  } catch {}

  return null;
}
