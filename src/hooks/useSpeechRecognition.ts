'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

// Web Speech API types (not in all TS libs)
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
 * Uses Web Speech API (free, built into Chrome/Safari).
 * 
 * Player says what to do → fuzzy matches against available choices.
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
  const recognitionRef = useRef<any>(null);
  const matchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SR);
  }, []);

  // Fuzzy match transcript against choices
  const findBestMatch = useCallback((spoken: string): MatchResult | null => {
    if (!choices.length) return null;
    
    const spokenLower = spoken.toLowerCase().trim();
    if (spokenLower.length < 2) return null;

    // Strategy 1: Letter match — "A", "B", "C", "option A", "choice B"
    const letterMatch = spokenLower.match(/\b(?:option|choice|letter)?\s*([a-z])\b/);
    if (letterMatch) {
      const idx = letterMatch[1].charCodeAt(0) - 97; // a=0, b=1, c=2...
      if (idx >= 0 && idx < choices.length) {
        return { choiceIndex: idx, choiceText: choices[idx].text, confidence: 0.95, transcript: spoken };
      }
    }

    // Strategy 2: Number match — "one", "two", "first", "second", "1", "2"
    const numberMap: Record<string, number> = {
      'one': 0, 'first': 0, '1': 0, 'won': 0,
      'two': 1, 'second': 1, '2': 1, 'to': 1, 'too': 1,
      'three': 2, 'third': 2, '3': 2, 'tree': 2,
      'four': 3, 'fourth': 3, '4': 3, 'for': 3,
    };
    for (const [word, idx] of Object.entries(numberMap)) {
      if (spokenLower.includes(word) && idx < choices.length) {
        return { choiceIndex: idx, choiceText: choices[idx].text, confidence: 0.85, transcript: spoken };
      }
    }

    // Strategy 3: Keyword overlap — count matching words between spoken and choice
    let bestIdx = -1;
    let bestScore = 0;
    const spokenWords = spokenLower.split(/\s+/).filter(w => w.length > 2);

    choices.forEach((choice, idx) => {
      const choiceWords = choice.text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      let overlap = 0;
      for (const w of spokenWords) {
        for (const cw of choiceWords) {
          // Exact match or substring match
          if (cw.includes(w) || w.includes(cw)) {
            overlap++;
            break;
          }
        }
      }
      const score = choiceWords.length > 0 ? overlap / choiceWords.length : 0;
      if (score > bestScore && score >= 0.3) {
        bestScore = score;
        bestIdx = idx;
      }
    });

    if (bestIdx >= 0) {
      return { choiceIndex: bestIdx, choiceText: choices[bestIdx].text, confidence: bestScore, transcript: spoken };
    }

    return null;
  }, [choices]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported || !enabled) return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    // Clean up previous
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
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
        const match = findBestMatch(finalTranscript);
        if (match && match.confidence >= 0.3) {
          setMatchFeedback(match);
          // Small delay for visual feedback before executing
          matchTimeoutRef.current = setTimeout(() => {
            onMatch(match.choiceIndex);
            setIsListening(false);
            setMatchFeedback(null);
          }, 600);
        }
      }
    };

    recognition.onerror = (event: any) => {
      // Silently handle — no-speech and aborted are expected
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('Speech recognition error:', event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, enabled, findBestMatch, onMatch]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (matchTimeoutRef.current) {
      clearTimeout(matchTimeoutRef.current);
      matchTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscript('');
    setMatchFeedback(null);
  }, []);

  // Cleanup on unmount or choice change
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    isSupported,
    transcript,
    matchFeedback,
    startListening,
    stopListening,
  };
}
