'use client';

import { motion } from 'framer-motion';
import type { Section } from '@/engine/types';

interface StoryPanelProps {
  section: Section;
}

export function StoryPanel({ section }: StoryPanelProps) {
  return (
    <motion.div
      key={section.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="prose prose-invert max-w-none"
    >
      <p className="text-base leading-relaxed text-foreground sm:text-lg">
        {section.text}
      </p>
    </motion.div>
  );
}
