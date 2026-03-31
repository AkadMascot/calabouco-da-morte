'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/engine/store';
import { getSection } from '@/engine/sections';
import { StoryPanel } from '@/components/game/StoryPanel';
import { ChoicePanel } from '@/components/game/ChoicePanel';
import type { Section } from '@/engine/types';

function applySectionEffects(section: Section) {
  const { character, updateStats, addItem, removeItem } = useGameStore.getState();
  if (!character) return;

  if (section.staminaChange || section.skillChange || section.luckChange) {
    updateStats({
      staminaChange: section.staminaChange,
      skillChange: section.skillChange,
      luckChange: section.luckChange,
    });
  }

  if (section.itemGain) {
    for (const item of section.itemGain) {
      addItem(item);
    }
  }

  if (section.itemLose) {
    for (const item of section.itemLose) {
      removeItem(item);
    }
  }

  if (section.isVictory) {
    useGameStore.getState().setGamePhase('victory');
  }
}

export default function GamePage() {
  const router = useRouter();
  const character = useGameStore((state) => state.character);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const goToSection = useGameStore((state) => state.goToSection);
  const resetGame = useGameStore((state) => state.resetGame);

  const section = character ? getSection(character.currentSection) : undefined;

  // Apply section effects when section changes
  useEffect(() => {
    if (section && character) {
      applySectionEffects(section);
    }
    // Only run when currentSection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.currentSection]);

  // Redirect to menu if no character
  useEffect(() => {
    if (!character) {
      router.push('/');
    }
  }, [character, router]);

  if (!character || !section) {
    return null;
  }

  const handleChoice = (targetSection: number) => {
    goToSection(targetSection);
  };

  const handleRestart = () => {
    resetGame();
    router.push('/');
  };

  // Victory screen
  if (section.isVictory) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-6 text-center max-w-2xl"
        >
          <h1 className="text-3xl font-bold text-amber-500 sm:text-4xl">
            Vitória!
          </h1>
          <div className="h-px w-48 bg-amber-900/50" />
          <p className="text-base leading-relaxed text-foreground sm:text-lg">
            {section.text}
          </p>
          <div className="h-px w-48 bg-amber-900/50" />
          <p className="text-amber-400 font-semibold">
            Parabéns, Campeão do Calabouço da Morte!
          </p>
          <Button
            size="lg"
            onClick={handleRestart}
            className="mt-4 bg-amber-700 text-white hover:bg-amber-600"
          >
            Jogar Novamente
          </Button>
        </motion.div>
      </main>
    );
  }

  // Death/ending screen
  if (section.isEnding || gamePhase === 'dead') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-6 text-center max-w-2xl"
        >
          <h1 className="text-3xl font-bold text-red-500 sm:text-4xl">
            Fim da Aventura
          </h1>
          <div className="h-px w-48 bg-red-900/50" />
          <p className="text-base leading-relaxed text-foreground sm:text-lg">
            {section.text}
          </p>
          <div className="h-px w-48 bg-red-900/50" />
          <p className="text-red-400 font-semibold">
            Sua aventura terminou aqui.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
            <Button
              size="lg"
              onClick={handleRestart}
              className="bg-amber-700 text-white hover:bg-amber-600"
            >
              Tentar Novamente
            </Button>
            <Button asChild variant="outline" size="lg" className="border-amber-900/50 hover:bg-amber-900/20">
              <Link href="/">Menu Principal</Link>
            </Button>
          </div>
        </motion.div>
      </main>
    );
  }

  // Normal gameplay
  return (
    <main className="flex min-h-screen flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-8">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-amber-500 sm:text-xl">
            O Calabouço da Morte
          </h1>
          <span className="text-xs text-muted-foreground">
            Seção {section.id}
          </span>
        </header>

        <div className="h-px w-full bg-amber-900/30" />

        <StoryPanel section={section} />

        {section.choices.length > 0 && (
          <>
            <div className="h-px w-full bg-amber-900/30" />
            <ChoicePanel
              choices={section.choices}
              character={character}
              onChoose={handleChoice}
            />
          </>
        )}
      </div>
    </main>
  );
}
