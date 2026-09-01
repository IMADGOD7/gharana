# PandaVerse Gharana — Claude Project Guidance

## Source of Truth

Before any code work, read these documents in order:

1. `docs/project-understanding-document.md` — Requirements
2. `docs/decisions/` — Approved product decisions (B-02 is OPEN)
3. `docs/architecture-final-v1.md` — Approved architecture
4. `docs/engineering-foundation.md` — Engineering Foundation Specification
5. Implementation task breakdown (in conversation)

If they conflict, STOP and report the conflict.

## Non-Negotiable Rules

- B-02 (Submission Completeness) is OPEN. Do not resolve it. Do not infer a rule.
- Never use the service-role client in client-boundable code.
- Never bypass RLS for convenience.
- Never expose secrets or credentials in any output.
- All authorization is server-side. Client-side checks are not security controls.

## Implementation Order

- One task at a time.
- Each task: implement → verify → report → review → next task.
- Do not proceed to the next task without explicit authorization.

## Task Tracking

Current phase: Phase 0 — Engineering Foundation
Current task: T0.1 — Initialize Next.js Repository (IN PROGRESS)

## Key Directories

- `src/app/` — Next.js App Router pages
- `src/components/` — React components
- `src/lib/` — Server-side logic (products, auth, media, etc.)
- `src/types/` — TypeScript types
- `supabase/migrations/` — Database migrations
- `docs/` — Project documentation
- `tests/` — Unit, integration, and E2E tests
