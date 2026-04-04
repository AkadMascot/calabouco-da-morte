/**
 * Leaderboard — Cloudflare Worker API
 * 
 * READ:  Worker API (KV-backed, fast) → fallback Gist
 * WRITE: Worker API (KV + Gist sync) → fallback localStorage
 */

const WORKER_API = 'https://calabouco-leaderboard.calabouco.workers.dev/api/leaderboard';
const GIST_RAW_URL = 'https://gist.githubusercontent.com/AkadMascot/963ee96e5f73fa14179f701cfe693951/raw/leaderboard.json';
const LS_KEY = 'calabouco-leaderboard';

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
 * Fetch leaderboard — Worker API → Gist fallback
 */
export async function fetchLeaderboard(): Promise<LeaderboardData> {
  // Try Worker API first (fast, KV-backed)
  try {
    const res = await fetch(WORKER_API, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch {}

  // Fallback: Gist (public, always available)
  try {
    const res = await fetch(GIST_RAW_URL + '?t=' + Date.now(), { signal: AbortSignal.timeout(5000) });
    if (res.ok) return await res.json();
  } catch {}

  return { entries: [], total: 0 };
}

/**
 * Submit score — Worker API → localStorage fallback
 */
export async function submitScore(entry: Omit<LeaderboardEntry, 'timestamp'>): Promise<{ rank: number } | null> {
  const payload = { ...entry, timestamp: Date.now() };

  // Try Worker API
  try {
    const res = await fetch(WORKER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return await res.json();
  } catch {}

  // Fallback: localStorage only
  try {
    const stored = localStorage.getItem(LS_KEY);
    const data: LeaderboardData = stored ? JSON.parse(stored) : { entries: [], total: 0 };
    data.entries.push({ ...payload, timestamp: Date.now() });
    data.entries.sort((a, b) => b.steps - a.steps);
    data.entries = data.entries.slice(0, 50);
    data.total = data.entries.length;
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    const rank = data.entries.findIndex(e => e.timestamp === payload.timestamp) + 1;
    return { rank };
  } catch {}

  return null;
}
