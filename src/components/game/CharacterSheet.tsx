'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/engine/store';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

function StatBar({
  label,
  current,
  max,
}: {
  label: string;
  current: number;
  max: number;
}) {
  const ratio = max > 0 ? current / max : 0;
  const isLow = ratio < 0.25;
  const barColor = isLow ? 'bg-red-500' : 'bg-amber-500';
  const textColor = isLow ? 'text-red-400' : 'text-amber-400';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={textColor}>
          {current}/{max}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-800">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={false}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

function CharacterStats() {
  const character = useGameStore((state) => state.character);

  if (!character) return null;

  return (
    <div className="flex flex-col gap-4">
      <StatBar
        label="Habilidade"
        current={character.skillCurrent}
        max={character.skillInitial}
      />
      <StatBar
        label="Energia"
        current={character.staminaCurrent}
        max={character.staminaInitial}
      />
      <StatBar
        label="Sorte"
        current={character.luckCurrent}
        max={character.luckInitial}
      />

      <div className="h-px w-full bg-amber-900/30" />

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Provisões</span>
        <span className="text-amber-400">{character.provisions}</span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Poção</span>
        <span className={character.potionUsed ? 'text-zinc-600 line-through' : 'text-amber-400'}>
          {character.potion === 'skill' && 'Habilidade'}
          {character.potion === 'stamina' && 'Força'}
          {character.potion === 'luck' && 'Fortuna'}
        </span>
      </div>

      {character.inventory.length > 0 && (
        <>
          <div className="h-px w-full bg-amber-900/30" />
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Inventário</span>
            <ul className="flex flex-col gap-0.5">
              {character.inventory.map((item, i) => (
                <li key={i} className="text-sm text-amber-400/80">
                  • {item}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

/** Desktop sidebar - always visible on lg+ screens */
export function CharacterSheetSidebar() {
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:gap-4 lg:rounded-lg lg:border lg:border-amber-900/30 lg:bg-zinc-950/80 lg:p-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500">
        Ficha do Aventureiro
      </h2>
      <div className="h-px w-full bg-amber-900/30" />
      <CharacterStats />
    </aside>
  );
}

/** Mobile bottom trigger + sheet - visible on < lg screens */
export function CharacterSheetMobile() {
  const [open, setOpen] = useState(false);
  const character = useGameStore((state) => state.character);

  if (!character) return null;

  const staminaRatio = character.staminaInitial > 0
    ? character.staminaCurrent / character.staminaInitial
    : 0;
  const isLow = staminaRatio < 0.25;

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`fixed bottom-4 right-4 z-50 border-amber-900/50 bg-zinc-950/90 backdrop-blur ${
              isLow ? 'text-red-400 border-red-900/50' : 'text-amber-400'
            }`}
          >
            ❤ {character.staminaCurrent}/{character.staminaInitial}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="border-amber-900/30 bg-zinc-950">
          <SheetHeader>
            <SheetTitle className="text-amber-500">Ficha do Aventureiro</SheetTitle>
          </SheetHeader>
          <div className="px-1 pb-4 pt-4">
            <CharacterStats />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
