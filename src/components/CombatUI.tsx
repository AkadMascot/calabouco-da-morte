'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Combat } from '@/engine/types';
import { useGameStore } from '@/engine/store';

interface CombatUIProps {
  combat: Combat;
  onVictory: () => void;
}

interface CombatLog {
  round: number;
  playerRoll: number;
  playerAttack: number;
  enemyRoll: number;
  enemyAttack: number;
  result: 'hit' | 'miss' | 'draw';
}

function roll2d6(): [number, number] {
  return [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
}

export default function CombatUI({ combat, onVictory }: CombatUIProps) {
  const { character, updateStats, goToSection } = useGameStore();
  const [currentEnemyIndex, setCurrentEnemyIndex] = useState(0);
  const [enemyStamina, setEnemyStamina] = useState(combat.enemies[0].stamina);
  const [rolling, setRolling] = useState(false);
  const [logs, setLogs] = useState<CombatLog[]>([]);
  const [playerDead, setPlayerDead] = useState(false);
  const [enemyDead, setEnemyDead] = useState(false);
  const [victoryHandled, setVictoryHandled] = useState(false);
  const [displayDice, setDisplayDice] = useState<{ player: [number, number]; enemy: [number, number] } | null>(null);

  const enemy = combat.enemies[currentEnemyIndex];

  const doRound = useCallback(() => {
    if (!character || rolling) return;
    setRolling(true);

    // Animate dice for 800ms
    const animInterval = setInterval(() => {
      setDisplayDice({
        player: [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1],
        enemy: [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1],
      });
    }, 80);

    setTimeout(() => {
      clearInterval(animInterval);

      const playerDice = roll2d6();
      const enemyDice = roll2d6();
      const playerAttack = playerDice[0] + playerDice[1] + character.skillCurrent;
      const enemyAttack = enemyDice[0] + enemyDice[1] + enemy.skill;

      setDisplayDice({ player: playerDice, enemy: enemyDice });

      let result: 'hit' | 'miss' | 'draw';
      if (playerAttack > enemyAttack) {
        result = 'hit';
        const newEnemyStamina = enemyStamina - 2;
        setEnemyStamina(newEnemyStamina);
        if (newEnemyStamina <= 0) {
          setEnemyDead(true);
        }
      } else if (enemyAttack > playerAttack) {
        result = 'miss';
        updateStats({ staminaChange: -2 });
        const newPlayerStamina = character.staminaCurrent - 2;
        if (newPlayerStamina <= 0) {
          setPlayerDead(true);
        }
      } else {
        result = 'draw';
      }

      setLogs(prev => [...prev, {
        round: prev.length + 1,
        playerRoll: playerDice[0] + playerDice[1],
        playerAttack,
        enemyRoll: enemyDice[0] + enemyDice[1],
        enemyAttack,
        result,
      }]);

      setRolling(false);
    }, 800);
  }, [character, rolling, enemy, enemyStamina, updateStats]);

  // Handle enemy defeated - advance to next enemy or victory
  useEffect(() => {
    if (!enemyDead) return;
    const nextIndex = currentEnemyIndex + 1;
    if (nextIndex < combat.enemies.length) {
      // Next enemy after a delay
      const timer = setTimeout(() => {
        setCurrentEnemyIndex(nextIndex);
        setEnemyStamina(combat.enemies[nextIndex].stamina);
        setEnemyDead(false);
        setLogs([]);
        setDisplayDice(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
    // All enemies defeated - victory handled by button
  }, [enemyDead, currentEnemyIndex, combat.enemies]);

  if (!character) return null;

  const allEnemiesDefeated = enemyDead && currentEnemyIndex >= combat.enemies.length - 1;
  const lastLog = logs[logs.length - 1];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px] px-4"
    >
      <div className="w-full max-w-sm sm:max-w-md flex flex-col gap-4">
        {/* Title */}
        <motion.h2
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-red-500 text-lg sm:text-xl font-bold text-center tracking-widest uppercase"
        >
          ⚔ Combat ⚔
        </motion.h2>

        {/* Enemy info */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="border border-red-900/50 bg-red-950/60 backdrop-blur-md rounded-xl p-4 text-center"
        >
          <h3 className="text-amber-400 font-bold text-base sm:text-lg">{enemy.name}</h3>
          <div className="flex justify-center gap-6 mt-2 text-sm">
            <span className="text-gray-400">SKL <span className="text-amber-500 font-mono">{enemy.skill}</span></span>
            <span className="text-gray-400">STA <span className={`font-mono ${enemyStamina <= 4 ? 'text-red-500' : 'text-amber-500'}`}>{Math.max(0, enemyStamina)}</span></span>
          </div>
          {/* Enemy stamina bar */}
          <div className="mt-2 h-2 rounded-full bg-gray-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-red-600"
              animate={{ width: `${Math.max(0, (enemyStamina / enemy.stamina) * 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>

        {/* VS divider */}
        <div className="text-center text-gray-600 text-xs tracking-widest">VS</div>

        {/* Player info */}
        <div className="border border-amber-900/50 bg-amber-950/60 backdrop-blur-md rounded-xl p-4 text-center">
          <h3 className="text-amber-400 font-bold">Adventurer</h3>
          <div className="flex justify-center gap-6 mt-2 text-sm">
            <span className="text-gray-400">SKL <span className="text-amber-500 font-mono">{character.skillCurrent}</span></span>
            <span className="text-gray-400">STA <span className={`font-mono ${character.staminaCurrent <= 4 ? 'text-red-500' : 'text-amber-500'}`}>{character.staminaCurrent}</span></span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-amber-600"
              animate={{ width: `${(character.staminaCurrent / character.staminaInitial) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Dice display */}
        <AnimatePresence>
          {displayDice && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-between px-8"
            >
              <div className="text-center">
                <div className="flex gap-2 justify-center">
                  <span className={`text-2xl font-mono font-bold ${rolling ? 'text-gray-500' : 'text-amber-400'}`}>
                    {displayDice.player[0]}
                  </span>
                  <span className={`text-2xl font-mono font-bold ${rolling ? 'text-gray-500' : 'text-amber-400'}`}>
                    {displayDice.player[1]}
                  </span>
                </div>
                <span className="text-xs text-gray-500">You</span>
              </div>
              <div className="text-center">
                <div className="flex gap-2 justify-center">
                  <span className={`text-2xl font-mono font-bold ${rolling ? 'text-gray-500' : 'text-red-400'}`}>
                    {displayDice.enemy[0]}
                  </span>
                  <span className={`text-2xl font-mono font-bold ${rolling ? 'text-gray-500' : 'text-red-400'}`}>
                    {displayDice.enemy[1]}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{enemy.name}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Last round result */}
        {lastLog && !rolling && (
          <motion.div
            key={lastLog.round}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-center text-sm font-bold py-2 rounded-lg ${
              lastLog.result === 'hit' ? 'text-green-400 bg-green-950/30' :
              lastLog.result === 'miss' ? 'text-red-400 bg-red-950/30' :
              'text-gray-400 bg-gray-900/30'
            }`}
          >
            {lastLog.result === 'hit' && `You hit! (${lastLog.playerAttack} vs ${lastLog.enemyAttack})`}
            {lastLog.result === 'miss' && `You were hit! (${lastLog.playerAttack} vs ${lastLog.enemyAttack})`}
            {lastLog.result === 'draw' && `Draw! (${lastLog.playerAttack} vs ${lastLog.enemyAttack})`}
          </motion.div>
        )}

        {/* Action buttons — combat death handled by parent EndScreen */}
        {playerDead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <h3 className="text-red-500 text-lg sm:text-xl font-bold mb-4">You died in combat!</h3>
          </motion.div>
        )}

        {allEnemiesDefeated && !playerDead && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h3 className="text-green-400 text-base sm:text-lg font-bold mb-4">Enemy defeated!</h3>
            <button
              onClick={() => { if (!victoryHandled) { setVictoryHandled(true); onVictory(); } }}
              disabled={victoryHandled}
              className="px-4 py-3 sm:px-8 sm:py-3 bg-amber-700 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              Continue
            </button>
          </motion.div>
        )}

        {!playerDead && !allEnemiesDefeated && (
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={doRound}
              disabled={rolling}
              className="flex-1 px-4 py-3 sm:px-6 sm:py-4 rounded-xl border border-red-900/60 bg-red-950/40 text-red-400 hover:bg-red-900/40 hover:border-red-600/60 transition-all font-bold disabled:opacity-40 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {rolling ? 'Fighting...' : 'Attack!'}
            </motion.button>
            {combat.escapeSection && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => goToSection(combat.escapeSection!)}
                disabled={rolling}
                className="px-4 py-3 sm:px-6 sm:py-4 rounded-xl border border-gray-700 bg-gray-900/40 text-gray-400 hover:bg-gray-800/40 transition-all disabled:opacity-40 text-sm sm:text-base"
              >
                Flee
              </motion.button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
