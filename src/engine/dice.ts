// Dice rolling utilities for O Calabouço da Morte

/** Roll a single d6 (1-6) */
export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/** Roll 2d6 (2-12) */
export function roll2D6(): number {
  return rollD6() + rollD6();
}

/** Roll character Skill: 1d6+6 (range 7-12) */
export function rollCharacterSkill(): number {
  return rollD6() + 6;
}

/** Roll character Stamina: 2d6+12 (range 14-24) */
export function rollCharacterStamina(): number {
  return roll2D6() + 12;
}

/** Roll character Luck: 1d6+6 (range 7-12) */
export function rollCharacterLuck(): number {
  return rollD6() + 6;
}
