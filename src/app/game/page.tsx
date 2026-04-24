'use client';
import { asset } from '@/lib/basePath';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useGameStore } from '@/engine/store';
import { getSection } from '@/engine/sections';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import cinematicsData from '@/data/cinematics.json';
import displayTextsData from '@/data/display-texts.json';
import CinematicPlayer from '@/components/game/CinematicPlayer';
import CombatUI from '@/components/CombatUI';
import LuckTestUI from '@/components/LuckTestUI';
import DiceRollUI from '@/components/DiceRollUI';
import EndScreen from '@/components/EndScreen';
import { useTypewriter } from '@/hooks/useTypewriter';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMediaPreloader } from '@/hooks/useMediaPreloader';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
// import { useGameLogSync } from '@/hooks/useGameLogSync'; // disabled for static export
import { trackCinematicStarted, trackCinematicSkipped, trackCinematicCompleted, trackSectionVisited, trackChoiceMade, trackPlayerDeath } from '@/lib/analytics';
import { registerServiceWorker } from '@/lib/register-sw';
import { musicPlayer } from '@/lib/musicPlayer';

type SectionCinematic = { composed: string; narration?: string };

export default function GamePage() {
  const router = useRouter();
  const store = useGameStore();
  const { character, goToSection: storeGoToSection, gamePhase } = store;

  // Game soundtrack
  useEffect(() => { musicPlayer?.play('game'); }, []);

  // UI State
  const [showContent, setShowContent] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // Section effects applied tracking
  const [effectsApplied, setEffectsApplied] = useState<number | null>(null);

  // Auto-advance countdown
  const [autoAdvanceCount, setAutoAdvanceCount] = useState<number | null>(null);

  // Scanlines toggle
  const [scanlinesOn, setScanlinesOn] = useState(false);

  // Combat done tracking (for post-combat choices display)
  const [combatDone, setCombatDone] = useState(false);

  // Heartbeat ambient system
  const { setMode: setHeartbeat } = useHeartbeat();

  const currentSection = character?.currentSection ?? 1;
  const section = getSection(currentSection);

  // Heartbeat mode based on game state (must be before any early return)
  useEffect(() => {
    if (!character || !section) { setHeartbeat('off'); return; }
    const isDead = !character.isAlive || character.staminaCurrent <= 0;
    const inCombat = !!section.combat && !section.isEnding && !combatDone;
    const inLuck = !!section.luckTest && !section.isEnding;
    const inDice = !!section.diceRoll && !section.isEnding;
    if (isDead) setHeartbeat('death');
    else if (inCombat && showContent) setHeartbeat('combat');
    else if (inLuck || inDice || section.staminaChange) setHeartbeat('tense');
    else setHeartbeat('calm');
  }, [character, section, combatDone, showContent, setHeartbeat]);

  // Cinematic lookup
  const sectionKey = String(currentSection);
  const cinematic: SectionCinematic | undefined =
    (cinematicsData.sections as Record<string, SectionCinematic>)[sectionKey];
  const hasCinematic = !!cinematic?.composed;

  // Display text: use short cinematic text if available, otherwise truncate book text
  const displayText = (displayTextsData as Record<string, string>)[sectionKey] 
    || (section?.text?.substring(0, 150) + '...')
    || '';

  // Typewriter effect (M9: with paragraph support)
  const typewriterEnabled = showContent && !section?.isVictory && !hasCinematic && !(!character?.isAlive || (character?.staminaCurrent ?? 0) <= 0);
  const { paragraphs: typewriterParagraphs, displayed: typewriterText, done: typewriterDone, skipToEnd: skipTypewriter } = useTypewriter(
    displayText,
    30,
    typewriterEnabled
  );

  // ─── Game log sync (sends play history to server for debugging) ───
  // useGameLogSync(); // disabled for static export

  // ─── Register Service Worker once (M6) ───
  useEffect(() => { registerServiceWorker(); }, []);

  // ─── Track section visits (M7) ───
  useEffect(() => { trackSectionVisited(currentSection); }, [currentSection]);

  // ─── Track cinematic start (M7) ───
  const cinematicStartTimeRef = useState(() => ({ current: 0 }))[0];
  useEffect(() => {
    if (hasCinematic) {
      trackCinematicStarted(currentSection);
      cinematicStartTimeRef.current = Date.now();
    }
  }, [currentSection, hasCinematic]);

  // ─── Track player death (M7) ───
  const isDead = !character?.isAlive || (character?.staminaCurrent ?? 0) <= 0;
  useEffect(() => {
    if (isDead && character) trackPlayerDeath(currentSection);
  }, [isDead]);

  // ─── Preload next section media (M2) ───
  const nextSectionIds = useMemo(() => {
    if (!section?.choices) return [];
    return section.choices.map(c => c.targetSection);
  }, [section]);
  useMediaPreloader(nextSectionIds, showContent);

  // ─── Transition-aware goToSection ───
 const goToSection = useCallback((sectionId: number) => {
    setTransitioning(true);
    setShowContent(false);
    setAutoAdvanceCount(null);
    // Stop narration/cinematic audio when navigating — but spare background music
    document.querySelectorAll<HTMLAudioElement>('audio:not([data-bgmusic])').forEach(a => { a.pause(); a.currentTime = 0; });
    setTimeout(() => {
      storeGoToSection(sectionId);
      setTimeout(() => setTransitioning(false), 50);
    }, 300);
  }, [storeGoToSection]);

  // Damage/heal flash state
  const [damageFlash, setDamageFlash] = useState<string | null>(null);

  // ─── Apply section effects on enter ───
  useEffect(() => {
    if (!section || !character || effectsApplied === currentSection) return;
    setEffectsApplied(currentSection);

    if (section.staminaChange) {
      store.updateStats({ staminaChange: section.staminaChange });
      // Show damage/heal flash
      if (section.staminaChange < 0) {
        setDamageFlash(`-${Math.abs(section.staminaChange)} Stamina`);
        setTimeout(() => setDamageFlash(null), 3000);
      } else if (section.staminaChange > 0) {
        setDamageFlash(`+${section.staminaChange} Stamina`);
        setTimeout(() => setDamageFlash(null), 3000);
      }
    }
    if (section.skillChange) {
      store.updateStats({ skillChange: section.skillChange });
      if (section.skillChange < 0) {
        setDamageFlash(`-${Math.abs(section.skillChange)} Skill`);
        setTimeout(() => setDamageFlash(null), 3000);
      }
    }
    if (section.luckChange) {
      store.updateStats({ luckChange: section.luckChange });
    }
    if (section.itemGain) {
      section.itemGain.forEach(item => store.addItem(item));
    }
    if (section.itemLose) {
      section.itemLose.forEach(item => store.removeItem(item));
    }
  }, [currentSection, section, character, effectsApplied]);

  // ─── Reset state on section change ───
  useEffect(() => {
    setShowContent(false);
    setCombatDone(false);
    setShowStats(false);
    setAutoAdvanceCount(null);
  }, [currentSection]);

  // ─── Show content when no cinematic ───
  useEffect(() => {
    const sKey = String(currentSection);
    const hasCin = !!(cinematicsData.sections as Record<string, SectionCinematic>)[sKey]?.composed;

    if (!hasCin) {
      const t = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(t);
    }
  }, [currentSection]);

  // ─── Redirect if no character (wait for Zustand to hydrate from localStorage) ───
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHydrated(true), 1000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (hydrated && !character) router.push('/');
  }, [hydrated, character, router]);

  // ─── Cinematic callbacks (with M7 analytics) ───
  const handleCinematicComplete = useCallback(() => {
    setShowContent(true);
    trackCinematicCompleted(currentSection, Date.now() - cinematicStartTimeRef.current);
  }, [currentSection]);

  const handleCinematicSkip = useCallback(() => {
    setShowContent(true);
    trackCinematicSkipped(currentSection, 0);
  }, [currentSection]);

  // ─── Combat victory handler ───
  const handleCombatVictory = useCallback(() => {
    setCombatDone(true);
    if (section?.combat?.winSection) {
      setTimeout(() => goToSection(section.combat!.winSection!), 2000);
    }
  }, [section, goToSection]);

  // Auto-advance DISABLED — player must always click to proceed

  // ─── Choice handling (with M7 analytics + game log) ───
  const handleChoice = useCallback((targetSection: number, choiceIndex: number = 0, choiceText?: string) => {
    trackChoiceMade(currentSection, choiceIndex, targetSection);
    store.logEvent({ to: targetSection, choiceText, event: 'choice' });
    goToSection(targetSection);
  }, [goToSection, currentSection, store]);

  // Filter choices by conditions
  const availableChoices = section?.choices?.filter(choice => {
    if (choice.condition?.hasItem) {
      return character?.inventory?.includes(choice.condition.hasItem);
    }
    return true;
  }) ?? [];

  // Journey stats
  const sectionsVisited = character?.visitedSections?.length ?? 0;
  const itemsCollected = character?.inventory?.length ?? 0;

  // ─── Keyboard shortcuts (M10) — must be before early return ───
  useKeyboardShortcuts({
    onSkip: hasCinematic && !showContent ? handleCinematicSkip : undefined,
    onContinue: showContent && !typewriterDone ? skipTypewriter : undefined,
    onChoice: showContent && typewriterDone ? (index: number) => {
      if (index < availableChoices.length) {
        handleChoice(availableChoices[index].targetSection, index);
      }
    } : undefined,
    onToggleStats: () => setShowStats(s => !s),
    onToggleScanlines: () => setScanlinesOn(s => !s),
    enabled: !!character && !!section,
  });

  // ─── Voice commands — "the voice in the warrior's head" ───
  // (must be before early return — hooks can't be conditional)
  const isDeadComputed = character ? (!character.isAlive || character.staminaCurrent <= 0) : false;
  const voiceChoicesReady = !!character && !!section && showContent && !isDeadComputed && availableChoices.length > 0 && (typewriterDone || hasCinematic);
  const { isListening, isSupported: voiceSupported, transcript, matchFeedback, echoPlaying, startListening, stopListening } = useSpeechRecognition(
    availableChoices,
    (choiceIndex: number) => {
      if (choiceIndex < availableChoices.length) {
        handleChoice(availableChoices[choiceIndex].targetSection, choiceIndex, availableChoices[choiceIndex].text);
      }
    },
    voiceChoicesReady
  );

  if (!character || !section) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-amber-500 text-xl game-text-shadow">Loading...</p>
      </div>
    );
  }

  const isDeadFinal = !character.isAlive || character.staminaCurrent <= 0;
  const hasCombat = !!section.combat && !section.isEnding && !combatDone;
  const hasLuckTest = !!section.luckTest && !section.isEnding;

  const hasDiceRoll = !!section.diceRoll && !section.isEnding;

  const showCombatUI = hasCombat && showContent && !isDeadFinal;
  const showLuckUI = hasLuckTest && showContent && !hasCombat && !isDeadFinal;
  const showDiceUI = hasDiceRoll && showContent && !hasCombat && !hasLuckTest && !isDeadFinal;
  const showChoicesUI = showContent && !hasCombat && !hasLuckTest && !hasDiceRoll && !isDeadFinal;

  const hpPercent = Math.round((character.staminaCurrent / character.staminaInitial) * 100);
  const skillPercent = Math.round((character.skillCurrent / character.skillInitial) * 100);
  const luckPercent = Math.round((character.luckCurrent / character.luckInitial) * 100);

  return (
    <div className={`relative w-screen h-screen overflow-hidden bg-black ${scanlinesOn ? 'scanlines-active' : ''}`}>
      {/* MAX WIDTH WRAPPER for ultra-wide screens */}
      <div className="absolute inset-0 max-w-[1920px] mx-auto">

      {/* ─── SECTION TRANSITION OVERLAY ─── */}
      <div
        className="absolute inset-0 z-50 bg-black pointer-events-none"
        style={{
          opacity: transitioning ? 1 : 0,
          transition: 'opacity 300ms ease-in-out',
        }}
      />

      {/* ─── VIGNETTE OVERLAY ─── */}
      <div className="vignette-overlay" />
      {/* Heartbeat pulse overlay — red vignette that pulses with heartbeat */}
      <div
        className="absolute inset-0 pointer-events-none z-[5]"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(80,0,0,var(--heartbeat-opacity,0)) 100%)',
          transition: 'none',
        }}
      />

      {/* ─── SCANLINE OVERLAY ─── */}
      <div className="scanline-overlay" />

      {/* ─── CINEMATIC PLAYER — camera shake while waiting for voice command ─── */}
      <div className={voiceChoicesReady && !matchFeedback ? 'camera-shake' : ''}>
      {hasCinematic && (
        <CinematicPlayer
          key={`cinematic-${currentSection}`}
          sectionId={currentSection}
          videoSrc={asset(cinematic!.composed)}
          narrationSrc={cinematic?.narration ? asset(cinematic.narration) : undefined}
          posterSrc={asset(`/cinematics/section-${String(currentSection).padStart(3, '0')}-poster.webp`)}
          isRevisit={character.visitedSections.includes(currentSection)}
          subtitleText={displayText}
          onComplete={handleCinematicComplete}
          onSkip={handleCinematicSkip}
        />
      )}

      {/* ─── FALLBACK for sections WITHOUT cinematic ─── */}
      {!hasCinematic && (
        <img
          src={asset(`/cinematics/section-${String(currentSection).padStart(3, '0')}-poster.webp`)}
          alt=""
          className="absolute inset-0 w-full h-full object-contain sm:object-cover opacity-80 bg-black"
          loading="eager"
          onError={(e) => { (e.target as HTMLImageElement).src = asset('/cinematics/section-001-poster.webp'); }}
        />
      )}
      </div>

      {/* ─── DAMAGE/HEAL FLASH ─── */}
      <AnimatePresence>
        {damageFlash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className={`absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 sm:px-6 sm:py-3 rounded-xl backdrop-blur-md font-bold text-base sm:text-lg tracking-wide ${
              damageFlash.startsWith('-') 
                ? 'bg-red-900/70 text-red-300 border border-red-600/50' 
                : 'bg-green-900/70 text-green-300 border border-green-600/50'
            }`}
          >
            {damageFlash}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── DEATH RED OVERLAY ─── */}
      {isDeadFinal && (
        <div
          className="absolute inset-0 z-[6] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(127,0,0,0.6) 0%, rgba(20,0,0,0.9) 70%, rgba(0,0,0,0.95) 100%)',
            animation: 'deathPulse 3s ease-in-out infinite',
          }}
        />
      )}

      {/* ─── GRADIENT OVERLAY ─── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: showContent
          ? 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.05) 60%, transparent 100%)'
          : 'linear-gradient(to top, rgba(0,0,0,0.2) 0%, transparent 30%)'
      }} />

      {/* ─── STATS TOGGLE ─── */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 1 }}
        onClick={() => setShowStats(!showStats)}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-40 text-amber-500/80 hover:text-amber-400 text-xs px-3 py-1.5 rounded border border-amber-900/50 hover:border-amber-700 backdrop-blur-sm transition-all"
      >
        {showStats ? '✕' : '⚔'}
      </motion.button>

      {/* ─── SCANLINES TOGGLE ─── */}
      <button
        onClick={() => setScanlinesOn(!scanlinesOn)}
        className="absolute top-3 left-3 sm:top-4 sm:left-4 z-40 text-gray-600 hover:text-gray-400 text-xs px-2 py-1 rounded border border-gray-800 hover:border-gray-600 backdrop-blur-sm transition-all"
        title="Toggle scanlines"
      >
        ▤
      </button>

      {/* ─── DEBUG: Section number ─── */}
      <div className="absolute bottom-1 right-2 z-40 text-amber-500 text-sm font-mono font-bold pointer-events-none select-none" style={{ textShadow: '0 0 4px rgba(0,0,0,0.9)' }}>
        §{currentSection}
      </div>

      {/* ─── STATS PANEL ─── */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="absolute top-0 right-0 z-30 h-full w-64 sm:w-72 bg-black/90 backdrop-blur-md border-l border-amber-900/30 p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto"
          >
            <h3 className="text-amber-500 font-bold text-sm tracking-widest uppercase game-text-shadow">Character Sheet</h3>
            <div className="flex flex-col gap-3 text-sm">
              <StatBar label="Skill" current={character.skillCurrent} max={character.skillInitial} percent={skillPercent} />
              <StatBar label="Stamina" current={character.staminaCurrent} max={character.staminaInitial} percent={hpPercent} />
              <StatBar label="Luck" current={character.luckCurrent} max={character.luckInitial} percent={luckPercent} />
              <div className="flex justify-between text-amber-500/80 mt-2">
                <span>Provisions</span>
                <span className="font-mono">{character.provisions}</span>
              </div>

              {/* Eat provision button */}
              {character.provisions > 0 && !hasCombat && (
                <button
                  onClick={() => store.eatProvision()}
                  className="text-xs px-3 py-1.5 medieval-btn-secondary font-cinzel"
                >
                  🍞 Eat Provision (+4 Stamina)
                </button>
              )}

              <div className="flex justify-between text-amber-500/80">
                <span>Potion</span>
                <span className="font-mono text-xs">{character.potionUsed ? 'Used' : character.potion === 'skill' ? 'Skill' : character.potion === 'stamina' ? 'Stamina' : 'Luck'}</span>
              </div>

              {/* Use potion button */}
              {!character.potionUsed && (
                <button
                  onClick={() => store.usePotion()}
                  className="text-xs px-3 py-1.5 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-400 rounded border border-emerald-800/30 transition-all"
                >
                  🧪 Use Potion
                </button>
              )}

              {/* Inventory */}
              {character.inventory.length > 0 && (
                <div className="mt-2">
                  <span className="text-amber-500/60 text-xs uppercase tracking-wider">Itens</span>
                  <div className="mt-1 flex flex-col gap-1">
                    {character.inventory.map((item, i) => (
                      <span key={i} className="text-gray-300 text-xs">• {item}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

     {/* ─── COMBAT UI (full-screen overlay from CombatUI component) ─── */}
     {showCombatUI && section.combat && (
        <div className="absolute inset-0 z-20">
          <CombatUI
            combat={section.combat}
            onVictory={handleCombatVictory}
          />
        </div>
     )}

      {/* ─── MAIN CONTENT OVERLAY (over video) ─── */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute inset-0 z-10 flex flex-col justify-end sm:justify-center items-center px-3 sm:px-6 pb-32 sm:pb-28 pt-14 sm:pt-0 overflow-y-auto"
          >
            {/* ─── SECTION TEXT with Typewriter (only for NON-cinematic sections) ─── */}
            {!isDeadFinal && !section.isVictory && !hasCinematic && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-xl mb-4 sm:mb-6 text-center cursor-pointer px-2 sm:px-0"
                onClick={() => { if (!typewriterDone) skipTypewriter(); }}
              >
                {typewriterParagraphs.map((p, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-gray-200 text-sm sm:text-base md:text-lg leading-relaxed game-text-shadow font-im-fell italic mb-2"
                  >
                    {p.text}
                    {!typewriterDone && i === typewriterParagraphs.length - 1 && !p.isComplete && (
                      <span className="typewriter-cursor" />
                    )}
                  </motion.p>
                ))}
              </motion.div>
            )}

            {/* ─── DEATH SCREEN with Ranking ─── */}
            {isDeadFinal && (
              <EndScreen
                type="death"
                sectionsVisited={sectionsVisited}
                itemsCollected={itemsCollected}
                character={character}
                onRetry={() => { store.resetGame(); router.push('/create'); }}
                onMenu={() => { store.resetGame(); router.push('/'); }}
              />
            )}

            {/* ─── VICTORY SCREEN with Ranking ─── */}
            {section.isVictory && !isDeadFinal && (
              <EndScreen
                type="victory"
                sectionsVisited={sectionsVisited}
                itemsCollected={itemsCollected}
                character={character}
                onRetry={() => { store.resetGame(); router.push('/create'); }}
                onMenu={() => { store.resetGame(); router.push('/'); }}
              />
            )}

            {/* ─── LUCK TEST UI ─── */}
            {showLuckUI && section.luckTest && (
              <div className="w-full max-w-sm sm:max-w-lg mb-4">
                <LuckTestUI luckTest={section.luckTest} onNavigate={goToSection} />
              </div>
            )}

            {/* ─── DICE ROLL UI ─── */}
            {showDiceUI && section.diceRoll && (
              <div className="w-full max-w-sm sm:max-w-lg mb-4">
                <DiceRollUI diceRoll={section.diceRoll} onNavigate={goToSection} />
              </div>
            )}

            {/* ─── CHOICES (slide up from bottom with stagger) ─── */}
            {showChoicesUI && !section.isEnding && !section.isVictory && availableChoices.length > 0 && (typewriterDone || hasCinematic) && (
              <div className="flex flex-col gap-3 w-full max-w-sm sm:max-w-lg">
                {availableChoices.map((choice, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{
                      opacity: 1, y: 0,
                      scale: matchFeedback?.choiceIndex === i ? 1.03 : 1,
                      borderColor: matchFeedback?.choiceIndex === i ? 'rgba(245,158,11,0.8)' : undefined,
                    }}
                    transition={{ delay: 0.5 + i * 0.15, type: 'spring', stiffness: 120, damping: 14 }}
                    onClick={() => handleChoice(choice.targetSection, i, choice.text)}
                    className={`medieval-choice w-full relative overflow-hidden text-sm sm:text-base game-text-shadow ${matchFeedback?.choiceIndex === i ? 'ring-2 ring-amber-500/60' : ''}`}
                  >
                    <span className="text-amber-600 mr-2 font-cinzel font-bold">{String.fromCharCode(65 + i)}.</span>
                    {choice.text}
                  </motion.button>
                ))}

                {/* ─── VOICE COMMAND — auto-listening, "voice in the warrior's head" ─── */}
                {voiceSupported && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="flex flex-col items-center gap-2 mt-2"
                  >
                    {/* Mic status indicator */}
                    <div className="flex items-center gap-2">
                      {isListening && (
                        <motion.div
                          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="w-2 h-2 rounded-full bg-red-500"
                        />
                      )}
                      <button
                        onClick={isListening ? stopListening : startListening}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-xs sm:text-sm ${
                          isListening
                            ? 'border-red-500/40 bg-red-950/20 text-red-400/80'
                            : 'border-amber-900/30 bg-black/40 text-amber-600/40 hover:text-amber-500 hover:border-amber-700/50'
                        }`}
                      >
                        <span className="text-base">{isListening ? '🎙' : '🎙'}</span>
                        <span className="font-im-fell italic">
                          {isListening ? 'Speak, mortal...' : 'Tap to command'}
                        </span>
                      </button>
                    </div>

                    {/* Live transcript — the warrior hears you */}
                    {isListening && transcript && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-amber-500/40 text-xs italic font-im-fell text-center"
                      >
                        &ldquo;{transcript}&rdquo;
                      </motion.p>
                    )}

                    {/* Echo playing indicator */}
                    {echoPlaying && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="text-purple-400/50 text-[10px] font-im-fell italic tracking-wider"
                      >
                        ✦ the warrior hears your voice echoing ✦
                      </motion.p>
                    )}

                    {/* Match feedback — choice highlighted */}
                    {matchFeedback && (
                      <motion.p
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-green-400/80 text-xs font-im-fell text-center"
                      >
                        ✓ {String.fromCharCode(65 + matchFeedback.choiceIndex)}. {matchFeedback.choiceText}
                      </motion.p>
                    )}
                  </motion.div>
                )}
              </div>
            )}

            {/* ─── ENDING (non-death, non-victory) — uses EndScreen with ranking ─── */}
            {section.isEnding && !section.isVictory && !isDeadFinal && (
              <EndScreen
                type="death"
                sectionsVisited={sectionsVisited}
                itemsCollected={itemsCollected}
                character={character}
                onRetry={() => { store.resetGame(); router.push('/create'); }}
                onMenu={() => { store.resetGame(); router.push('/'); }}
              />
            )}

            {/* ─── Combat done → show choices (only if NO winSection, since winSection auto-advances) ─── */}
            {combatDone && !isDeadFinal && !section?.combat?.winSection && availableChoices.length > 0 && (
              <div className="flex flex-col gap-3 w-full max-w-sm sm:max-w-lg mt-4">
                {availableChoices.map((choice, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.12, type: 'spring', stiffness: 120, damping: 14 }}
                    onClick={() => handleChoice(choice.targetSection, i, choice.text)}
                    className="medieval-choice w-full text-sm sm:text-base game-text-shadow"
                  >
                    <span className="text-amber-600 mr-2 font-cinzel font-bold">{String.fromCharCode(65 + i)}.</span>
                    {choice.text}
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CSS Animations (injected via style tag) ─── */}
      <style jsx global>{`
        @keyframes loadingShimmer {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        .loading-shimmer {
          background: linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 40%, #0d0d0d 60%, #1a1a1a 100%);
          animation: loadingShimmer 2s ease-in-out infinite;
        }
        @keyframes deathPulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        .death-title {
          text-shadow: 0 0 20px rgba(220,38,38,0.6), 0 0 40px rgba(220,38,38,0.3), 0 0 80px rgba(220,38,38,0.15);
          animation: deathGlow 2s ease-in-out infinite;
        }
        @keyframes deathGlow {
          0%, 100% { text-shadow: 0 0 20px rgba(220,38,38,0.6), 0 0 40px rgba(220,38,38,0.3); }
          50% { text-shadow: 0 0 30px rgba(220,38,38,0.8), 0 0 60px rgba(220,38,38,0.5), 0 0 100px rgba(220,38,38,0.2); }
        }
        .victory-title {
          text-shadow: 0 0 20px rgba(245,158,11,0.6), 0 0 40px rgba(245,158,11,0.3), 0 0 80px rgba(245,158,11,0.15);
          animation: victoryGlow 2s ease-in-out infinite;
        }
        @keyframes victoryGlow {
          0%, 100% { text-shadow: 0 0 20px rgba(245,158,11,0.6), 0 0 40px rgba(245,158,11,0.3); }
          50% { text-shadow: 0 0 30px rgba(245,158,11,0.9), 0 0 60px rgba(245,158,11,0.5), 0 0 100px rgba(245,158,11,0.2); }
        }
        @keyframes kenBurns {
          0% { transform: scale(1.0) translate(0, 0); }
          50% { transform: scale(1.08) translate(-1%, -1%); }
          100% { transform: scale(1.0) translate(0, 0); }
        }
        .ken-burns {
          animation: kenBurns 30s ease-in-out infinite;
        }
      `}</style>
      </div>{/* close max-width wrapper */}
    </div>
  );
}

function StatBar({ label, current, max, percent }: { label: string; current: number; max: number; percent: number }) {
  const color = percent > 50 ? 'bg-amber-600' : percent > 25 ? 'bg-orange-600' : 'bg-red-600';
  return (
    <div>
      <div className="flex justify-between text-amber-500/80 mb-1">
        <span>{label}</span>
        <span className="font-mono text-xs">{current}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </div>
  );
}
