'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LuckTest } from '@/engine/types';
import { useGameStore } from '@/engine/store';

interface LuckTestUIProps {
  luckTest: LuckTest;
  onNavigate: (sectionId: number) => void;
}
export default function LuckTestUI({ luckTest, onNavigate }: LuckTestUIProps) {
  const { character, updateStats } = useGameStore();
  const [phase, setPhase] = useState<'ready' | 'rolling' | 'result'>('ready');
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [isLucky, setIsLucky] = useState(false);
  const [rollTotal, setRollTotal] = useState(0);

  const doTest = useCallback(() => {
    if (!character || phase !== 'ready') return;
    setPhase('rolling');

    // Animate dice
    const animInterval = setInterval(() => {
      setDice([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
    }, 80);

    setTimeout(() => {
      clearInterval(animInterval);
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2;
      const lucky = total <= character.luckCurrent;

      setDice([d1, d2]);
      setRollTotal(total);
      setIsLucky(lucky);
      setPhase('result');

      // Decrease luck
      updateStats({ luckChange: -1 });
    }, 1200);
  }, [character, phase, updateStats]);

  const proceed = useCallback(() => {
    onNavigate(isLucky ? luckTest.luckySection : luckTest.unluckySection);
  }, [onNavigate, isLucky, luckTest]);

  if (!character) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-6 w-full max-w-lg"
    >
      {/* Description */}
      {luckTest.description && (
        <p className="text-gray-300 text-center text-sm">{luckTest.description}</p>
      )}

      {/* Luck display */}
      <div className="text-center text-sm text-gray-400">
        Sorte atual: <span className="text-amber-400 font-mono font-bold">{character.luckCurrent}</span>
      </div>

      {/* Dice display */}
      <AnimatePresence>
        {phase !== 'ready' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex gap-6 justify-center"
          >
            <motion.div
              animate={phase === 'rolling' ? { rotate: [0, 360] } : { rotate: 0 }}
              transition={phase === 'rolling' ? { duration: 0.3, repeat: Infinity } : {}}
              className={`w-16 h-16 flex items-center justify-center rounded-xl border-2 text-2xl font-mono font-bold ${
                phase === 'result'
                  ? isLucky ? 'border-green-500 text-green-400 bg-green-950/30' : 'border-red-500 text-red-400 bg-red-950/30'
                  : 'border-amber-700 text-amber-400 bg-amber-950/30'
              }`}
            >
              {dice[0]}
            </motion.div>
            <motion.div
              animate={phase === 'rolling' ? { rotate: [0, -360] } : { rotate: 0 }}
              transition={phase === 'rolling' ? { duration: 0.3, repeat: Infinity } : {}}
              className={`w-16 h-16 flex items-center justify-center rounded-xl border-2 text-2xl font-mono font-bold ${
                phase === 'result'
                  ? isLucky ? 'border-green-500 text-green-400 bg-green-950/30' : 'border-red-500 text-red-400 bg-red-950/30'
                  : 'border-amber-700 text-amber-400 bg-amber-950/30'
              }`}
            >
              {dice[1]}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      {phase === 'result' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: [1.3, 1] }}
            transition={{ duration: 0.4 }}
            className={`text-2xl font-bold mb-2 ${isLucky ? 'text-green-400' : 'text-red-400'}`}
          >
            {isLucky ? 'Sorte!' : 'Azar!'}
          </motion.div>
          <p className="text-gray-400 text-sm mb-4">
            Rolou {rollTotal} {isLucky ? '≤' : '>'} {character.luckCurrent + 1} (sorte)
          </p>

          {/* Screen flash effect */}
          <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className={`fixed inset-0 pointer-events-none z-50 ${isLucky ? 'bg-green-500' : 'bg-red-500'}`}
          />

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={proceed}
            className={`px-8 py-3 rounded-lg font-bold transition-colors ${
              isLucky
                ? 'bg-green-900 hover:bg-green-800 text-green-200'
                : 'bg-red-900 hover:bg-red-800 text-red-200'
            }`}
          >
            Continuar
          </motion.button>
        </motion.div>
      )}

      {/* Test button */}
      {phase === 'ready' && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.95 }}
          onClick={doTest}
          className="w-full px-6 py-4 rounded-xl border border-amber-900/40 bg-black/60 backdrop-blur-md text-amber-400 hover:bg-amber-900/30 hover:border-amber-600/60 transition-all text-center font-bold"
        >
          Teste sua Sorte
        </motion.button>
      )}
    </motion.div>
  );
}
