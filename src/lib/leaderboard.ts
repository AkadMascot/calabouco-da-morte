/**
 * Leaderboard — 100% client-side, no server needed.
 * 
 * READ:  GitHub Gist (public, no auth) + localStorage
 * WRITE: localStorage only (per-browser)
 * 
 * Gist contains "seed" entries (curated/historic scores).
 * localStorage contains the current player's scores.
 * Display merges both, sorted by steps descending.
 */

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

/** Load local scores from localStorage */
function loadLocal(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (!stored) return [];
    const data = JSON.parse(stored);
    return Array.isArray(data.entries) ? data.entries : [];
  } catch {
    return [];
  }
}

/** Save local scores to localStorage */
function saveLocal(entries: LeaderboardEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      entries: entries.slice(0, 20), // keep max 20 local entries
      total: entries.length,
    }));
  } catch {}
}

/**
 * Fetch leaderboard — merges Gist (seed) + localStorage (player)
 */
export async function fetchLeaderboard(): Promise<LeaderboardData> {
  let gistEntries: LeaderboardEntry[] = [];

  // Fetch seed entries from Gist
  try {
    const res = await fetch(GIST_RAW_URL + '?t=' + Date.now(), {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      gistEntries = Array.isArray(data.entries) ? data.entries : [];
    }
  } catch {}

  // Merge with local entries
  const localEntries = loadLocal();
  const all = [...gistEntries, ...localEntries];

  // Dedupe by timestamp (in case same entry exists in both)
  const seen = new Set<number>();
  const unique = all.filter(e => {
    if (seen.has(e.timestamp)) return false;
    seen.add(e.timestamp);
    return true;
  });

  // Sort by steps descending, take top 50
  unique.sort((a, b) => b.steps - a.steps);
  const top = unique.slice(0, 50);

  return { entries: top, total: top.length };
}

/**
 * Submit score — saves to localStorage, returns rank in merged leaderboard
 */
export async function submitScore(entry: Omit<LeaderboardEntry, 'timestamp'>): Promise<{ rank: number } | null> {
  const newEntry: LeaderboardEntry = {
    ...entry,
    name: String(entry.name).slice(0, 30),
    timestamp: Date.now(),
  };

  // Save to localStorage
  const local = loadLocal();
  local.push(newEntry);
  local.sort((a, b) => b.steps - a.steps);
  saveLocal(local);

  // Get merged leaderboard to calculate rank
  const merged = await fetchLeaderboard();
  const rank = merged.entries.findIndex(e => e.timestamp === newEntry.timestamp) + 1;

  return { rank: rank || merged.entries.length };
}
