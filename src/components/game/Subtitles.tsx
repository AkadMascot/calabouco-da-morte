'use client';

import { AnimatePresence, motion } from 'framer-motion';

interface SubtitlesProps {
  text: string;
  isPlaying: boolean;
  persist?: boolean;
}

export default function Subtitles({ text, isPlaying, persist = false }: SubtitlesProps) {
  if (!text) return null;

  const visible = isPlaying || persist;

  return (
    <div className="hidden sm:flex absolute bottom-8 left-0 right-0 z-30 justify-center pointer-events-none px-4">
      <AnimatePresence>
        {visible && (
          <motion.div
            key="subtitle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="max-w-[90%] sm:max-w-[80%] text-center px-4 py-2 sm:px-6 sm:py-3 rounded-lg"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: '#ffffff',
              fontSize: 'clamp(0.85rem, 1.8vw, 1.1rem)',
              lineHeight: 1.5,
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
