'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/engine/store';

/**
 * Syncs the game log to the server API every 10 seconds and on important events.
 * This lets AkadMascot pull the log to debug continuity issues.
 */
export function useGameLogSync() {
  const store = useGameStore();
  const lastSyncRef = useRef(0);

  useEffect(() => {
    const sync = () => {
      const { character, gameLog, gamePhase } = useGameStore.getState();
      if (!character || gameLog.length === 0) return;
      if (gameLog.length === lastSyncRef.current) return;

      lastSyncRef.current = gameLog.length;

      const payload = {
        timestamp: Date.now(),
        currentSection: character.currentSection,
        gamePhase,
        stats: {
          skill: character.skillCurrent,
          stamina: character.staminaCurrent,
          luck: character.luckCurrent,
          provisions: character.provisions,
        },
        inventory: character.inventory,
        log: gameLog.map(e => ({
          from: e.from,
          to: e.to,
          choice: e.choiceText || undefined,
          event: e.event,
        })),
        path: gameLog.map(e => e.to),
      };

      fetch('/api/gamelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {}); // Silently fail — don't disrupt gameplay
    };

    // Sync every 10 seconds
    const interval = setInterval(sync, 10000);

    // Also sync on visibility change (tab switch / close)
    const handleVisibility = () => {
      if (document.hidden) sync();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Sync immediately on death or victory
  const gamePhase = store.gamePhase;
  useEffect(() => {
    if (gamePhase === 'dead' || gamePhase === 'victory') {
      const { character, gameLog } = useGameStore.getState();
      if (!character || gameLog.length === 0) return;

      const payload = {
        timestamp: Date.now(),
        currentSection: character.currentSection,
        gamePhase,
        stats: {
          skill: character.skillCurrent,
          stamina: character.staminaCurrent,
          luck: character.luckCurrent,
          provisions: character.provisions,
        },
        inventory: character.inventory,
        log: gameLog.map(e => ({
          from: e.from,
          to: e.to,
          choice: e.choiceText || undefined,
          event: e.event,
        })),
        path: gameLog.map(e => e.to),
      };

      fetch('/api/gamelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  }, [gamePhase]);
}
