import type { Section } from './types';
import sectionsData from '../data/sections-full.json';

const sectionsMap = new Map<number, Section>(
  Object.values(sectionsData as unknown as Record<string, Section>).map((section) => [section.id, section])
);

export function getSection(id: number): Section | undefined {
  return sectionsMap.get(id);
}

export function getAllSectionIds(): number[] {
  return Array.from(sectionsMap.keys()).sort((a, b) => a - b);
}
