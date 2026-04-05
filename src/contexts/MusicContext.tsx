'use client';

import { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { asset } from '@/lib/basePath';

/**
 * Global background music system.
 * 
 * Any page can call setTrack('track-name') and it will play
 * /audio/music/{track-name}.mp3 from the public folder.
 * 
 * To add a new track: just drop the mp3 in public/audio/music/
 * and call setTrack('filename-without-extension').
 * 
 * Volume per track can be configured in TRACK_VOLUMES below,
 * otherwise defaults to 0.12.
 */

interface MusicContextType {
  /** Play a track by name (loads /audio/music/{name}.mp3). Pass null to stop. */
  setTrack: (track: string | null) => void;
  /** Override volume (0-1) for the current track */
  setVolume: (vol: number) => void;
}

const MusicContext = createContext<MusicContextType>({
  setTrack: () => {},
  setVolume: () => {},
});

export const useMusic = () => useContext(MusicContext);

// Custom volumes per track name (optional — default is 0.12)
const TRACK_VOLUMES: Record<string, number> = {
  menu: 0.15,
  intro: 0.10,
  create: 0.15,
  game: 0.12,
};

const DEFAULT_VOLUME = 0.12;

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = useRef<string | null>(null);
  const currentFile = useRef<string | null>(null);
  const targetVolume = useRef(DEFAULT_VOLUME);
  const userInteracted = useRef(false);
  const pendingTrack = useRef<string | null>(null);

  // Listen for first user interaction to unlock audio
  useEffect(() => {
    const unlock = () => {
      userInteracted.current = true;
      if (pendingTrack.current) {
        playTrack(pendingTrack.current);
        pendingTrack.current = null;
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const fadeIn = useCallback((audio: HTMLAudioElement, target: number) => {
    const step = () => {
      const next = Math.min(audio.volume + 0.003, target);
      audio.volume = Math.max(0, Math.min(1, next));
      if (audio.volume < target - 0.001) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, []);

  const smoothVolume = useCallback((audio: HTMLAudioElement, target: number) => {
    const step = () => {
      const diff = target - audio.volume;
      if (Math.abs(diff) < 0.003) {
        audio.volume = Math.max(0, Math.min(1, target));
        return;
      }
      audio.volume = Math.max(0, Math.min(1, audio.volume + diff * 0.05));
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, []);

  const playTrack = useCallback((track: string | null) => {
    if (!track) {
      // Fade out and stop
      const audio = audioRef.current;
      if (audio) {
        const fadeOut = () => {
          audio.volume = Math.max(0, Math.min(1, audio.volume - 0.008));
          if (audio.volume > 0.01) {
            requestAnimationFrame(fadeOut);
          } else {
            audio.pause();
            audio.volume = 0;
          }
        };
        fadeOut();
      }
      currentTrack.current = null;
      currentFile.current = null;
      return;
    }

    const file = `/audio/music/${track}.mp3`;
    const vol = TRACK_VOLUMES[track] ?? DEFAULT_VOLUME;
    targetVolume.current = vol;

    const sameFile = currentFile.current === file;

    if (!audioRef.current) {
      // First time — create audio element
      const a = new Audio(asset(file));
      a.loop = true;
      a.volume = 0;
      a.dataset.bgmusic = 'true';
      audioRef.current = a;
      a.play().then(() => fadeIn(a, vol)).catch(() => {});
    } else if (sameFile) {
      // Same file — just adjust volume, keep playing
      const audio = audioRef.current;
      if (audio.paused) {
        audio.play().catch(() => {});
      }
      smoothVolume(audio, vol);
    } else {
      // Different file — crossfade
      const audio = audioRef.current;
      const switchTo = () => {
        audio.volume = Math.max(0, Math.min(1, audio.volume - 0.01));
        if (audio.volume > 0.01) {
          requestAnimationFrame(switchTo);
        } else {
          audio.pause();
          audio.src = asset(file);
          audio.volume = 0;
          audio.loop = true;
          audio.dataset.bgmusic = 'true';
          audio.play().then(() => fadeIn(audio, vol)).catch(() => {});
        }
      };
      if (!audio.paused && audio.volume > 0.01) {
        switchTo();
      } else {
        audio.src = asset(file);
        audio.volume = 0;
        audio.loop = true;
        audio.dataset.bgmusic = 'true';
        audio.play().then(() => fadeIn(audio, vol)).catch(() => {});
      }
    }

    currentTrack.current = track;
    currentFile.current = file;
  }, [fadeIn, smoothVolume]);

  const setTrack = useCallback((track: string | null) => {
    if (!userInteracted.current) {
      pendingTrack.current = track;
      currentTrack.current = track;
      return;
    }
    playTrack(track);
  }, [playTrack]);

  const setVolume = useCallback((vol: number) => {
    targetVolume.current = vol;
    if (audioRef.current && !audioRef.current.paused) {
      smoothVolume(audioRef.current, vol);
    }
  }, [smoothVolume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <MusicContext.Provider value={{ setTrack, setVolume }}>
      {children}
    </MusicContext.Provider>
  );
}
