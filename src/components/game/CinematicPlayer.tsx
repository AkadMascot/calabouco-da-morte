'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import Subtitles from './Subtitles';

interface CinematicPlayerProps {
  sectionId: number;
  videoSrc: string;
  narrationSrc?: string;
  sfxSrc?: string;
  posterSrc: string;
  isRevisit: boolean;
  subtitleText?: string;
  onComplete: () => void;
  onSkip: () => void;
}

export default function CinematicPlayer({
  sectionId,
  videoSrc,
  narrationSrc,
  sfxSrc,
  posterSrc,
  isRevisit,
  subtitleText,
  onComplete,
  onSkip,
}: CinematicPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const sfxRef = useRef<HTMLAudioElement>(null);
  const videoDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<number | null>(null);
  const isFadingOutRef = useRef(false);
  const completeFiredRef = useRef(false);

  const [videoReady, setVideoReady] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [audioEnded, setAudioEnded] = useState(false);
  const [mediaStarted, setMediaStarted] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // M3: Volume fade-in from 0 to 1 over 500ms
  const fadeInVolume = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0;
    isFadingOutRef.current = false;
    const startTime = performance.now();
    const duration = 500; // ms

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      audio.volume = Math.max(0, Math.min(1, progress));
      if (progress < 1) {
        fadeRef.current = requestAnimationFrame(step);
      } else {
        fadeRef.current = null;
      }
    };
    // Cancel any existing fade
    if (fadeRef.current !== null) cancelAnimationFrame(fadeRef.current);
    fadeRef.current = requestAnimationFrame(step);
  }, []);

  // M3: Volume fade-out from current to 0 over remaining time (up to 1.5s)
  const fadeOutVolume = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || isFadingOutRef.current) return;
    isFadingOutRef.current = true;
    const startVolume = audio.volume;
    const startTime = performance.now();
    const remaining = Math.max((audio.duration - audio.currentTime) * 1000, 100);
    const duration = Math.min(remaining, 1500);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      audio.volume = Math.max(0, Math.min(1, startVolume * (1 - progress)));
      if (progress < 1) {
        fadeRef.current = requestAnimationFrame(step);
      } else {
        fadeRef.current = null;
      }
    };
    if (fadeRef.current !== null) cancelAnimationFrame(fadeRef.current);
    fadeRef.current = requestAnimationFrame(step);
  }, []);

  // Reset state when sectionId changes
  useEffect(() => {
    setVideoReady(false);
    setVideoEnded(false);
    setAudioEnded(false);
    setMediaStarted(false);
    setVideoProgress(0);
    setIsPlaying(false);
    isFadingOutRef.current = false;
    completeFiredRef.current = false;
    if (videoDelayTimerRef.current) {
      clearTimeout(videoDelayTimerRef.current);
      videoDelayTimerRef.current = null;
    }
    if (fadeRef.current !== null) {
      cancelAnimationFrame(fadeRef.current);
      fadeRef.current = null;
    }
  }, [sectionId]);

  // Cleanup fade on unmount
  useEffect(() => {
    return () => {
      if (fadeRef.current !== null) cancelAnimationFrame(fadeRef.current);
    };
  }, []);

  // 45s fallback timer
  useEffect(() => {
    const fallback = setTimeout(() => {
      setVideoEnded(true);
      setAudioEnded(true);
      setIsPlaying(false);
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      if (!completeFiredRef.current) {
        completeFiredRef.current = true;
        onComplete();
      }
    }, 45000);
    return () => clearTimeout(fallback);
  }, [sectionId, onComplete]);

  // Show choices IMMEDIATELY when video ends — narration plays OVER the choices
  const handleVideoEnd = useCallback(() => {
    setVideoEnded(true);
    if (!completeFiredRef.current) {
      completeFiredRef.current = true;
      onComplete();
    }
  }, [onComplete]);

  const handleAudioEnd = useCallback(() => {
    setAudioEnded(true);
    setIsPlaying(false);
  }, []);

  const handleSkip = useCallback(() => {
    if (videoRef.current) videoRef.current.pause();
    if (audioRef.current) audioRef.current.pause();
    if (sfxRef.current) sfxRef.current.pause();
    setVideoEnded(true);
    setAudioEnded(true);
    setVideoProgress(100);
    setIsPlaying(false);
    if (videoDelayTimerRef.current) {
      clearTimeout(videoDelayTimerRef.current);
      videoDelayTimerRef.current = null;
    }
    if (fadeRef.current !== null) {
      cancelAnimationFrame(fadeRef.current);
      fadeRef.current = null;
    }
    onSkip();
  }, [onSkip]);

  // Media progress tracking + M3 fade-out detection
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;

    const vDur = v?.duration || 0;
    const aDur = a?.duration || 0;
    const masterDuration = Math.max(vDur, aDur) || 1;

    if (aDur > vDur && a && a.currentTime > 0) {
      setVideoProgress((a.currentTime / masterDuration) * 100);
    } else if (v && v.currentTime > 0) {
      setVideoProgress((v.currentTime / masterDuration) * 100);
    }

    // M3: Trigger fade-out when audio is within 1.5s of ending
    if (a && aDur > 0 && (aDur - a.currentTime) <= 1.5 && !isFadingOutRef.current) {
      fadeOutVolume();
    }
  }, [fadeOutVolume]);

  // M4: Audio/Video sync with performance.now() precision
  const startSyncedPlayback = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;

    if (!v) return;

    const vDur = v.duration || 0;
    const aDur = a?.duration || 0;

    if (mediaStarted) return;
    setMediaStarted(true);
    setIsPlaying(true);

    // Choices appear ONLY when video ends (handleVideoEnd fires onComplete)

    // Start SFX ambient layer synced with video
    const startSfx = () => {
      const sfx = sfxRef.current;
      if (sfx) { sfx.volume = 0.15; sfx.play().catch(() => {}); }
    };

    if (aDur > vDur && a) {
      // M4: Use performance.now() for precise delay calculation
      const delay = (aDur - vDur) * 1000 + 100; // +100ms buffer for play() latency
      const audioStartTime = performance.now();

      a.volume = 0; // Start at 0 for fade-in
      a.play().then(() => {
        fadeInVolume();
        // Calculate actual elapsed time for more precise video start
        const elapsed = performance.now() - audioStartTime;
        const adjustedDelay = Math.max(delay - elapsed, 0);

        videoDelayTimerRef.current = setTimeout(() => {
          v.play().catch(() => {});
          startSfx();
          videoDelayTimerRef.current = null;
        }, adjustedDelay);
      }).catch(() => {});
    } else {
      v.play().catch(() => {});
      startSfx();
      if (a) {
        a.volume = 0; // Start at 0 for fade-in
        a.play().then(() => {
          fadeInVolume();
        }).catch(() => {});
      }
    }
  }, [mediaStarted, fadeInVolume]);

  const bothEnded = videoEnded && audioEnded;

  return (
    <>
      {/* POSTER behind video — visible while loading and as backdrop */}
      <img
        key={`poster-${sectionId}`}
        src={posterSrc}
        alt=""
        className="absolute inset-0 z-[1] w-full h-full object-contain sm:object-cover"
        loading="eager"
      />

     {/* VIDEO LAYER */}
     <video
       key={`section-${sectionId}`}
       ref={videoRef}
        className={`absolute inset-0 z-[2] w-full h-full object-contain sm:object-cover transition-opacity duration-300 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
        src={videoSrc}
        playsInline
        muted
        preload="auto"
        onLoadedMetadata={() => {
          setVideoReady(true);
          if (!narrationSrc) {
            if (videoRef.current) videoRef.current.volume = 1.0;
            videoRef.current?.play().catch(() => {});
            setMediaStarted(true);
            setIsPlaying(true);
          } else if (audioRef.current && audioRef.current.readyState >= 1) {
            startSyncedPlayback();
          } else {
            // Audio not ready yet — set up a listener
            console.log('[Cinematic] Video ready, waiting for audio...');
            const checkAudio = () => {
              if (audioRef.current && audioRef.current.readyState >= 1) {
                startSyncedPlayback();
              }
            };
            audioRef.current?.addEventListener('loadedmetadata', checkAudio, { once: true });
            audioRef.current?.addEventListener('canplay', checkAudio, { once: true });
            // Fallback: if audio still not ready after 3s, start anyway
            setTimeout(() => {
              if (!mediaStarted) {
                console.log('[Cinematic] Fallback: forcing playback start');
                startSyncedPlayback();
              }
            }, 3000);
          }
        }}
        onEnded={handleVideoEnd}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* NARRATION AUDIO (separate — keeps playing even after video ends) */}
      {narrationSrc && (
        <audio
          key={`narr-${sectionId}`}
          ref={audioRef}
          src={narrationSrc}
          preload="auto"
          onLoadedMetadata={() => {
            if (videoRef.current && videoRef.current.readyState >= 1) {
              startSyncedPlayback();
            }
          }}
          onEnded={handleAudioEnd}
          onTimeUpdate={handleTimeUpdate}
        />
      )}

      {/* SFX AMBIENT AUDIO (extracted VFX — footsteps, torches, echoes) */}
      {sfxSrc && (
        <audio
          key={`sfx-${sectionId}`}
          ref={sfxRef}
          src={sfxSrc}
          preload="auto"
          loop
        />
      )}

      {/* M5: SUBTITLES — persist after video ends so text stays visible with choices */}
      {subtitleText && (
        <Subtitles text={subtitleText} isPlaying={isPlaying && !bothEnded} persist={true} />
      )}

      {/* MEDIA PROGRESS BAR (tracks the longer of audio/video) */}
      {videoReady && !bothEnded && (
        <div
          className="video-progress-bar"
          style={{ width: `${videoProgress}%` }}
        />
      )}

      {/* Loading state — black with subtle shimmer */}
      {!videoReady && (
        <div className="absolute inset-0 z-[3] bg-black flex items-center justify-center">
          <div className="text-amber-500/30 text-sm animate-pulse">⚔</div>
        </div>
      )}

      {/* SKIP BUTTON */}
      {!bothEnded && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: isRevisit ? 0 : 2 }}
          onClick={handleSkip}
          className="absolute top-12 right-3 sm:top-14 sm:right-4 z-40 text-white/60 hover:text-white text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-white/20 hover:border-white/40 backdrop-blur-sm transition-all game-text-shadow"
        >
          Pular ▸▸
        </motion.button>
      )}
    </>
  );
}
