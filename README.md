# PandaVerse Gharana Partner Portal

Production-grade partner portal for PandaVerse Gharana.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS v4
- Supabase (Auth, Postgres, Storage)
- Vercel deployment

## Getting Started

### Prerequisites

- Node.js >= 18.17.0
- npm
- A Supabase project (staging or production)

### Installation

```bash
cp .env.example .env.local
# Fill in your Supabase credentials in .env.local
npm install
npm run dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run db:generate` | Generate database types |
| `npm run db:migrate` | Apply database migrations |

## Documentation

- `docs/project-understanding.md` — Requirements and scope
- `docs/architecture-final-v1.md` — Architecture specification
- `docs/engineering-foundation.md` — Engineering principles and rules
- `docs/decisions/` — Product and architecture decisions

## Status

**Phase 0 — Engineering Foundation (T0.1 in progress)**

Repository initialized. Feature development begins with T0.2.
