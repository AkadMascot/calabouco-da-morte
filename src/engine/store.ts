import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Character, GamePhase, GameState, PotionType } from './types';
import { rollCharacterSkill, rollCharacterStamina, rollCharacterLuck } from './dice';

interface GameActions {
  createCharacter: (potion: PotionType) => void;
  goToSection: (sectionId: number) => void;
  addItem: (item: string) => void;
  removeItem: (item: string) => void;
  hasItem: (item: string) => boolean;
  eatProvision: () => void;
  usePotion: () => void;
  updateStats: (changes: { skillChange?: number; staminaChange?: number; luckChange?: number }) => void;
  setGamePhase: (phase: GamePhase) => void;
  resetGame: () => void;
}

export type GameStore = GameState & GameActions;

const initialState: GameState = {
  character: null,
  gamePhase: 'menu',
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      createCharacter: (potion: PotionType) => {
        const skill = rollCharacterSkill();
        const stamina = rollCharacterStamina();
        const luck = rollCharacterLuck();

        const character: Character = {
          skillInitial: skill,
          skillCurrent: skill,
          staminaInitial: stamina,
          staminaCurrent: stamina,
          luckInitial: luck,
          luckCurrent: luck,
          provisions: 10,
          potion,
          potionUsed: false,
          inventory: [],
          currentSection: 1,
          visitedSections: [1],
          isAlive: true,
        };

        set({ character, gamePhase: 'playing' });
      },

      goToSection: (sectionId: number) => {
        const { character } = get();
        if (!character) return;

        set({
          character: {
            ...character,
            currentSection: sectionId,
            visitedSections: [...character.visitedSections, sectionId],
          },
        });
      },

      addItem: (item: string) => {
        const { character } = get();
        if (!character) return;

        set({
          character: {
            ...character,
            inventory: [...character.inventory, item],
          },
        });
      },

      removeItem: (item: string) => {
        const { character } = get();
        if (!character) return;

        const index = character.inventory.indexOf(item);
        if (index === -1) return;

        const inventory = [...character.inventory];
        inventory.splice(index, 1);

        set({ character: { ...character, inventory } });
      },

      hasItem: (item: string) => {
        const { character } = get();
        if (!character) return false;
        return character.inventory.includes(item);
      },

      eatProvision: () => {
        const { character, gamePhase } = get();
        if (!character || character.provisions <= 0) return;
        if (gamePhase === 'combat') return;

        const newStamina = Math.min(
          character.staminaCurrent + 4,
          character.staminaInitial
        );

        set({
          character: {
            ...character,
            provisions: character.provisions - 1,
            staminaCurrent: newStamina,
          },
        });
      },

      usePotion: () => {
        const { character } = get();
        if (!character || character.potionUsed) return;

        let updated: Character;
        switch (character.potion) {
          case 'skill':
            updated = { ...character, skillCurrent: character.skillInitial, potionUsed: true };
            break;
          case 'stamina':
            updated = { ...character, staminaCurrent: character.staminaInitial, potionUsed: true };
            break;
          case 'luck':
            updated = { ...character, luckCurrent: character.luckInitial, potionUsed: true };
            break;
        }

        set({ character: updated });
      },

      updateStats: (changes) => {
        const { character } = get();
        if (!character) return;

        const skillCurrent = Math.max(
          0,
          Math.min(character.skillInitial, character.skillCurrent + (changes.skillChange ?? 0))
        );
        const staminaCurrent = Math.max(
          0,
          Math.min(character.staminaInitial, character.staminaCurrent + (changes.staminaChange ?? 0))
        );
        const luckCurrent = Math.max(
          0,
          Math.min(character.luckInitial, character.luckCurrent + (changes.luckChange ?? 0))
        );

        const isAlive = staminaCurrent > 0;
        const gamePhase = isAlive ? get().gamePhase : 'dead';

        set({
          character: {
            ...character,
            skillCurrent,
            staminaCurrent,
            luckCurrent,
            isAlive,
          },
          gamePhase,
        });
      },

      setGamePhase: (phase: GamePhase) => {
        set({ gamePhase: phase });
      },

      resetGame: () => {
        set({ ...initialState });
      },
    }),
    {
      name: 'calabouco-da-morte-save',
    }
  )
);
