'use client';

import { useEffect, useRef, useCallback } from 'react';
import { asset } from '@/lib/basePath';

export type HeartbeatMode = 'calm' | 'tense' | 'combat' | 'death' | 'off';

const AUDIO_FILES: Record<string, string> = {
  calm: '/audio/heartbeat/calm.mp3',
  tense: '/audio/heartbeat/tense.mp3',
  combat: '/audio/heartbeat/combat.mp3',
  death: '/audio/heartbeat/death.mp3',
};

// Target volumes per mode
const VOLUMES: Record<string, number> = {
  calm: 0.08,
  tense: 0.14,
  combat: 0.20,
  death: 0.25,
};

/**
 * Heartbeat ambient audio + CSS variable for visual pulse.
 * 
 * Usage:
 *   const { setMode } = useHeartbeat();
 *   setMode('combat');  // switches heartbeat
 *   setMode('off');     // stops
 * 
 * CSS pulse: use var(--heartbeat-opacity) on a vignette overlay
 */
export function useHeartbeat() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentMode = useRef<HeartbeatMode>('off');
  const fadeRef = useRef<number | null>(null);

  // CSS pulse animation (sets --heartbeat-opacity on :root)
  const startPulse = useCallback((bpm: number) => {
    if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
    const interval = 60000 / bpm; // ms per beat
    const startTime = performance.now();

    const step = () => {
      const elapsed = (performance.now() - startTime) % interval;
      const phase = elapsed / interval;
      // Quick spike at beat, slow fade
      const opacity = phase < 0.15
        ? Math.sin(phase / 0.15 * Math.PI) * 0.3
        : Math.max(0, 0.3 * (1 - (phase - 0.15) / 0.85) * 0.5);
      document.documentElement.style.setProperty('--heartbeat-opacity', String(opacity));
      fadeRef.current = requestAnimationFrame(step);
    };
    fadeRef.current = requestAnimationFrame(step);
  }, []);

  const stopPulse = useCallback(() => {
    if (fadeRef.current) {
      cancelAnimationFrame(fadeRef.current);
      fadeRef.current = null;
    }
    document.documentElement.style.setProperty('--heartbeat-opacity', '0');
  }, []);

  const setMode = useCallback((mode: HeartbeatMode) => {
    if (mode === currentMode.current) return;
    currentMode.current = mode;

    const audio = audioRef.current;

    if (mode === 'off') {
      if (audio) {
        // Fade out
        const fadeOut = () => {
          if (!audio) return;
          audio.volume = Math.max(0, Math.min(1, audio.volume - 0.01));
          if (audio.volume > 0.01) {
            requestAnimationFrame(fadeOut);
          } else {
            audio.pause();
            audio.volume = 0;
          }
        };
        fadeOut();
      }
      stopPulse();
      return;
    }

    const file = AUDIO_FILES[mode];
    const targetVol = VOLUMES[mode] || 0.1;

    if (!audio) {
      const a = new Audio(asset(file));
      a.loop = mode !== 'death';
      a.volume = 0;
      audioRef.current = a;
      a.play().then(() => {
        // Fade in
        const fadeIn = () => {
          const next = Math.min(a.volume + 0.005, targetVol);
          a.volume = Math.max(0, Math.min(1, next));
          if (a.volume < targetVol - 0.001) requestAnimationFrame(fadeIn);
        };
        fadeIn();
      }).catch(() => {});
    } else {
      // Switch source
      audio.src = asset(file);
      audio.loop = mode !== 'death';
      audio.volume = 0;
      audio.play().then(() => {
        const fadeIn = () => {
          const next = Math.min(audio.volume + 0.005, targetVol);
          audio.volume = Math.max(0, Math.min(1, next));
          if (audio.volume < targetVol - 0.001) requestAnimationFrame(fadeIn);
        };
        fadeIn();
      }).catch(() => {});
    }

    // Visual pulse BPM per mode
    const bpms: Record<string, number> = { calm: 60, tense: 90, combat: 120, death: 50 };
    startPulse(bpms[mode] || 70);
  }, [startPulse, stopPulse]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      stopPulse();
    };
  }, [stopPulse]);

  return { setMode };
}
