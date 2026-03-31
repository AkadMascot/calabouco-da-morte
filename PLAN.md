# O Calabouço da Morte — Jogo Interativo

## Visão Geral

Jogo interativo web baseado no livro-jogo "Aventuras Fantásticas 05 — O Calabouço da Morte" (Deathtrap Dungeon, Ian Livingstone). O jogador vive a aventura com todas as mecânicas do livro original: criação de personagem, combate por turnos, testes de sorte, inventário, e escolhas que determinam o caminho.

## Stack Tecnológica

- **Frontend:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **UI:** shadcn/ui para componentes base
- **State:** Zustand (estado do jogo em memória + localStorage para save/load)
- **Dados:** JSON estático (seções do livro extraídas do PDF)
- **Dice:** Animação de dados com Framer Motion
- **Deploy:** Vercel (grátis)
- **Sem backend** — tudo roda no browser

## Arquitetura

```
calabouco-da-morte/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Tela inicial (menu)
│   │   ├── game/
│   │   │   └── page.tsx          # Tela principal do jogo
│   │   ├── create/
│   │   │   └── page.tsx          # Criação de personagem
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                   # shadcn components
│   │   ├── game/
│   │   │   ├── StoryPanel.tsx    # Texto narrativo da seção atual
│   │   │   ├── ChoicePanel.tsx   # Opções de escolha
│   │   │   ├── CharacterSheet.tsx # Ficha (HP, Skill, Luck)
│   │   │   ├── Inventory.tsx     # Inventário e equipamentos
│   │   │   ├── CombatPanel.tsx   # Interface de combate por turnos
│   │   │   ├── DiceRoll.tsx      # Animação de rolagem de dados
│   │   │   ├── LuckTest.tsx      # Interface de teste de sorte
│   │   │   ├── SkillTest.tsx     # Interface de teste de habilidade
│   │   │   ├── EatMeal.tsx       # Comer provisões
│   │   │   └── GameOver.tsx      # Tela de morte / vitória
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── MobileLayout.tsx
│   ├── engine/
│   │   ├── types.ts              # Tipos TypeScript (Section, Character, etc.)
│   │   ├── store.ts              # Zustand store (estado do jogo)
│   │   ├── dice.ts               # Lógica de dados
│   │   ├── combat.ts             # Motor de combate
│   │   ├── parser.ts             # Parser de seções (condições, testes)
│   │   └── conditions.ts         # Avaliador de condições (tem item X?)
│   ├── data/
│   │   ├── sections.json         # Todas as 400 seções do livro
│   │   └── monsters.json         # Dados dos monstros (skill, stamina)
│   └── lib/
│       └── utils.ts
├── public/
│   └── images/                   # Ilustrações (futuro)
├── PLAN.md
└── README.md
```

## Fases de Implementação

### Fase 1 — Fundação (MVP jogável)
1. Setup do projeto Next.js + Tailwind + shadcn
2. Definir tipos TypeScript (Section, Character, Choice, Combat, etc.)
3. Extrair e estruturar todas as 400 seções do PDF em JSON
4. Game engine: store Zustand com estado do personagem
5. Tela de criação de personagem (rolagem de dados + escolha de poção)
6. StoryPanel + ChoicePanel (renderizar seção e navegação básica)
7. Save/Load via localStorage

### Fase 2 — Mecânicas de jogo
8. Motor de combate completo (turnos, dano, escape)
9. CombatPanel com animação de dados
10. Testes de Sorte (com dedução automática de 1 ponto)
11. Testes de Habilidade
12. Sistema de inventário (adicionar/remover itens, condições)
13. Sistema de provisões (comer para recuperar 4 STAMINA)
14. Sistema de poções (uso único, restaurar atributos)

### Fase 3 — Polish e UX
15. Animações de transição entre seções
16. Animação de rolagem de dados (Framer Motion)
17. Efeitos sonoros (combate, dados, morte, vitória)
18. Tema visual dark/dungeon (tipografia medieval, fundo pergaminho)
19. Layout responsivo (mobile-first — ideal pra jogar no celular)
20. Tela de Game Over com opção de recomeçar
21. Tela de vitória (seção 400)

### Fase 4 — Extras
22. Histórico de seções visitadas (mapa mental do caminho)
23. Estatísticas da partida (seções visitadas, combates, mortes)
24. Múltiplos saves
25. Modo "livro" — revelar texto progressivamente (typewriter)
26. Ilustrações do livro original integradas

## Modelo de Dados

### Section (JSON)
```typescript
interface Section {
  id: number;                    // 1-400
  text: string;                  // Narrativa em português
  choices?: Choice[];            // Opções de escolha
  combat?: Combat;               // Combate obrigatório
  luckTest?: LuckTest;           // Teste de sorte
  skillTest?: SkillTest;         // Teste de habilidade
  itemGain?: string[];           // Itens ganhos
  itemLose?: string[];           // Itens perdidos
  staminaChange?: number;        // Mudança de energia
  skillChange?: number;          // Mudança de habilidade
  luckChange?: number;           // Mudança de sorte
  requiresItem?: string;         // Item necessário pra acessar
  isEnding?: boolean;            // Fim de jogo (morte)
  isVictory?: boolean;           // Seção 400
  provisionsLost?: boolean;      // Provisões destruídas (rio)
}

interface Choice {
  text: string;                  // "Abrir a porta da esquerda"
  targetSection: number;         // Número da seção destino
  condition?: {                  // Condição opcional
    type: 'hasItem' | 'hasMinSkill' | 'hasMinLuck' | 'hasGold';
    item?: string;
    value?: number;
  };
}

interface Combat {
  enemies: {
    name: string;
    skill: number;
    stamina: number;
  }[];
  sequential: boolean;           // Um de cada vez ou todos juntos
  canEscape?: boolean;
  escapeSection?: number;
  victorySection: number;
  preCombatDamage?: number;      // Dano antes do combate (ex: espinhos da Manticora)
}

interface LuckTest {
  luckySection: number;
  unluckySection: number;
}

interface SkillTest {
  successSection: number;
  failSection: number;
  modifier?: number;             // Bônus/penalidade ao teste
}
```

### Character State
```typescript
interface Character {
  name: string;
  skillInitial: number;
  skillCurrent: number;
  staminaInitial: number;
  staminaCurrent: number;
  luckInitial: number;
  luckCurrent: number;
  provisions: number;
  potion: 'skill' | 'stamina' | 'luck';
  potionUsed: boolean;
  inventory: string[];
  gold: number;
  currentSection: number;
  visitedSections: number[];
  isAlive: boolean;
}
```

## Notas Técnicas

- **Extração do PDF:** Usar pdftotext + parser customizado para converter as 400 seções em JSON estruturado. Cada seção precisa ser revisada manualmente para marcar combates, testes, e condições.
- **Seções especiais:** Arena da Morte (gambling com dados), Throm como aliado (combate compartilhado), puzzle final das gemas (seção 16).
- **Endereços bloqueados:** Quarto A do Calabouço tem tomadas que não devem ser mexidas... brincadeira, isso é da domótica 😄
- **Mobile-first:** A experiência principal é no celular (WhatsApp → link → jogar). Layout deve funcionar bem em telas pequenas.

## Critérios de Sucesso (MVP)

- [ ] Criar personagem com rolagem de dados
- [ ] Navegar pelas 400 seções com escolhas
- [ ] Combate funcional com dados animados
- [ ] Testes de sorte e habilidade
- [ ] Inventário e condições
- [ ] Save/Load
- [ ] Jogável no celular
- [ ] Deploy no Vercel
