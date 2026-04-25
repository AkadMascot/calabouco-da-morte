'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DiceRoll } from '@/engine/types';
import { useGameStore } from '@/engine/store';

interface DiceRollUIProps {
  diceRoll: DiceRoll;
  onNavigate: (sectionId: number) => void;
  onDamageResolved?: (damage: number) => void;
}

function roll1d6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function roll2d6(): [number, number] {
  return [roll1d6(), roll1d6()];
}

export default function DiceRollUI({ diceRoll, onNavigate, onDamageResolved }: DiceRollUIProps) {
  const { character } = useGameStore();
  const [rolling, setRolling] = useState(false);
  const [rolled, setRolled] = useState(false);
  const [displayDice, setDisplayDice] = useState<number[]>([]);
  const [result, setResult] = useState<{ total: number; success: boolean; message: string; targetSection: number } | null>(null);
  const [damageResult, setDamageResult] = useState<{ dieTotal: number; damage: number; message: string } | null>(null);

  const resolveDiceRoll = useCallback(() => {
    if (!character || rolling || rolled) return;
    setRolling(true);

    const isDamageRoll = diceRoll.type === 'damageRoll';
    const useTwoDice = isDamageRoll ? (diceRoll.dice === 2) : (diceRoll.type !== 'd6Range');

    // Animate dice for 1 second
    const animInterval = setInterval(() => {
      if (useTwoDice) {
        const [a, b] = roll2d6();
        setDisplayDice([a, b]);
      } else {
        setDisplayDice([roll1d6()]);
      }
    }, 80);

    setTimeout(() => {
      clearInterval(animInterval);

      // --- DAMAGE ROLL ---
      if (isDamageRoll) {
        let diceValues: number[];
        let dieTotal: number;

        if (diceRoll.dice === 2) {
          const [a, b] = roll2d6();
          diceValues = [a, b];
          dieTotal = a + b;
        } else {
          const d = roll1d6();
          diceValues = [d];
          dieTotal = d;
        }

        const bonus = diceRoll.bonus ?? 0;
        const multiplier = diceRoll.multiplier ?? 1;
        const damage = (dieTotal + bonus) * multiplier;

        let message: string;
        if (bonus && multiplier > 1) {
          message = `Rolled ${dieTotal} + ${bonus} = ${dieTotal + bonus} × ${multiplier} = ${damage} Stamina lost!`;
        } else if (bonus) {
          message = `Rolled ${dieTotal} + ${bonus} = ${damage} Stamina lost!`;
        } else if (multiplier > 1) {
          message = `Rolled ${dieTotal} × ${multiplier} = ${damage} Stamina lost!`;
        } else {
          message = `Rolled ${dieTotal} — ${damage} Stamina lost!`;
        }

        setDisplayDice(diceValues);
        setDamageResult({ dieTotal, damage, message });
        setRolling(false);
        setRolled(true);
        return;
      }

      // --- EXISTING ROLL TYPES ---
      let total: number;
      let diceValues: number[];
      let success: boolean;
      let message: string;
      let targetSection: number;

      if (diceRoll.type === 'd6Range') {
        const d = roll1d6();
        diceValues = [d];
        total = d;
        // Find matching range
        const range = diceRoll.ranges?.find(r => d >= r.min && d <= r.max);
        targetSection = range?.targetSection ?? 1;
        success = true;
        message = `Result: ${d}`;
      } else {
        const [a, b] = roll2d6();
        diceValues = [a, b];
        total = a + b;

        switch (diceRoll.type) {
          case 'skillCheck': {
            const skill = character.skillCurrent;
            success = total <= skill;
            message = success
              ? `${total} ≤ ${skill} (Skill) — Success!`
              : `${total} > ${skill} (Skill) — Failed!`;
            targetSection = success ? diceRoll.successSection! : diceRoll.failSection!;
            break;
          }
          case 'skillAndStaminaCheck': {
            const skillOk = total <= character.skillCurrent;
            const staminaOk = total <= character.staminaCurrent;
            success = skillOk && staminaOk;
            message = success
              ? `${total} ≤ SKL ${character.skillCurrent} & STA ${character.staminaCurrent} — Success!`
              : `${total} > SKL ${character.skillCurrent} or STA ${character.staminaCurrent} — Failed!`;
            targetSection = success ? diceRoll.successSection! : diceRoll.failSection!;
            break;
          }
          case 'fixedThreshold': {
            const threshold = diceRoll.threshold!;
            if (diceRoll.exactSection !== undefined) {
              // Exact match type (section 290: == 8)
              success = total === threshold;
              message = success
                ? `${total} = ${threshold} — Exact!`
                : `${total} ≠ ${threshold}`;
              targetSection = success ? diceRoll.exactSection! : diceRoll.otherSection!;
            } else if (diceRoll.aboveSection !== undefined) {
              // Above threshold (section 84: > 8)
              success = total > threshold;
              message = success
                ? `${total} > ${threshold} — Above!`
                : `${total} ≤ ${threshold} — Below!`;
              targetSection = success ? diceRoll.aboveSection! : diceRoll.belowOrEqualSection!;
            } else {
              // Below threshold (section 191: < 8)
              success = total < threshold;
              message = success
                ? `${total} < ${threshold} — Below!`
                : `${total} ≥ ${threshold} — Above!`;
              targetSection = success ? diceRoll.belowSection! : diceRoll.equalOrAboveSection!;
            }
            break;
          }
          default:
            success = false;
            message = 'Error';
            targetSection = 1;
        }
      }

      setDisplayDice(diceValues);
      setResult({ total, success, message, targetSection });
      setRolling(false);
      setRolled(true);
    }, 1000);
  }, [character, rolling, rolled, diceRoll]);

  // Auto-navigate after showing result for 2.5 seconds (non-damage rolls)
  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => {
        onNavigate(result.targetSection);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [result, onNavigate]);

  // Auto-resolve damage after showing result for 2.5 seconds
  useEffect(() => {
    if (damageResult && onDamageResolved) {
      const timer = setTimeout(() => {
        onDamageResolved(damageResult.damage);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [damageResult, onDamageResolved]);

  if (!character) return null;

  // Description of what's being tested
  const testDescription = (() => {
    switch (diceRoll.type) {
      case 'skillCheck': return 'Skill Test — Roll 2 dice';
      case 'skillAndStaminaCheck': return 'Skill and Stamina Test — Roll 2 dice';
      case 'fixedThreshold': return `Luck Test — Roll 2 dice (target: ${diceRoll.threshold})`;
      case 'd6Range': return 'Roll 1 die';
      case 'damageRoll': return diceRoll.description ?? `Roll ${diceRoll.dice === 2 ? '2 dice' : '1 die'} for damage`;
      default: return 'Roll the dice';
    }
  })();

  const isDamage = diceRoll.type === 'damageRoll';

  return (
    <div className="w-full max-w-sm sm:max-w-md flex flex-col items-center gap-4">
      {/* Test description */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-amber-400 text-sm sm:text-base font-bold text-center tracking-wide game-text-shadow"
      >
        🎲 {testDescription}
      </motion.div>

      {/* Dice display */}
      <div className="flex gap-4 justify-center">
        {displayDice.map((d, i) => (
          <motion.div
            key={i}
            animate={rolling ? { rotate: [0, 360], scale: [1, 1.2, 1] } : { rotate: 0, scale: 1 }}
            transition={rolling ? { duration: 0.3, repeat: Infinity } : { duration: 0.3 }}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 flex items-center justify-center text-3xl sm:text-4xl font-bold font-mono ${
              rolling
                ? 'border-gray-600 bg-gray-900/60 text-gray-400'
                : isDamage
                  ? 'border-red-500/60 bg-red-950/40 text-red-400'
                  : result?.success
                    ? 'border-green-500/60 bg-green-950/40 text-green-400'
                    : 'border-red-500/60 bg-red-950/40 text-red-400'
            } backdrop-blur-md`}
          >
            {d}
          </motion.div>
        ))}
      </div>

      {/* Total */}
      {displayDice.length > 0 && !rolling && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-gray-400 text-sm"
        >
          Total: <span className="text-white font-bold font-mono">{displayDice.reduce((a, b) => a + b, 0)}</span>
        </motion.div>
      )}

      {/* Result message — navigation rolls */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`text-center px-6 py-3 rounded-xl font-bold text-sm sm:text-base backdrop-blur-md ${
              result.success
                ? 'bg-green-950/50 text-green-400 border border-green-600/40'
                : 'bg-red-950/50 text-red-400 border border-red-600/40'
            }`}
          >
            {result.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result message — damage rolls */}
      <AnimatePresence>
        {damageResult && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="text-center px-6 py-3 rounded-xl font-bold text-sm sm:text-base backdrop-blur-md bg-red-950/50 text-red-400 border border-red-600/40"
          >
            {damageResult.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roll button */}
      {!rolled && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={resolveDiceRoll}
          disabled={rolling}
          className="px-8 py-3 sm:px-10 sm:py-4 rounded-xl border border-amber-700/60 bg-amber-950/40 backdrop-blur-md text-amber-400 hover:bg-amber-900/40 hover:border-amber-500/60 transition-all font-bold disabled:opacity-40 disabled:cursor-not-allowed text-base sm:text-lg game-text-shadow"
        >
          {rolling ? '🎲 Rolling...' : '🎲 Roll Dice'}
        </motion.button>
      )}

      {/* Auto-navigate/resolve indicator */}
      {rolled && (result || damageResult) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          className="text-gray-500 text-xs"
        >
          Continuing...
        </motion.div>
      )}
    </div>
  );
}
