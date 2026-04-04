/**
 * Leaderboard — reads/writes via API (local or ngrok)
 * Falls back to Gist (read-only) then localStorage
 */

const GIST_RAW_URL = 'https://gist.githubusercontent.com/AkadMascot/963ee96e5f73fa14179f701cfe693951/raw/leaderboard.json';
const NGROK_API = 'https://calabouco.ngrok.io/api/leaderboard';

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

/** Detect if we're on the same origin as the API server */
function isLocalServer(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.ngrok.io') || host.endsWith('.ngrok-free.app');
}

/** Get API URL — local path if same origin, ngrok if on GitHub Pages */
function apiUrl(): string {
  if (isLocalServer()) return '/api/leaderboard';
  return NGROK_API;
}

/**
 * Fetch leaderboard — tries API first, falls back to Gist
 */
export async function fetchLeaderboard(): Promise<LeaderboardData> {
  // Try API (local or ngrok)
  try {
    const res = await fetch(apiUrl(), { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  // Fallback: read from Gist (works everywhere, read-only)
  try {
    const res = await fetch(GIST_RAW_URL + '?t=' + Date.now(), { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  return { entries: [], total: 0 };
}

/**
 * Submit score — tries API (local or ngrok), falls back to localStorage
 */
export async function submitScore(entry: Omit<LeaderboardEntry, 'timestamp'>): Promise<{ rank: number } | null> {
  const payload = { ...entry, timestamp: Date.now() };

  // Try API (local or ngrok with CORS)
  try {
    const res = await fetch(apiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  // Fallback: save to localStorage
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
