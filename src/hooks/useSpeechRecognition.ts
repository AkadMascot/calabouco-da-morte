'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

// Web Speech API types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

type MatchResult = {
  choiceIndex: number;
  choiceText: string;
  confidence: number;
  transcript: string;
};

/**
 * Voice command hook for Deathtrap Dungeon.
 * "You are the voice in the warrior's head."
 * 
 * - Auto-listens when choices appear
 * - Plays back the player's voice as a ghostly echo (Web Audio API reverb)
 * - Fuzzy matches speech against available choices
 */
export function useSpeechRecognition(
  choices: { text: string; targetSection: number }[],
  onMatch: (choiceIndex: number) => void,
  enabled: boolean = true
) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [matchFeedback, setMatchFeedback] = useState<MatchResult | null>(null);
  const [echoPlaying, setEchoPlaying] = useState(false);
  const recognitionRef = useRef<any>(null);
  const matchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const autoStartedRef = useRef(false);

  // Check browser support
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SR);
  }, []);

  // ─── Echo effect: replay voice with reverb/whisper ───
  const playEcho = useCallback(async (audioBlob: Blob) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Create convolver for reverb (impulse response = synthetic cave echo)
      const convolver = ctx.createConvolver();
      const sampleRate = ctx.sampleRate;
      const length = sampleRate * 3; // 3 second reverb tail
      const impulse = ctx.createBuffer(2, length, sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          // Exponential decay with random noise = cave reverb
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
        }
      }
      convolver.buffer = impulse;

      // Pitch shift down slightly for eerie effect (playback rate)
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = 0.85; // Slightly lower pitch = ghostly

      // Gain nodes: dry (quiet) + wet (reverb, louder)
      const dryGain = ctx.createGain();
      dryGain.gain.value = 0.15; // Whisper-quiet dry signal
      const wetGain = ctx.createGain();
      wetGain.gain.value = 0.5; // Reverb is the star

      // High-pass filter to make it sound like it's "inside your head"
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 800;

      // Route: source → filter → dry → output
      //                        → convolver → wet → output
      source.connect(filter);
      filter.connect(dryGain);
      filter.connect(convolver);
      convolver.connect(wetGain);
      dryGain.connect(ctx.destination);
      wetGain.connect(ctx.destination);

      setEchoPlaying(true);
      source.onended = () => setEchoPlaying(false);
      source.start();
    } catch (e) {
      console.warn('Echo playback failed:', e);
      setEchoPlaying(false);
    }
  }, []);

  // ─── Fuzzy match transcript against choices ───
  const findBestMatch = useCallback((spoken: string): MatchResult | null => {
    if (!choices.length) return null;
    
    const spokenLower = spoken.toLowerCase().trim();
    if (spokenLower.length < 2) return null;

    // Strategy 1: Letter match — "A", "B", "C", "option A", "choice B"
    const letterMatch = spokenLower.match(/\b(?:option|choice|letter)?\s*([a-z])\b/);
    if (letterMatch) {
      const idx = letterMatch[1].charCodeAt(0) - 97;
      if (idx >= 0 && idx < choices.length) {
        return { choiceIndex: idx, choiceText: choices[idx].text, confidence: 0.95, transcript: spoken };
      }
    }

    // Strategy 2: Number match — "one", "two", "first", "second"
    const numberMap: Record<string, number> = {
      'one': 0, 'first': 0, '1': 0,
      'two': 1, 'second': 1, '2': 1,
      'three': 2, 'third': 2, '3': 2,
      'four': 3, 'fourth': 3, '4': 3,
    };
    for (const [word, idx] of Object.entries(numberMap)) {
      if (spokenLower.includes(word) && idx < choices.length) {
        return { choiceIndex: idx, choiceText: choices[idx].text, confidence: 0.85, transcript: spoken };
      }
    }

    // Strategy 3: Keyword overlap
    let bestIdx = -1;
    let bestScore = 0;
    const spokenWords = spokenLower.split(/\s+/).filter(w => w.length > 2);

    choices.forEach((choice, idx) => {
      const choiceWords = choice.text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      let overlap = 0;
      for (const w of spokenWords) {
        for (const cw of choiceWords) {
          if (cw.includes(w) || w.includes(cw)) {
            overlap++;
            break;
          }
        }
      }
      const score = choiceWords.length > 0 ? overlap / choiceWords.length : 0;
      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestIdx = idx;
      }
    });

    if (bestIdx >= 0) {
      return { choiceIndex: bestIdx, choiceText: choices[bestIdx].text, confidence: bestScore, transcript: spoken };
    }

    return null;
  }, [choices]);

  // ─── Start listening + recording ───
  const startListening = useCallback(async () => {
    if (!isSupported || !enabled) return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    // Clean up previous
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    // Start microphone recording for echo playback
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch {
      // Mic access denied — still works for speech recognition, just no echo
    }

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setMatchFeedback(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        // Stop recording and play echo
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            if (audioBlob.size > 1000) {
              playEcho(audioBlob);
            }
            // Stop mic stream
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(t => t.stop());
              streamRef.current = null;
            }
          };
        }

        const match = findBestMatch(finalTranscript);
        if (match && match.confidence >= 0.5) {
          setMatchFeedback(match);
          // Delay to let echo play a bit before navigating
          matchTimeoutRef.current = setTimeout(() => {
            onMatch(match.choiceIndex);
            setIsListening(false);
            setMatchFeedback(null);
          }, 1200); // Longer delay so echo is heard
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        // Mic blocked (HTTP non-localhost) — disable auto-retry
        console.warn('Speech recognition blocked: mic requires HTTPS or localhost');
        setIsSupported(false); // Prevents auto-listen from retrying
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('Speech recognition error:', event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, enabled, findBestMatch, onMatch, playEcho]);

  // ─── Stop listening ───
  const stopListening = useCallback(() => {
    if (matchTimeoutRef.current) {
      clearTimeout(matchTimeoutRef.current);
      matchTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsListening(false);
    setTranscript('');
    setMatchFeedback(null);
  }, []);

  // ─── AUTO-LISTEN: start mic when choices appear (skip single-choice "Continue" sections) ───
  useEffect(() => {
    if (enabled && isSupported && choices.length > 1 && !isListening && !autoStartedRef.current) {
      autoStartedRef.current = true;
      // Small delay so the choices animate in first
      const t = setTimeout(() => {
        startListening();
      }, 1500);
      return () => clearTimeout(t);
    }
    // Reset auto-start flag when choices change (new section)
    if (!enabled || choices.length === 0) {
      autoStartedRef.current = false;
    }
  }, [enabled, isSupported, choices.length, isListening, startListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch {}
      }
    };
  }, [stopListening]);

  return {
    isListening,
    isSupported,
    transcript,
    matchFeedback,
    echoPlaying,
    startListening,
    stopListening,
  };
}
