'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

const VIDEO_BASE = '/cinematics/voice-test'

type Step =
  | { type: 'play'; src: string; narration?: string; next: number }
  | { type: 'listen'; choices: { label: string; next: number }[] }
  | { type: 'end' }

const STEPS: Step[] = [
  // 0: entrada — warrior enters dungeon, walks to table with boxes
  { type: 'play', src: `${VIDEO_BASE}/entrada.mp4`, narration: `${VIDEO_BASE}/entrada-narration.mp3`, next: 1 },
  // 1: escuta (first decision) — warrior stops, listens to inner voice
  {
    type: 'listen',
    choices: [
      { label: 'Abrir a caixa', next: 2 },
      { label: 'Seguir em frente', next: 3 },
    ],
  },
  // 2: caixa — opens box, finds gold and parchment
  { type: 'play', src: `${VIDEO_BASE}/caixa.mp4`, narration: `${VIDEO_BASE}/caixa-narration.mp3`, next: 4 },
  // 3: ignorar — walks past boxes
  { type: 'play', src: `${VIDEO_BASE}/ignorar.mp4`, next: 4 },
  // 4: encruzilhada — arrives at crossroads
  { type: 'play', src: `${VIDEO_BASE}/encruzilhada.mp4`, narration: `${VIDEO_BASE}/encruzilhada-narration.mp3`, next: 5 },
  // 5: escuta (second decision)
  {
    type: 'listen',
    choices: [
      { label: 'Ir para o oeste', next: 6 },
      { label: 'Ir para o leste', next: 6 },
    ],
  },
  // 6: end
  { type: 'end' },
]

export default function VoiceTestPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [faded, setFaded] = useState(true) // start faded to black
  const [choicesVisible, setChoicesVisible] = useState(false)
  const [choicesFadingOut, setChoicesFadingOut] = useState(false)
  const [vignetteIntensity, setVignetteIntensity] = useState(0)
  const [showEnd, setShowEnd] = useState(false)

  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)
  const narrationRef = useRef<HTMLAudioElement>(null)
  const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A')
  const listenTimerRef = useRef<NodeJS.Timeout | null>(null)
  const vignetteIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [needsInteraction, setNeedsInteraction] = useState(true)

  const getActiveVideo = useCallback(() => {
    return activePlayer === 'A' ? videoARef.current : videoBRef.current
  }, [activePlayer])

  const getInactiveVideo = useCallback(() => {
    return activePlayer === 'A' ? videoBRef.current : videoARef.current
  }, [activePlayer])

  // Preload a video into the inactive player
  const preloadVideo = useCallback(
    (src: string, loop = false) => {
      const vid = getInactiveVideo()
      if (!vid) return
      vid.src = src
      vid.loop = loop
      vid.load()
    },
    [getInactiveVideo],
  )

  // Play a video with crossfade and optional narration
  const playVideo = useCallback(
    async (src: string, loop = false, narrationSrc?: string) => {
      const vid = getInactiveVideo()
      if (!vid) return

      // Stop any playing narration
      if (narrationRef.current) {
        narrationRef.current.pause()
        narrationRef.current.currentTime = 0
      }

      // Prepare inactive player
      if (vid.src !== window.location.origin + src) {
        vid.src = src
        vid.loop = loop
        vid.load()
      } else {
        vid.loop = loop
      }

      // Fade to black
      setFaded(true)
      await new Promise((r) => setTimeout(r, 300))

      // Pause active, play inactive
      const active = getActiveVideo()
      if (active) {
        active.pause()
        active.style.display = 'none'
      }

      vid.style.display = 'block'
      vid.currentTime = 0

      try {
        await vid.play()
      } catch {
        // autoplay may fail silently
      }

      // Play narration if provided
      if (narrationSrc && narrationRef.current) {
        narrationRef.current.src = narrationSrc
        narrationRef.current.currentTime = 0
        try {
          await narrationRef.current.play()
        } catch {
          // narration may fail silently
        }
      }

      // Fade in
      setFaded(false)

      // Swap active
      setActivePlayer((p) => (p === 'A' ? 'B' : 'A'))
    },
    [getActiveVideo, getInactiveVideo],
  )

  // Handle step transitions
  const goToStep = useCallback(
    async (stepIndex: number) => {
      setChoicesVisible(false)
      setChoicesFadingOut(false)
      setVignetteIntensity(0)
      setShowEnd(false)

      if (listenTimerRef.current) clearTimeout(listenTimerRef.current)
      if (vignetteIntervalRef.current) clearInterval(vignetteIntervalRef.current)

      setCurrentStep(stepIndex)
      const step = STEPS[stepIndex]

      if (step.type === 'play') {
        await playVideo(step.src, false, step.narration)
      } else if (step.type === 'listen') {
        await playVideo(`${VIDEO_BASE}/escuta.mp4`, true)
        // Show choices after 1s
        listenTimerRef.current = setTimeout(() => {
          setChoicesVisible(true)
        }, 1000)
        // Deepen vignette over time
        vignetteIntervalRef.current = setInterval(() => {
          setVignetteIntensity((v) => Math.min(v + 0.02, 0.7))
        }, 500)
      } else if (step.type === 'end') {
        // Fade to black then show end
        setFaded(true)
        const active = getActiveVideo()
        if (active) active.pause()
        setTimeout(() => setShowEnd(true), 500)
      }
    },
    [playVideo, getActiveVideo],
  )

  // Handle video ended for 'play' steps
  useEffect(() => {
    const handleEnded = () => {
      const step = STEPS[currentStep]
      if (step.type === 'play') {
        goToStep(step.next)
      }
    }

    // We need to listen on both videos since activePlayer swaps
    const vidA = videoARef.current
    const vidB = videoBRef.current
    vidA?.addEventListener('ended', handleEnded)
    vidB?.addEventListener('ended', handleEnded)

    return () => {
      vidA?.removeEventListener('ended', handleEnded)
      vidB?.removeEventListener('ended', handleEnded)
    }
  }, [currentStep, goToStep])

  // Start on mount — only after user interaction
  useEffect(() => {
    if (!needsInteraction) {
      goToStep(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsInteraction])

  // Handle choice selection
  const handleChoice = useCallback(
    async (nextStep: number) => {
      setChoicesFadingOut(true)
      if (listenTimerRef.current) clearTimeout(listenTimerRef.current)
      if (vignetteIntervalRef.current) clearInterval(vignetteIntervalRef.current)

      // Wait for choice UI fade out
      await new Promise((r) => setTimeout(r, 400))
      goToStep(nextStep)
    },
    [goToStep],
  )

  const step = STEPS[currentStep]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Video container - 16:9 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 'calc(100vh * 16 / 9)',
          aspectRatio: '16 / 9',
        }}
      >
        <video
          ref={videoARef}
          playsInline
          preload="auto"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
        <video
          ref={videoBRef}
          playsInline
          preload="auto"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'none',
          }}
        />
        {/* Narration audio element */}
        <audio ref={narrationRef} preload="auto" />

        {/* Vignette overlay */}
        {step?.type === 'listen' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteIntensity}) 100%)`,
              transition: 'background 0.5s ease',
            }}
          />
        )}

        {/* Choice overlay */}
        {step?.type === 'listen' && (
          <div
            style={{
              position: 'absolute',
              bottom: '12%',
              left: 0,
              right: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              opacity: choicesFadingOut ? 0 : choicesVisible ? 1 : 0,
              transition: 'opacity 0.6s ease',
              pointerEvents: choicesVisible && !choicesFadingOut ? 'auto' : 'none',
            }}
          >
            {/* Whisper label */}
            <span
              style={{
                fontStyle: 'italic',
                color: 'rgba(255,255,255,0.3)',
                fontSize: '14px',
                letterSpacing: '2px',
                textTransform: 'lowercase',
                fontFamily: 'Georgia, serif',
              }}
            >
              A voz sussurra...
            </span>

            {/* Choice buttons */}
            <div
              style={{
                display: 'flex',
                gap: '48px',
              }}
            >
              {step.choices.map((choice) => (
                <button
                  key={choice.label}
                  onClick={() => handleChoice(choice.next)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.65)',
                    fontStyle: 'italic',
                    fontSize: '22px',
                    fontFamily: 'Georgia, serif',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    letterSpacing: '1px',
                    transition: 'all 0.3s ease',
                    textShadow: '0 0 0px transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.95)'
                    e.currentTarget.style.textShadow =
                      '0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
                    e.currentTarget.style.textShadow = '0 0 0px transparent'
                  }}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Crossfade black overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#000',
            opacity: faded ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Start screen — needs user click to enable audio */}
      {needsInteraction && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000',
            zIndex: 100,
            cursor: 'pointer',
          }}
          onClick={() => setNeedsInteraction(false)}
        >
          <span
            style={{
              color: 'rgba(255,255,255,0.15)',
              fontSize: '12px',
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              marginBottom: '24px',
            }}
          >
            Calabouço da Morte
          </span>
          <span
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '24px',
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              letterSpacing: '3px',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            ▶ Iniciar
          </span>
        </div>
      )}

      {/* End screen */}
      {showEnd && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 1s ease forwards',
          }}
        >
          <span
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '32px',
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              letterSpacing: '6px',
            }}
          >
            FIM DO TESTE
          </span>
          <button
            onClick={() => {
              setShowEnd(false)
              setFaded(true)
              setActivePlayer('A')
              const vidA = videoARef.current
              const vidB = videoBRef.current
              if (vidA) {
                vidA.style.display = 'block'
                vidA.src = ''
              }
              if (vidB) {
                vidB.style.display = 'none'
                vidB.src = ''
              }
              setTimeout(() => goToStep(0), 300)
            }}
            style={{
              marginTop: '32px',
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.35)',
              fontStyle: 'italic',
              fontSize: '16px',
              fontFamily: 'Georgia, serif',
              cursor: 'pointer',
              letterSpacing: '2px',
              transition: 'color 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.35)'
            }}
          >
            recomeçar
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
