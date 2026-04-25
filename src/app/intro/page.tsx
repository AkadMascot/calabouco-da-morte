'use client';
import { asset } from '@/lib/basePath';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import introConfig from '@/data/intro-config.json';
import { musicPlayer } from '@/lib/musicPlayer';
import CinematicBackground from '@/components/CinematicBackground';

type Beat = typeof introConfig.beats[0];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function IntroPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const narrationRef = useRef<HTMLAudioElement | null>(null);
  // Background music — low volume, narration dominates
  useEffect(() => { musicPlayer?.play('intro'); }, []);

  const [started, setStarted] = useState(false); // User must click to start
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [subtitleText, setSubtitleText] = useState('');
  const [typewriterDone, setTypewriterDone] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const beat = introConfig.beats[currentBeatIndex] as Beat | undefined;
  const isLastBeat = currentBeatIndex >= introConfig.beats.length - 1;

  // Pre-select random variants for all beats on mount
  useEffect(() => {
    const variants = introConfig.beats.map(b => pickRandom(b.variants));
    setSelectedVariants(variants);
  }, []);

  // Get current video URL
  const videoSrc = beat && selectedVariants.length > 0
    ? asset(`/cinematics/intro/beat-${beat.id}-${selectedVariants[currentBeatIndex]}.mp4`)
    : '';

  // Narration MP3 URL (beats 01-11 have narration, beat 12 does not)
  const narrationSrc = beat && beat.id !== '12'
    ? asset(`/cinematics/intro/beat-${beat.id}-narration.mp3`)
    : '';

  // Play narration audio synced with each beat
  useEffect(() => {
    if (!started || !narrationSrc) {
      // No narration for this beat — clean up
      if (narrationRef.current) {
        narrationRef.current.pause();
        narrationRef.current = null;
      }
      return;
    }
    // Stop previous narration
    if (narrationRef.current) {
      narrationRef.current.pause();
    }
    const audio = new Audio(narrationSrc);
    audio.volume = 1.0;
    narrationRef.current = audio;
    // Delay narration slightly for cinematic feel
    const t = setTimeout(() => {
      audio.play().catch(() => {});
    }, 800);
    return () => {
      clearTimeout(t);
      audio.pause();
    };
  }, [started, currentBeatIndex, narrationSrc]);

  // ─── START HANDLER ───
  // User interaction unlocks autoplay for the entire session
  const handleStart = useCallback(() => {
    setStarted(true);
    // Play the first video immediately after user click (muted — narration is separate)
    setTimeout(() => {
      const v = videoRef.current;
      if (v) {
        v.muted = true;
        v.play().catch(() => {});
      }
    }, 100);
  }, []);

  // Typewriter effect — speed per beat from config
  useEffect(() => {
    if (!showSubtitle || !beat?.subtitle) return;
    setTypewriterDone(false);
    setSubtitleText('');

    let i = 0;
    const text = beat.subtitle;
    const speed = (beat as Beat & { typewriterSpeed?: number }).typewriterSpeed || 50;
    const interval = setInterval(() => {
      i++;
      setSubtitleText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setTypewriterDone(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [showSubtitle, currentBeatIndex, beat]);

  // Handle video end → advance to next beat
  const handleVideoEnd = useCallback(() => {
    if (isLastBeat) {
      router.push('/create');
      return;
    }
    setShowSubtitle(false);
    setSubtitleText('');
    setCurrentBeatIndex(prev => prev + 1);
  }, [isLastBeat, router]);

  // Auto-play next beat video (muted — narration is separate)
  useEffect(() => {
    if (!started || currentBeatIndex === 0) return;
    const v = videoRef.current;
    if (v) {
      v.muted = true;
      v.play().catch(() => {});
    }
  }, [currentBeatIndex, started]);

  // Show subtitle after video starts
  useEffect(() => {
    if (!started) return;
    const t = setTimeout(() => setShowSubtitle(true), 800);
    return () => clearTimeout(t);
  }, [currentBeatIndex, started]);

  // Skip entire intro
  const handleSkipAll = useCallback(() => {
    setSkipping(true);
    if (videoRef.current) videoRef.current.pause();
    if (narrationRef.current) narrationRef.current.pause();
    setTimeout(() => router.push('/create'), 300);
  }, [router]);

  if (!beat || selectedVariants.length === 0) {
    return <div className="w-screen h-screen bg-black" />;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* ─── START OVERLAY (user must click to unlock audio) ─── */}
      <AnimatePresence>
        {!started && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
            onClick={handleStart}
          >
            {/* Cinematic slideshow background */}
            <CinematicBackground overlayOpacity={0.45} />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="relative z-10 flex flex-col items-center gap-6"
            >
              <h2 className="text-amber-400 text-3xl sm:text-4xl font-cinzel-deco font-bold tracking-wider game-text-shadow uppercase text-center">
                Deathtrap Dungeon
              </h2>
              <p className="text-gray-400 text-sm font-im-fell italic">Fighting Fantasy</p>
              <motion.button
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="mt-4 medieval-btn-primary"
              >
                <span className="font-cinzel text-sm tracking-wider uppercase">▶ Begin</span>
              </motion.button>
              <p className="text-gray-600 text-xs mt-2 font-im-fell">Tap to start with audio</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transition overlay */}
      <AnimatePresence>
        {skipping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-black"
          />
        )}
      </AnimatePresence>

      {/* Video — MUTED (narration plays as separate .mp3 audio) */}
      {started && (
        <video
          key={`intro-${currentBeatIndex}-${selectedVariants[currentBeatIndex]}`}
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain bg-black"
          src={videoSrc}
          playsInline
          preload="auto"
          onEnded={handleVideoEnd}
        />
      )}

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none vignette-overlay" />

      {/* Bottom gradient for subtitle readability */}
      {started && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 25%, transparent 50%)' }}
        />
      )}

      {/* Subtitle with typewriter */}
      <AnimatePresence>
        {started && showSubtitle && beat.subtitle && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute bottom-12 sm:bottom-16 left-0 right-0 z-10 flex justify-center px-4 sm:px-8"
          >
            <p className="text-gray-100 text-base sm:text-lg md:text-xl font-im-fell italic text-center max-w-3xl leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              {subtitleText}
              {!typewriterDone && <span className="animate-pulse text-amber-500">|</span>}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Beat indicator (subtle dots) */}
      {started && (
        <div className="absolute bottom-3 sm:bottom-4 left-0 right-0 z-10 flex justify-center gap-1.5">
          {introConfig.beats.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === currentBeatIndex ? 'bg-amber-500 scale-125' : i < currentBeatIndex ? 'bg-amber-500/40' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      )}

      {/* Skip button */}
      {started && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 3 }}
          whileHover={{ opacity: 1 }}
          onClick={handleSkipAll}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 text-white/60 hover:text-white text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-white/20 hover:border-white/40 backdrop-blur-sm transition-all"
        >
          Skip ▸▸
        </motion.button>
      )}
    </div>
  );
}
