'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/engine/store';

export default function Home() {
  const character = useGameStore((state) => state.character);
  const hasSave = character !== null && character.isAlive;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-amber-500 sm:text-5xl md:text-6xl">
            O Calabouço da Morte
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Aventuras Fantásticas 05
          </p>
        </div>

        <div className="mt-4 h-px w-48 bg-amber-900/50" />

        <p className="max-w-md text-sm text-muted-foreground">
          Você foi selecionado para entrar no Calabouço de Doente, o labirinto
          mortal do Barão Doente. Poucos entram. Menos ainda saem com vida.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button asChild size="lg" className="bg-amber-700 text-white hover:bg-amber-600">
            <Link href="/create">Nova Aventura</Link>
          </Button>

          <Button
            asChild={hasSave}
            variant="outline"
            size="lg"
            disabled={!hasSave}
            className="border-amber-900/50 hover:bg-amber-900/20"
          >
            {hasSave ? (
              <Link href="/game">Continuar</Link>
            ) : (
              'Continuar'
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}
