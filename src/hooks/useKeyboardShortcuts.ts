import { useEffect } from 'react';

interface KeyboardConfig {
  onSkip?: () => void;
  onContinue?: () => void;
  onChoice?: (index: number) => void;

  onToggleStats?: () => void;
  onToggleScanlines?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts(config: KeyboardConfig) {
  useEffect(() => {
    if (config.enabled === false) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      switch (e.code) {
        case 'Space':
        case 'Enter':
          e.preventDefault();
          if (config.onSkip) {
            config.onSkip();
          } else if (config.onContinue) {
            config.onContinue();
          }
          break;

        case 'Digit1': case 'Digit2': case 'Digit3':
        case 'Digit4': case 'Digit5': case 'Digit6':
        case 'Digit7': case 'Digit8': case 'Digit9':
          if (config.onChoice) {
            const index = parseInt(e.code.replace('Digit', ''), 10) - 1;
            config.onChoice(index);
          }
          break;

        case 'KeyA':
          // Attack handled internally by CombatUI
          break;

        case 'KeyT':
          // Luck test handled internally by LuckTestUI
          break;

        case 'Escape':
          if (config.onToggleStats) config.onToggleStats();
          break;

        case 'KeyS':
          if (!isInput && config.onToggleScanlines) config.onToggleScanlines();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    config.enabled,
    config.onSkip,
    config.onContinue,
    config.onChoice,

    config.onToggleStats,
    config.onToggleScanlines,
  ]);
}
