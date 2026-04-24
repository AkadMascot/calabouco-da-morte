// Game engine types for Deathtrap Dungeon

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
  winSection?: number;
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

export interface DiceRollRange {
  min: number;
  max: number;
  targetSection: number;
}

export interface DiceRoll {
  type: 'skillCheck' | 'skillAndStaminaCheck' | 'fixedThreshold' | 'd6Range';
  // skillCheck / skillAndStaminaCheck
  successSection?: number;
  failSection?: number;
  // fixedThreshold
  threshold?: number;
  aboveSection?: number;
  belowOrEqualSection?: number;
  belowSection?: number;
  equalOrAboveSection?: number;
  exactSection?: number;
  otherSection?: number;
  // d6Range
  ranges?: DiceRollRange[];
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
  diceRoll?: DiceRoll;
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

export interface GameLogEntry {
  timestamp: number;
  from: number;
  to: number;
  choiceText?: string;
  event?: string; // 'choice' | 'combat_win' | 'combat_death' | 'luck_test' | 'item_gain' | 'item_lose' | 'stat_change'
}

export interface GameState {
  character: Character | null;
  gamePhase: GamePhase;
  gameLog: GameLogEntry[];
}
