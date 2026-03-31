// Game engine types for O Calabouço da Morte

export type PotionType = 'skill' | 'stamina' | 'luck';

export type GamePhase = 'menu' | 'create' | 'playing' | 'combat' | 'dead' | 'victory';

export interface Enemy {
  name: string;
  skill: number;
  stamina: number;
}

export interface Combat {
  enemies: Enemy[];
  fightTwoAtOnce?: boolean;
  escapeSection?: number;
  note?: string;
}

export interface LuckTest {
  luckySection: number;
  unluckySection: number;
  description?: string;
}

export interface SkillTest {
  successSection: number;
  failureSection: number;
  description?: string;
}

export interface ChoiceCondition {
  hasItem?: string;
  hasMinSkill?: number;
  hasMinLuck?: number;
}

export interface Choice {
  text: string;
  targetSection: number;
  condition?: ChoiceCondition;
}

export interface Section {
  id: number;
  text: string;
  choices: Choice[];
  combat?: Combat;
  luckTest?: LuckTest;
  skillTest?: SkillTest;
  itemGain?: string[];
  itemLose?: string[];
  staminaChange?: number;
  skillChange?: number;
  luckChange?: number;
  isEnding?: boolean;
  isVictory?: boolean;
}

export interface Character {
  skillInitial: number;
  skillCurrent: number;
  staminaInitial: number;
  staminaCurrent: number;
  luckInitial: number;
  luckCurrent: number;
  provisions: number;
  potion: PotionType;
  potionUsed: boolean;
  inventory: string[];
  currentSection: number;
  visitedSections: number[];
  isAlive: boolean;
}

export interface GameState {
  character: Character | null;
  gamePhase: GamePhase;
}
