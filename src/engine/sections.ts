import type { Section } from './types';
import sectionsData from '../data/sections.json';

const sectionsMap = new Map<number, Section>(
  (sectionsData as Section[]).map((section) => [section.id, section])
);

export function getSection(id: number): Section | undefined {
  return sectionsMap.get(id);
}
