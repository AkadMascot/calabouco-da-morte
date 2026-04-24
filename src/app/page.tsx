'use client';
import { asset } from '@/lib/basePath';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useGameStore } from '@/engine/store';
import { fetchLeaderboard, type LeaderboardEntry } from '@/lib/leaderboard';
import { musicPlayer } from '@/lib/musicPlayer';

export default function Home() {
  const router = useRouter();
  const store = useGameStore();
  const character = store.character;
  const hasSave = character !== null && character.isAlive;
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  useEffect(() => {
    fetchLeaderboard()
      .then(data => setLeaderboard(data.entries?.slice(0, 5) || []))
      .catch(() => {});
  }, []);

  // Menu background music
  useEffect(() => { musicPlayer?.play('menu'); }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 overflow-hidden">
      {/* ─── Background with Ken Burns ─── */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center ken-burns-home"
          style={{
            backgroundImage: `url(${asset('/cinematics/splash-poster.webp')})`,
          }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/60" />
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
      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        {/* Title */}
        <div className="flex flex-col items-center gap-1">
          <h1 className="title-glow-pulse font-cinzel-deco font-bold tracking-wider text-amber-400 text-3xl sm:text-4xl md:text-5xl game-text-shadow uppercase">
            Deathtrap Dungeon
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="h-px w-8 bg-amber-700/60" />
            <p className="font-cinzel text-[10px] sm:text-xs text-amber-600/80 tracking-[0.25em] uppercase game-text-shadow">
              Fighting Fantasy
            </p>
            <span className="h-px w-8 bg-amber-700/60" />
          </div>
          <p className="font-im-fell text-xs text-amber-800/70 italic game-text-shadow mt-0.5">
            Based on the gamebook by Ian Livingstone
          </p>
        </div>

        {/* Ornamental divider */}
        <div className="flex items-center gap-2">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-amber-700/50" />
          <span className="text-amber-700/40 text-xs">⚔</span>
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-amber-700/50" />
        </div>

        <p className="max-w-sm font-im-fell text-sm text-gray-300/90 leading-relaxed game-text-shadow">
          You have been chosen to enter the Deathtrap Dungeon, Baron Sukumvit&apos;s
          deadly labyrinth. Few enter. Fewer still emerge alive.
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full max-w-[260px]">
          <button
            onClick={() => { store.resetGame(); router.push('/intro'); }}
            className="medieval-btn-primary"
          >
            <span className="font-cinzel text-sm tracking-wider uppercase">New Adventure</span>
          </button>

          {hasSave ? (
            <Link href="/game" className="medieval-btn-secondary">
              <span className="font-cinzel text-sm tracking-wider uppercase">Continue</span>
            </Link>
          ) : (
            <button disabled className="medieval-btn-secondary opacity-40 cursor-not-allowed">
              <span className="font-cinzel text-sm tracking-wider uppercase">Continue</span>
            </button>
          )}
        </div>

        {/* ─── Leaderboard ─── */}
        {leaderboard.length > 0 && (
          <div className="medieval-panel w-full max-w-[300px] mt-2">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="h-px w-6 bg-amber-700/40" />
              <h4 className="font-cinzel text-amber-500/90 text-[10px] uppercase tracking-[0.3em] game-text-shadow">Hall of Champions</h4>
              <span className="h-px w-6 bg-amber-700/40" />
            </div>
            <div className="flex flex-col gap-0.5">
              {leaderboard.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded hover:bg-amber-900/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={`font-cinzel font-bold w-5 text-[11px] ${
                      i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-700' : 'text-gray-600'
                    }`}>
                      {i === 0 ? 'I' : i === 1 ? 'II' : i === 2 ? 'III' : i === 3 ? 'IV' : 'V'}
                    </span>
                    <span className={`font-im-fell ${entry.outcome === 'victory' ? 'text-amber-300' : 'text-gray-400'}`}>
                      {entry.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] ${entry.outcome === 'victory' ? 'text-amber-600' : 'text-red-900/60'}`}>
                      {entry.outcome === 'victory' ? '♛' : '†'}
                    </span>
                    <span className="font-cinzel text-gray-500 text-[10px]">{entry.steps}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Ken Burns animation ─── */}
      <style jsx global>{`
        @keyframes kenBurnsHome {
          0% { transform: scale(1.0); }
          50% { transform: scale(1.08) translate(-0.5%, -0.3%); }
          100% { transform: scale(1.0); }
        }
        .ken-burns-home {
          animation: kenBurnsHome 30s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>
    </main>
  );
}
