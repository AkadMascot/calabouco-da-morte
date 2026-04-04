// Local analytics — stores in localStorage, no external deps

interface AnalyticsEvent {
  type: string;
  sectionId: number;
  timestamp: number;
  data?: Record<string, unknown>;
}

const STORAGE_KEY = 'calabouco-analytics';
const MAX_EVENTS = 5000;

function getEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: AnalyticsEvent[]) {
  const trimmed = events.slice(-MAX_EVENTS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota exceeded — silently drop oldest */
  }
}

export function trackEvent(type: string, sectionId: number, data?: Record<string, unknown>) {
  const events = getEvents();
  events.push({ type, sectionId, timestamp: Date.now(), data });
  saveEvents(events);
}

export function trackCinematicStarted(sectionId: number) {
  trackEvent('cinematic_started', sectionId);
}

export function trackCinematicSkipped(sectionId: number, atProgress: number) {
  trackEvent('cinematic_skipped', sectionId, { progress: Math.round(atProgress) });
}

export function trackCinematicCompleted(sectionId: number, durationMs: number) {
  trackEvent('cinematic_completed', sectionId, { durationMs });
}

export function trackSectionVisited(sectionId: number) {
  trackEvent('section_visited', sectionId);
}

export function trackCombatResult(sectionId: number, won: boolean, rounds: number) {
  trackEvent('combat_result', sectionId, { won, rounds });
}

export function trackPlayerDeath(sectionId: number) {
  trackEvent('player_death', sectionId);
}

export function trackChoiceMade(sectionId: number, choiceIndex: number, targetSection: number) {
  trackEvent('choice_made', sectionId, { choiceIndex, targetSection });
}

export function getAnalyticsSummary() {
  const events = getEvents();
  const skipped = events.filter(e => e.type === 'cinematic_skipped');
  const completed = events.filter(e => e.type === 'cinematic_completed');
  const deaths = events.filter(e => e.type === 'player_death');
  const sections = events.filter(e => e.type === 'section_visited');

  const skipCounts: Record<number, number> = {};
  skipped.forEach(e => {
    skipCounts[e.sectionId] = (skipCounts[e.sectionId] || 0) + 1;
  });

  const deathCounts: Record<number, number> = {};
  deaths.forEach(e => {
    deathCounts[e.sectionId] = (deathCounts[e.sectionId] || 0) + 1;
  });

  return {
    totalEvents: events.length,
    cinematicsStarted: events.filter(e => e.type === 'cinematic_started').length,
    cinematicsSkipped: skipped.length,
    cinematicsCompleted: completed.length,
    skipRate: skipped.length / (skipped.length + completed.length) || 0,
    totalDeaths: deaths.length,
    sectionsVisited: new Set(sections.map(e => e.sectionId)).size,
    mostSkippedSections: Object.entries(skipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    deathHotspots: Object.entries(deathCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
  };
}

export function clearAnalytics() {
  localStorage.removeItem(STORAGE_KEY);
}
