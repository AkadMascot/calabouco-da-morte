'use client';
import { asset } from '@/lib/basePath';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/engine/store';

export default function Home() {
  const router = useRouter();
  const store = useGameStore();
  const character = store.character;
  const hasSave = character !== null && character.isAlive;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 overflow-hidden">
      {/* ─── Background with Ken Burns ─── */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center ken-burns-home"
          style={{
            backgroundImage: `url(${asset('/cinematics/section-001-poster.webp')})`,
          }}
        />
        {/* Dark overlay — subtle, let the art breathe */}
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40" />
      </div>

      {/* ─── Fog effect at bottom ─── */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        <div className="fog-layer fog-layer-1" />
        <div className="fog-layer fog-layer-2" />
        <div className="fog-layer fog-layer-3" />
      </div>

      {/* ─── Vignette ─── */}
      <div className="vignette-overlay z-[2]" />

      {/* ─── Content ─── */}
      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <h1 className="title-glow-pulse text-3xl font-bold tracking-tight text-amber-500 sm:text-4xl md:text-5xl game-text-shadow">
            O Calabouço da Morte
          </h1>
          <p className="text-sm text-gray-400 sm:text-base game-text-shadow">
            Aventuras Fantásticas 05
          </p>
          <p className="text-xs text-amber-700/80 italic tracking-wide game-text-shadow mt-1">
            Baseado no livro-jogo de Ian Livingstone
          </p>
        </div>

        <div className="mt-4 h-px w-48 bg-amber-900/50" />

        <p className="max-w-md text-sm text-gray-400 game-text-shadow">
          Você foi selecionado para entrar no Calabouço da Morte, o labirinto
          mortal do Barão Sukumvit. Poucos entram. Menos ainda saem com vida.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-[280px] sm:max-w-xs">
          <Button size="lg" className="bg-amber-700 text-white hover:bg-amber-600 choice-btn" onClick={() => { store.resetGame(); router.push('/intro'); }}>
            Nova Aventura
          </Button>

          <Button
            asChild={hasSave}
            variant="outline"
            size="lg"
            disabled={!hasSave}
            className="border-amber-900/50 hover:bg-amber-900/20 choice-btn"
          >
            {hasSave ? (
              <Link href="/game">Continuar</Link>
            ) : (
              'Continuar'
            )}
          </Button>
        </div>
      </div>

      {/* ─── Ken Burns animation ─── */}
      <style jsx global>{`
        @keyframes kenBurnsHome {
          0% { transform: scale(1.0); }
          50% { transform: scale(1.1) translate(-1%, -0.5%); }
          100% { transform: scale(1.0); }
        }
        .ken-burns-home {
          animation: kenBurnsHome 25s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>
    </main>
  );
}
