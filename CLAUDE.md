# O Calabouço da Morte — Project Instructions

## Overview
Interactive web game based on the Fighting Fantasy gamebook "Aventuras Fantásticas 05 — O Calabouço da Morte" (Deathtrap Dungeon by Ian Livingstone).

## Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand with localStorage persistence
- **Animation:** Framer Motion
- **No backend** — everything runs client-side in the browser

## Project Structure
```
src/
  app/           # Next.js pages (page.tsx per route)
    page.tsx     # Main menu
    create/      # Character creation
    game/        # Main game screen
  components/
    ui/          # shadcn/ui components
    game/        # Game-specific components (StoryPanel, CombatPanel, etc.)
  engine/        # Game logic (types, store, combat, dice, conditions)
  data/          # Static JSON (sections.json, monsters.json)
  lib/           # Utilities
```

## Coding Conventions
- Use functional components with hooks
- Use TypeScript strict mode — no `any` types
- All game text is in Portuguese (PT-BR)
- API/variable names in English
- Use Zustand selectors for performance
- Mobile-first responsive design
- All components must be client components ('use client') since we use browser state

## Game Mechanics (from the book)
- **Skill (Habilidade):** 1d6+6 (range 7-12)
- **Stamina (Energia):** 2d6+12 (range 14-24)
- **Luck (Sorte):** 1d6+6 (range 7-12)
- **Combat:** Both sides roll 2d6+Skill, higher wins, loser takes 2 damage
- **Luck tests:** Roll 2d6 <= current Luck = lucky, always costs 1 Luck
- **Provisions:** 10 meals, each restores 4 Stamina, not during combat
- **Potions:** Choose 1 of 3 at start, single use, restores attribute to initial

## Section Data Format
Sections are in src/data/sections.json. Each section has:
- `id`: number (1-400)
- `text`: string (narrative in Portuguese)
- `choices`: array of {text, targetSection, condition?}
- Optional: `combat`, `luckTest`, `skillTest`, `itemGain`, `itemLose`, `staminaChange`, `isEnding`, `isVictory`

## Important Gotchas
- The book PDF is at ~/Downloads/Aventuras_Fantasticas_05_O_Calabouco_da_Morte.pdf
- Use pdftotext to extract text when needed
- Section numbers in the book are NOT sequential — you jump between them based on choices
- There are 400 total sections
- Section 400 is the victory ending
- Some sections are instant death with "Sua aventura termina aqui"
