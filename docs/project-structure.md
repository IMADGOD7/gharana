# Project Structure

Current repository structure for handoff and agent context.

```text
gharana/
├── .claude/
│   └── CLAUDE.md
├── .env.example
├── .env.local
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── .github/
│   └── workflows/
│       └── ci.yml
├── README.md
├── docs/
│   ├── adr/
│   │   └── README.md
│   ├── decisions/
│   │   ├── B-02-submission-completeness.md
│   │   └── README.md
│   ├── architecture-final-v1.md
│   ├── engineering-foundation.md
│   ├── project-understanding.md
│   └── project-structure.md
├── next-env.d.ts
├── next.config.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── supabase/
│   ├── database.types.ts
│   └── migrations/
│       └── 0001_initial_schema.sql
├── src/
│   ├── app/
│   │   ├── (admin)/
│   │   │   └── (dashboard)/
│   │   ├── (auth)/
│   │   │   ├── forgot-password/
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   ├── reset-password/
│   │   │   ├── signup/
│   │   │   └── ...
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   │   ├── [id]/
│   │   │   │   ├── [id]/edit/
│   │   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── profile/
│   │   ├── (partner)/
│   │   │   ├── (dashboard)/
│   │   │   └── products/
│   │   │       ├── (new)/
│   │   │       └── [id]/
│   │   ├── api/
│   │   │   └── health/
│   │   │       └── route.ts
│   │   ├── auth/
│   │   │   ├── callback/
│   │   │   │   └── route.ts
│   │   │   └── error/
│   │   │       └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── layout/
│   │   ├── products/
│   │   └── ui/
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── actions.ts
│   │   │   ├── callback/
│   │   │   │   └── route.ts
│   │   │   └── session.ts
│   │   ├── errors/
│   │   ├── products/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── middleware.ts
│   │   │   └── server.ts
│   │   └── types/
│   ├── middleware.ts
│   └── types/
│       └── README.md
├── tests/
│   ├── e2e/
│   ├── integration/
│   └── unit/
└── tsconfig.json
```

This reflects the live repo structure and is the version to use for agent handoff and implementation work.
