'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Character } from '@/engine/types';

interface EndScreenProps {
  type: 'death' | 'victory';
  sectionsVisited: number;
  itemsCollected: number;
  character: Character;
  onRetry: () => void;
  onMenu: () => void;
}

interface LeaderboardEntry {
  name: string;
  steps: number;
  section: number;
  outcome: string;
  timestamp: number;
}

export default function EndScreen({ type, sectionsVisited, itemsCollected, character, onRetry, onMenu }: EndScreenProps) {
  const [playerName, setPlayerName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [rank, setRank] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const isDeath = type === 'death';
  const accentColor = isDeath ? 'red' : 'amber';

  // Leaderboard disabled for static export (no API routes)
  useEffect(() => {
    // Load from localStorage as fallback
    try {
      const stored = localStorage.getItem('leaderboard');
      if (stored) setLeaderboard(JSON.parse(stored));
    } catch {}
  }, []);

  const handleSubmit = async () => {
    if (!playerName.trim()) return;

    const payload = {
      name: playerName.trim(),
      steps: sectionsVisited,
      section: character.currentSection,
      outcome: type,
      skill: character.skillCurrent,
      stamina: character.staminaCurrent,
      luck: character.luckCurrent,
      inventory: character.inventory,
    };

    try {
      // Save to localStorage (static export — no server API)
      const stored = JSON.parse(localStorage.getItem('leaderboard') || '[]');
      stored.push({ ...payload, timestamp: Date.now() });
      stored.sort((a: any, b: any) => (b.outcome === 'victory' ? 1 : 0) - (a.outcome === 'victory' ? 1 : 0) || a.steps - b.steps);
      localStorage.setItem('leaderboard', JSON.stringify(stored.slice(0, 50)));
      setRank(stored.findIndex((e: any) => e.name === payload.name && e.timestamp) + 1);
      setSubmitted(true);
      setLeaderboard(stored.slice(0, 10));
      setShowLeaderboard(true);
    } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      className="text-center mb-4 flex flex-col items-center w-full max-w-sm sm:max-w-md"
    >
      {/* Title */}
      <div className={`${isDeath ? 'death-title text-red-500' : 'victory-title text-amber-400'} text-xl sm:text-2xl md:text-3xl font-bold mb-2 tracking-wider game-text-shadow`}>
        {isDeath ? 'O CALABOUÇO COBRA MAIS UMA VIDA' : 'CAMPEÃO DO CALABOUÇO DA MORTE'}
      </div>
      {isDeath
        ? <p className="text-gray-400 text-xs sm:text-sm mb-4 italic game-text-shadow">Sua jornada terminou nas profundezas...</p>
        : <>
            <p className="text-amber-200/80 text-base sm:text-lg mb-1 font-light game-text-shadow">10.000 Peças de Ouro são suas!</p>
            <p className="text-gray-400 text-xs sm:text-sm mb-4 italic game-text-shadow">O segredo de Fang foi revelado.</p>
          </>
      }

      {/* Journey stats */}
      <div className={`bg-black/70 backdrop-blur-md rounded-xl border border-${accentColor}-900/40 p-4 mb-4 w-full`}>
        <h4 className={`text-${accentColor}-400/80 text-xs uppercase tracking-widest mb-2 game-text-shadow`}>Sua Jornada</h4>
        <div className="flex justify-around text-sm">
          <div className="text-center">
            <div className={`font-mono font-bold text-lg text-${accentColor}-400`}>{sectionsVisited}</div>
            <div className="text-gray-500 text-xs">Passos</div>
          </div>
          <div className="text-center">
            <div className={`font-mono font-bold text-lg text-${accentColor}-400`}>{itemsCollected}</div>
            <div className="text-gray-500 text-xs">Itens</div>
          </div>
          <div className="text-center">
            <div className={`font-mono font-bold text-lg text-${accentColor}-400`}>§{character.currentSection}</div>
            <div className="text-gray-500 text-xs">Seção</div>
          </div>
        </div>
      </div>

      {/* Name input + Ranking submit */}
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full mb-4"
          >
            <p className="text-gray-400 text-xs mb-2 game-text-shadow">Registre seu nome no ranking dos aventureiros</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Seu nome..."
                maxLength={20}
                className="flex-1 px-3 py-2 rounded-lg bg-black/60 border border-gray-700 text-gray-100 text-sm placeholder-gray-600 focus:border-amber-600 focus:outline-none backdrop-blur-md"
                autoFocus
              />
              <button
                onClick={handleSubmit}
                disabled={!playerName.trim()}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-30 ${
                  isDeath
                    ? 'bg-red-900/60 hover:bg-red-800/80 text-white border border-red-700/30'
                    : 'bg-amber-700 hover:bg-amber-600 text-white'
                }`}
              >
                Registrar
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="rank"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full mb-4"
          >
            <div className={`bg-black/60 backdrop-blur-md rounded-xl border border-${accentColor}-700/40 p-4 text-center`}>
              <div className="text-amber-400 text-2xl font-bold mb-1">#{rank}</div>
              <div className="text-gray-400 text-xs">no ranking dos aventureiros</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leaderboard */}
      {showLeaderboard && leaderboard.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-black/70 backdrop-blur-md rounded-xl border border-amber-900/30 p-3 mb-4 max-h-48 overflow-y-auto"
        >
          <h4 className="text-amber-500/80 text-xs uppercase tracking-widest mb-2 text-center game-text-shadow">Ranking</h4>
          <div className="flex flex-col gap-1">
            {leaderboard.slice(0, 10).map((entry, i) => (
              <div
                key={i}
                className={`flex items-center justify-between text-xs px-2 py-1.5 rounded ${
                  submitted && rank === i + 1
                    ? `bg-${accentColor}-900/30 border border-${accentColor}-700/30`
                    : 'bg-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold w-5 ${i < 3 ? 'text-amber-400' : 'text-gray-500'}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </span>
                  <span className={entry.outcome === 'victory' ? 'text-amber-300' : 'text-gray-300'}>
                    {entry.name}
                  </span>
                  <span className="text-gray-600">
                    {entry.outcome === 'victory' ? '🏆' : '💀'}
                  </span>
                </div>
                <span className="font-mono text-gray-400">{entry.steps} passos</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Show leaderboard toggle if not shown */}
      {!showLeaderboard && submitted && (
        <button
          onClick={() => setShowLeaderboard(true)}
          className="text-amber-500/60 text-xs mb-3 hover:text-amber-400 transition-colors"
        >
          Ver ranking completo ▾
        </button>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className={`px-4 py-2 sm:px-6 sm:py-3 rounded-lg transition-colors font-bold choice-btn game-text-shadow text-sm sm:text-base ${
            isDeath
              ? 'bg-red-900/60 hover:bg-red-800/80 text-white border border-red-700/30'
              : 'bg-amber-700 hover:bg-amber-600 text-white'
          }`}
        >
          {isDeath ? '💀 Tentar Novamente' : '🏆 Jogar Novamente'}
        </button>
        <button
          onClick={onMenu}
          className="px-4 py-2 sm:px-6 sm:py-3 bg-gray-800/60 hover:bg-gray-700/80 text-gray-300 rounded-lg transition-colors border border-gray-600/30 game-text-shadow text-sm sm:text-base"
        >
          Menu Principal
        </button>
      </div>
    </motion.div>
  );
}
