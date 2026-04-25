'use client';

import { Button } from '@/components/ui/button';
import type { Choice } from '@/engine/types';
import type { Character } from '@/engine/types';

interface ChoicePanelProps {
  choices: Choice[];
  character: Character;
  onChoose: (targetSection: number) => void;
}

function isChoiceAvailable(choice: Choice, character: Character): boolean {
  if (!choice.condition) return true;
  const { hasItem } = choice.condition;
  if (hasItem && !character.inventory.includes(hasItem)) return false;
  return true;
}

export function ChoicePanel({ choices, character, onChoose }: ChoicePanelProps) {
  return (
    <div className="flex flex-col gap-3">
      {choices.map((choice) => {
        const available = isChoiceAvailable(choice, character);
        return (
          <Button
            key={`${choice.targetSection}-${choice.text}`}
            variant="outline"
            size="lg"
            disabled={!available}
            onClick={() => onChoose(choice.targetSection)}
            className="w-full justify-start text-left whitespace-normal h-auto py-3 border-amber-900/50 hover:bg-amber-900/20 disabled:opacity-40"
          >
            {choice.text}
          </Button>
        );
      })}
    </div>
  );
}
