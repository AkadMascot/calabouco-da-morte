'use client';
import { asset } from '@/lib/basePath';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGameStore } from '@/engine/store';
import { rollCharacterSkill, rollCharacterStamina, rollCharacterLuck } from '@/engine/dice';
import type { PotionType } from '@/engine/types';
import { useMusic } from '@/contexts/MusicContext';

const potionOptions: { value: PotionType; label: string; description: string }[] = [
  { value: 'skill', label: 'Poção da Habilidade', description: 'Restaura Habilidade ao valor inicial' },
  { value: 'stamina', label: 'Poção da Força', description: 'Restaura Energia ao valor inicial' },
  { value: 'luck', label: 'Poção da Fortuna', description: 'Restaura Sorte ao valor inicial' },
];

export default function CreateCharacterPage() {
  const router = useRouter();
  const createCharacter = useGameStore((state) => state.createCharacter);
  const { setTrack } = useMusic();

  // Character creation has its own music track
  useEffect(() => { setTrack('create'); }, []);

  const [skill, setSkill] = useState<number | null>(null);
  const [stamina, setStamina] = useState<number | null>(null);
  const [luck, setLuck] = useState<number | null>(null);
  const [potion, setPotion] = useState<PotionType | null>(null);
  const [rolling, setRolling] = useState<string | null>(null);
  const [showDramatic, setShowDramatic] = useState(false);

  const animateRoll = (setter: (v: number) => void, rollFn: () => number, label: string) => {
    setRolling(label);
    let count = 0;
    const interval = setInterval(() => {
      setter(rollFn());
      count++;
      if (count >= 12) {
        clearInterval(interval);
        setRolling(null);
      }
    }, 40);
  };

  const allRolled = skill !== null && stamina !== null && luck !== null;
  const canConfirm = allRolled && potion !== null;

  // Show dramatic text when potion is selected
  const handlePotionSelect = (value: PotionType) => {
    setPotion(value);
    if (!showDramatic) {
      setTimeout(() => setShowDramatic(true), 300);
    }
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    createCharacter(potion, { skill: skill!, stamina: stamina!, luck: luck! });
    router.push('/game');
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8 overflow-hidden">
      {/* ─── Background (same as home page) ─── */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${asset('/cinematics/section-001-poster.webp')})`,
            animation: 'kenBurnsCreate 30s ease-in-out infinite',
          }}
        />
        <div className="absolute inset-0 bg-black/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/70" />
      </div>

      {/* ─── Vignette ─── */}
      <div className="vignette-overlay" />

      {/* ─── Content ─── */}
      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md">
        <h1 className="text-3xl font-bold text-amber-500 sm:text-4xl game-text-shadow title-glow-pulse">
          Criar Personagem
        </h1>

        <div className="h-px w-48 bg-amber-900/50" />

        {/* Attribute Rolls */}
        <div className="flex flex-col gap-4 w-full">
          <StatRoll
            label="Habilidade"
            formula="1d6 + 6"
            value={skill}
            isRolling={rolling === 'skill'}
            onRoll={() => animateRoll(setSkill, rollCharacterSkill, 'skill')}
            disabled={skill !== null || rolling !== null}
          />
          <StatRoll
            label="Energia"
            formula="2d6 + 12"
            value={stamina}
            isRolling={rolling === 'stamina'}
            onRoll={() => animateRoll(setStamina, rollCharacterStamina, 'stamina')}
            disabled={stamina !== null || rolling !== null}
          />
          <StatRoll
            label="Sorte"
            formula="1d6 + 6"
            value={luck}
            isRolling={rolling === 'luck'}
            onRoll={() => animateRoll(setLuck, rollCharacterLuck, 'luck')}
            disabled={luck !== null || rolling !== null}
          />
        </div>

        {/* Potion Selection */}
        {allRolled && (
          <div className="flex flex-col gap-3 w-full">
            <h2 className="text-lg font-semibold text-amber-500 game-text-shadow">Escolha sua Poção</h2>
            <div className="flex flex-col gap-2">
              {potionOptions.map((opt) => (
                <Card
                  key={opt.value}
                  className={`cursor-pointer transition-all duration-300 border backdrop-blur-sm ${
                    potion === opt.value
                      ? 'border-amber-500 bg-amber-900/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'border-amber-900/30 bg-black/40 hover:border-amber-700/50 hover:bg-black/60'
                  }`}
                  onClick={() => handlePotionSelect(opt.value)}
                >
                  <CardContent className="flex flex-col gap-1 px-3 py-3 sm:p-4">
                    <span className="font-medium text-foreground game-text-shadow">{opt.label}</span>
                    <span className="text-sm text-muted-foreground">{opt.description}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Dramatic text */}
        {showDramatic && (
          <p className="dramatic-text-enter text-amber-600/90 text-sm italic text-center tracking-[0.15em] game-text-shadow">
            Que os deuses tenham piedade da sua alma.
          </p>
        )}

        {/* Summary and Confirm */}
        {canConfirm && (
          <div className="flex flex-col gap-4 w-full">
            <div className="h-px w-full bg-amber-900/50" />
            <div className="flex justify-between text-sm text-muted-foreground game-text-shadow">
              <span>Habilidade: {skill}</span>
              <span>Energia: {stamina}</span>
              <span>Sorte: {luck}</span>
            </div>
            <p className="text-sm text-muted-foreground text-center game-text-shadow">
              Provisões: 10 | Poção: {potionOptions.find((p) => p.value === potion)?.label}
            </p>
            <Button
              size="lg"
              className="bg-amber-700 text-white hover:bg-amber-600 w-full choice-btn font-bold"
              onClick={handleConfirm}
            >
              ⚔ Começar Aventura
            </Button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes kenBurnsCreate {
          0% { transform: scale(1.0); }
          50% { transform: scale(1.08) translate(1%, -0.5%); }
          100% { transform: scale(1.0); }
        }
      `}</style>
    </main>
  );
}

function StatRoll({
  label,
  formula,
  value,
  isRolling,
  onRoll,
  disabled,
}: {
  label: string;
  formula: string;
  value: number | null;
  isRolling: boolean;
  onRoll: () => void;
  disabled: boolean;
}) {
  return (
    <Card className="border-amber-900/30 bg-black/40 backdrop-blur-sm">
      <CardContent className="flex items-center justify-between px-3 py-3 sm:p-4">
        <div className="flex flex-col">
          <span className="font-medium text-foreground game-text-shadow">{label}</span>
          <span className="text-xs text-muted-foreground">{formula}</span>
        </div>
        {value !== null ? (
          <span className={`text-2xl font-bold tabular-nums game-text-shadow ${isRolling ? 'text-amber-700 animate-pulse' : 'text-amber-500'}`}>
            {value}
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="border-amber-700 text-amber-500 hover:bg-amber-900/20 choice-btn"
            onClick={onRoll}
            disabled={disabled}
          >
            🎲 Rolar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
