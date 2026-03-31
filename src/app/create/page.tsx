'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGameStore } from '@/engine/store';
import { rollCharacterSkill, rollCharacterStamina, rollCharacterLuck } from '@/engine/dice';
import type { PotionType } from '@/engine/types';

const potionOptions: { value: PotionType; label: string; description: string }[] = [
  { value: 'skill', label: 'Pocao da Habilidade', description: 'Restaura Habilidade ao valor inicial' },
  { value: 'stamina', label: 'Pocao da Forca', description: 'Restaura Energia ao valor inicial' },
  { value: 'luck', label: 'Pocao da Fortuna', description: 'Restaura Sorte ao valor inicial' },
];

export default function CreateCharacterPage() {
  const router = useRouter();
  const createCharacter = useGameStore((state) => state.createCharacter);

  const [skill, setSkill] = useState<number | null>(null);
  const [stamina, setStamina] = useState<number | null>(null);
  const [luck, setLuck] = useState<number | null>(null);
  const [potion, setPotion] = useState<PotionType | null>(null);
  const [rolling, setRolling] = useState<string | null>(null);

  const animateRoll = (setter: (v: number) => void, rollFn: () => number, label: string) => {
    setRolling(label);
    let count = 0;
    const interval = setInterval(() => {
      setter(rollFn());
      count++;
      if (count >= 8) {
        clearInterval(interval);
        setRolling(null);
      }
    }, 80);
  };

  const allRolled = skill !== null && stamina !== null && luck !== null;
  const canConfirm = allRolled && potion !== null;

  const handleConfirm = () => {
    if (!canConfirm) return;
    createCharacter(potion, { skill: skill!, stamina: stamina!, luck: luck! });
    router.push('/game');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <h1 className="text-3xl font-bold text-amber-500 sm:text-4xl">Criar Personagem</h1>

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
            <h2 className="text-lg font-semibold text-amber-500">Escolha sua Pocao</h2>
            <div className="flex flex-col gap-2">
              {potionOptions.map((opt) => (
                <Card
                  key={opt.value}
                  className={`cursor-pointer transition-colors border ${
                    potion === opt.value
                      ? 'border-amber-500 bg-amber-900/20'
                      : 'border-amber-900/30 hover:border-amber-700/50'
                  }`}
                  onClick={() => setPotion(opt.value)}
                >
                  <CardContent className="flex flex-col gap-1 p-4">
                    <span className="font-medium text-foreground">{opt.label}</span>
                    <span className="text-sm text-muted-foreground">{opt.description}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Summary and Confirm */}
        {canConfirm && (
          <div className="flex flex-col gap-4 w-full">
            <div className="h-px w-full bg-amber-900/50" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Habilidade: {skill}</span>
              <span>Energia: {stamina}</span>
              <span>Sorte: {luck}</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Provisoes: 10 | Pocao: {potionOptions.find((p) => p.value === potion)?.label}
            </p>
            <Button
              size="lg"
              className="bg-amber-700 text-white hover:bg-amber-600 w-full"
              onClick={handleConfirm}
            >
              Comecar Aventura
            </Button>
          </div>
        )}
      </div>
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
    <Card className="border-amber-900/30">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">{formula}</span>
        </div>
        {value !== null ? (
          <span className={`text-2xl font-bold tabular-nums ${isRolling ? 'text-amber-700' : 'text-amber-500'}`}>
            {value}
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="border-amber-700 text-amber-500 hover:bg-amber-900/20"
            onClick={onRoll}
            disabled={disabled}
          >
            Rolar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
