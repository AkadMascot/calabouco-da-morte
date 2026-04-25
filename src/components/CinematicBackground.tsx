'use client';

import { useState, useEffect, useCallback } from 'react';
import { asset } from '@/lib/basePath';

// Curated concept arts ranked by cinematic impact
const SLIDESHOW_IMAGES = [
  'section-001-poster.webp',  // silhouette in archway
  'section-294-poster.webp',  // epic boss fight
  'section-343-poster.webp',  // atmospheric rune chamber
  'section-148-poster.webp',  // legendary sword discovery
  'section-400-poster.webp',  // triumphant arena
  'section-074-poster.webp',  // mirror corridor
  'section-325-poster.webp',  // fallen hero
  'section-037-poster.webp',  // ancient god statue
];

const CROSSFADE_DURATION = 2000; // ms for crossfade transition
const SLIDE_INTERVAL = 6000;     // ms between slides

interface CinematicBackgroundProps {
  /** Overlay darkness 0-1 (default 0.55) */
  overlayOpacity?: number;
  /** Enable Ken Burns zoom (default true) */
  kenBurns?: boolean;
}

export default function CinematicBackground({
  overlayOpacity = 0.55,
  kenBurns = true,
}: CinematicBackgroundProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [transitioning, setTransitioning] = useState(false);

  const advance = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % SLIDESHOW_IMAGES.length);
      setNextIndex(prev => (prev + 1) % SLIDESHOW_IMAGES.length);
      setTransitioning(false);
    }, CROSSFADE_DURATION);
  }, []);

  useEffect(() => {
    const timer = setInterval(advance, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [advance]);

  const currentSrc = asset(`/cinematics/${SLIDESHOW_IMAGES[currentIndex]}`);
  const nextSrc = asset(`/cinematics/${SLIDESHOW_IMAGES[nextIndex]}`);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Current image */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity ${kenBurns ? 'cinematic-kb' : ''}`}
        style={{
          backgroundImage: `url(${currentSrc})`,
          opacity: transitioning ? 0 : 1,
          transitionDuration: `${CROSSFADE_DURATION}ms`,
          transitionTimingFunction: 'ease-in-out',
        }}
      />

      {/* Next image (fades in during transition) */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity ${kenBurns ? 'cinematic-kb' : ''}`}
        style={{
          backgroundImage: `url(${nextSrc})`,
          opacity: transitioning ? 1 : 0,
          transitionDuration: `${CROSSFADE_DURATION}ms`,
          transitionTimingFunction: 'ease-in-out',
        }}
      />

      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
      />

      {/* Gradient for text readability */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      {/* Vignette */}
      <div className="vignette-overlay" />
    </div>
  );
}
