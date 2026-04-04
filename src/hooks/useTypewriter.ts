import { useEffect, useState, useCallback } from 'react';

interface TypewriterResult {
  // For paragraph mode: array of { text, isComplete } for each paragraph
  paragraphs: Array<{ text: string; isComplete: boolean }>;
  // For simple mode: the full displayed text
  displayed: string;
  done: boolean;
  skipToEnd: () => void;
}

export function useTypewriter(
  text: string,
  speed: number = 30,
  enabled: boolean = true
): TypewriterResult {
  const [charIndex, setCharIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled || !text) {
      setCharIndex(text?.length || 0);
      setDone(true);
      return;
    }
    setCharIndex(0);
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setCharIndex(i);
      if (i >= text.length) {
        clearInterval(timer);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, enabled]);

  const skipToEnd = useCallback(() => {
    setCharIndex(text?.length || 0);
    setDone(true);
  }, [text]);

  // Split text into paragraphs and determine which chars are revealed
  const displayed = (text || '').slice(0, charIndex);
  
  // Split original text by double newline or single newline
  const rawParagraphs = (text || '').split(/\n\n|\n/).filter(p => p.trim());
  
  // Calculate which paragraphs are visible and how much
  let remaining = charIndex;
  let offset = 0;
  const paragraphs = rawParagraphs.map(p => {
    // Find where this paragraph starts in the original text
    const pStart = text.indexOf(p, offset);
    const pEnd = pStart + p.length;
    offset = pEnd;
    
    if (remaining <= 0) {
      return { text: '', isComplete: false };
    }
    
    const charsIntoThisParagraph = Math.min(remaining, pEnd) - pStart;
    if (charsIntoThisParagraph <= 0) {
      return { text: '', isComplete: false };
    }
    
    const visibleChars = Math.min(charsIntoThisParagraph, p.length);
    remaining -= (pEnd - pStart + (text[pEnd] === '\n' ? (text[pEnd+1] === '\n' ? 2 : 1) : 0));
    
    return {
      text: p.slice(0, visibleChars),
      isComplete: visibleChars >= p.length,
    };
  }).filter(p => p.text.length > 0);

  return { paragraphs, displayed, done, skipToEnd };
}
