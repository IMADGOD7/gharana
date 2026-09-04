# PandaVerse Gharana Partner Portal
## Engineering Foundation Specification

**Status:** Final — Pre-Implementation Baseline
**Phase:** Foundation (pre-code)
**Prepared by:** Principal Software Engineer / Lead Software Architect

**No application code, database migrations, Next.js scaffolding, or package installation has been performed.**

**Open Product Decision:** B-02 — Submission Completeness (see §15)

---

# 1. Engineering Principles

These are the non-negotiable rules that govern every engineering decision on this project. They are ordered by priority.

## 1.1 Correctness

The system must behave correctly under all documented scenarios. Correctness means: the right data reaches the right actor, state transitions are valid, and data isolation is never breached. Tests exist to verify correctness, not just to increase coverage numbers.

## 1.2 Security

Security is the primary non-functional requirement. Every feature is evaluated for its security implications before implementation. Authorization is enforced at three layers: application, RLS, and Storage policies. No layer is trusted alone.

## 1.3 Reliability

Draft saves must survive tab closes, browser crashes, and network interruptions. Large or failure-prone uploads must use a strategy that supports reliable retry or resume where required by documented upload constraints. State transitions must be idempotent. **Unintended data loss must be prevented.** Operations that intentionally destroy data must be explicit, authorized, and recoverable where required by the domain. Deletion is not forbidden — accidental or unauthorized loss is forbidden.

## 1.4 Maintainability

Code is written for the next developer — who may be the same person six months from now. Simple solutions are preferred over clever ones. Abstractions are introduced only when they eliminate duplication or reduce complexity, not to demonstrate architectural skill.

## 1.5 Testability

Every critical behavior is testable. Tests are written alongside implementation, not after. Tests verify behavior, not implementation details. When a test breaks, the cause should be obvious.

## 1.6 Observability

Errors are visible, logs are structured, and request paths are traceable. When something fails in production, the team should be able to diagnose it without asking the user to reproduce the problem.

## 1.7 Simplicity

The simplest solution that satisfies all requirements is the correct solution. Premature abstraction, unnecessary microservices, speculative generality, and over-engineering are all forms of technical debt.

## 1.8 Performance

Performance is a requirement, not an optimization goal. Cold starts are acceptable. Warm paths must be fast. Large uploads must not block the application server. Performance is measured against documented targets (§4.4 of the Project Understanding Document).

## 1.9 UI Polish

The interface is the product's face to its users. It must be responsive, accessible, and clear. Polish is applied after correctness and security are verified — never before.

---

# 2. Claude Development Rules

These rules apply whenever Claude (or any AI assistant) is used to write, modify, or review code in this project.

## 2.1 Before Any Code Work

Claude must:

1. **Read the relevant architecture documents** (Architecture Final v1, this Engineering Foundation Specification, and any active decision records) before proposing or writing any code.
2. **Identify which product decisions are open** (currently B-02) and never silently resolve them.
3. **Confirm the scope of the task** — what is being changed, what must not change, and what tests must pass.

## 2.2 Requirements

Claude must:
- Never invent requirements. If a requirement is not in the documentation, it is not a requirement.
- Never assume behavior that is not documented. When in doubt, ask.
- Never treat a plausible inference as an explicit requirement. Label inferences as inferences.

## 2.3 Authorization and RLS

Claude must:
- Never bypass RLS for convenience. If RLS makes a feature difficult, the feature design must change — not the security model.
- Never use the service-role client in a context where the anon client with RLS would suffice.
- Never accept client-supplied IDs as proof of ownership. Always re-resolve ownership from the authenticated user's identity.
- Never trust client-side authorization checks. All authorization is server-side.

## 2.4 Secrets

Claude must:
- Never expose service-role credentials in any output, explanation, or code comment.
- Never generate code that imports or references service-role keys in client-boundable files.
- Never put secrets in environment variables that are marked as client-visible (`NEXT_PUBLIC_*`).
- Never log secrets, tokens, or credentials.

## 2.5 Architecture Fidelity

Claude must:
- Never modify the architecture silently. If a proposed change affects the architecture, it must be flagged and discussed.
- Never create infrastructure (tables, services, queues, buckets) without documented justification.
- Never weaken security to make a feature easier. If a feature cannot be implemented securely within the current architecture, the feature or the architecture must be reconsidered — not the security model.

## 2.6 Code Quality

Claude must:
- Write tests for critical behavior — state transitions, authorization boundaries, data isolation, upload flows.
- Explain significant architectural changes before implementing them.
- Preserve existing behavior unless the task explicitly requires changing it.
- Keep changes focused. A task to fix a validation rule should not also refactor the error handling system.
- Never leave commented-out code, debug console.logs, or temporary workarounds in committed code.

## 2.7 Before Specific Operations

Claude must read and understand the relevant documentation sections before:

| Operation | Required reading |
|-----------|-----------------|
| Creating a feature | Architecture Final v1, relevant § of Engineering Foundation, RTM entries |
| Modifying the database | Architecture Final v1 §7, Database Development Rules (§9), existing migration files |
| Changing authorization | Architecture Final v1 §1, RLS policies, relevant Server Action |
| Changing an API/Server Action | Architecture Final v1 §8 (state machine), Error Handling (§11), caller context |
| Changing a state transition | Architecture Final v1 §8, `transition_product_state` function, idempotency requirements |

---

# 3. Repository Structure

```
pandaverse-gharana-portal/
├── .claude/                          # Claude session configuration
│   └── CLAUDE.md                     # Project-specific guidance for Claude sessions
├── .github/
│   └── workflows/                    # CI pipelines
│       ├── ci.yml                    # Lint, typecheck, test, build
│       └── migrate.yml               # Migration lint + dry-run on PR
├── docs/
│   ├── project-understanding.md      # Project requirements and scope
│   ├── architecture-final-v1.md      # Approved architecture specification
│   ├── engineering-foundation.md     # This document
│   ├── decisions/                    # Product and architecture decision records
│   │   ├── B-02-submission-completeness.md
│   │   └── ...
│   └── adr/                          # Architecture Decision Records
│       ├── 001-rls-as-authorization-boundary.md
│       └── ...
├── supabase/
│   ├── migrations/                   # Database migrations (versioned)
│   │   ├── 20250101000001_initial_schema.sql
│   │   └── ...
│   ├── seed/                         # Seed data (development only)
│   │   └── 001_test_partners.sql
│   └── config.toml                   # Supabase project configuration
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth routes (login, signup, password reset)
│   │   ├── (partner)/                # Partner-authenticated routes
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   │   ├── new/
│   │   │   │   ├── [id]/
│   │   │   │   └── [id]/edit/
│   │   │   ├── media/
│   │   │   └── settings/
│   │   ├── (admin)/                  # Admin-authenticated routes
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   │   └── [id]/
│   │   │   ├── partners/
│   │   │   │   └── [id]/
│   │   │   └── settings/
│   │   ├── api/                      # API routes (minimal — prefer Server Actions)
│   │   │   └── health/
│   │   │       └── route.ts
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Root redirect (to /dashboard or /login)
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                       # Reusable UI primitives (buttons, inputs, etc.)
│   │   ├── forms/                    # Form components with validation
│   │   ├── auth/                     # Auth-related components (login form, etc.)
│   │   ├── products/                 # Product-specific components
│   │   ├── admin/                    # Admin-specific components
│   │   ├── media/                    # Media upload and display components
│   │   └── layout/                   # Layout components (header, sidebar, etc.)
│   ├── lib/
│   │   ├── supabase/                 # Supabase client configuration
│   │   │   ├── server.ts             # Server-side Supabase client (service-role)
│   │   │   ├── middleware.ts         # Client-side Supabase client (anon key)
│   │   │   └── admin.ts              # Admin-only Supabase client (bypasses RLS for system ops)
│   │   ├── auth/                     # Authentication helpers
│   │   │   ├── server.ts             # Server-side auth checks (getProfile, requireRole)
│   │   │   └── types.ts              # Auth-related types
│   │   ├── products/                 # Product domain logic
│   │   │   ├── server.ts             # Server-side product operations (submit, draft, etc.)
│   │   │   ├── validation.ts         # Product validation rules
│   │   │   └── types.ts              # Product domain types
│   │   ├── media/                    # Media upload logic
│   │   │   ├── server.ts             # Server-side upload orchestration
│   │   │   ├── storage.ts            # Storage path generation and cleanup
│   │   │   └── types.ts
│   │   ├── rbac/                     # Role-based access control helpers
│   │   │   ├── server.ts             # hasRole, requireRole, canTransition
│   │   │   └── types.ts
│   │   ├── errors/                   # Error types and handlers
│   │   │   ├── app-error.ts          # Base AppError class
│   │   │   ├── types.ts              # Error type definitions
│   │   │   └── handler.ts            # Error formatting for API responses
│   │   ├── logger.ts                 # Structured logging (server-side only)
│   │   └── types.ts                  # Global type definitions
│   ├── hooks/                        # Shared React hooks
│   │   ├── use-auth.ts
│   │   ├── use-media-upload.ts
│   │   └── use-product-draft.ts
│   ├── styles/                       # Global styles, Tailwind config
│   │   └── globals.css
│   └── middleware.ts                 # Next.js middleware (auth routing, role gating)
├── tests/
│   ├── unit/                         # Unit tests (pure functions, validation)
│   │   ├── products/
│   │   │   └── validation.test.ts
│   │   └── media/
│   │       └── storage.test.ts
│   ├── integration/                  # Integration tests (database + RLS)
│   │   ├── rls/
│   │   │   ├── partner-isolation.test.ts
│   │   │   ├── admin-access.test.ts
│   │   │   └── storage-policies.test.ts
│   │   ├── products/
│   │   │   ├── draft-lifecycle.test.ts
│   │   │   ├── submission.test.ts
│   │   │   └── state-transitions.test.ts
│   │   └── media/
│   │       ├── upload-flow.test.ts
│   │       └── dedup.test.ts
│   ├── server-actions/               # Server Action behavior tests
│   │   ├── submit-product.test.ts
│   │   ├── review-decision.test.ts
│   │   └── ...
│   └── e2e/                          # End-to-end tests (Playwright)
│       ├── partner/
│       │   ├── registration.spec.ts
│       │   ├── product-creation.spec.ts
│       │   └── media-upload.spec.ts
│       └── admin/
│           ├── review.spec.ts
│           └── partner-management.spec.ts
├── scripts/                          # Utility scripts
│   ├── migrate.sh                    # Run migrations locally
│   ├── seed.sh                       # Load seed data
│   └── check-rls.sh                  # Verify RLS policies match spec
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── .env.example                      # Template for required environment variables
├── .env.local                        # Local development secrets (git-ignored)
├── .env.staging                      # Staging secrets (git-ignored)
├── .env.production                   # Production secrets (never committed)
├── .eslintrc.json
├── .prettierrc
├── .gitignore
└── README.md
```

## 3.1 Directory Responsibilities

**`docs/`** — All project documentation. Decision records, architecture specs, and ADRs live here. Any change to architecture, security, or domain rules must be reflected here before code is written.

**`supabase/`** — All Supabase-specific configuration. Migrations are versioned SQL files. The seed directory contains development-only data. `config.toml` is the Supabase local development configuration.

**`src/app/`** — Next.js App Router pages and layouts. Route groups (parentheses) enforce role-based access at the routing level. API routes are minimal — Server Actions are the primary mutation mechanism.

**`src/components/`** — React components organized by domain. `ui/` contains framework-agnostic primitives. Domain-specific components live in their own directories.

**`src/lib/`** — All non-UI logic. Organized by domain (products, media, auth) and by execution context (server vs. shared). The `supabase/` subdirectory is the single source of truth for Supabase client configuration.

**`src/hooks/`** — Shared React hooks. Only hooks that are genuinely reusable across components live here. Component-specific hooks stay with their components.

**`tests/`** — Tests organized by type (unit, integration, server-actions, e2e) and then by domain. This structure makes it easy to run a specific test category.

**`scripts/`** — Utility scripts for development operations. Not part of the application bundle.

## 3.2 Principles

- **No premature abstraction.** Shared utilities are extracted only when three or more callers exist.
- **Colocation.** Code lives near where it is used. A Product-specific validation function lives in `src/lib/products/`, not in a generic `src/lib/validation/`.
- **Server-first.** Default to Server Components. Client Components are explicitly marked and kept minimal.
- **Single Supabase client per context.** There is exactly one server-side client, one middleware client, and one admin client. No ad-hoc client creation.

---

# 4. Environment Strategy

## 4.1 Environments

| Environment | Purpose | Supabase Project | Vercel Project | Data |
|-------------|---------|-----------------|----------------|------|
| **Development** | Local development by team members | Local Supabase instance (Docker) or shared dev project | Preview deployments per branch | Seed data, reset frequently |
| **Staging** | Pre-production validation, QA, stakeholder review | Separate Supabase project (staging) | Staging deployment (vercel.app or custom domain) | Sanitized production snapshot or dedicated staging data |
| **Production** | Live system used by Partners and Admins | Production Supabase project | Production domain | Real user data |

## 4.2 Environment Variable Management

**Convention:**
- Server-side only: Standard names (e.g., `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- Client-visible: Prefix with `NEXT_PUBLIC_` (e.g., `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Only the anon key is client-visible. No other secret uses this prefix.
- No secrets in `.env.example` — only variable names and descriptions.

**Development:**
- `.env.local` is git-ignored. Each developer has their own local Supabase instance.
- `supabase/config.toml` tracks local Supabase configuration.

**Staging:**
- Environment variables are set in the Vercel dashboard for the staging project.
- Supabase credentials are stored in the staging Supabase project's settings.
- No secrets are committed to the repository.

**Production:**
- Environment variables are set in the Vercel dashboard for the production project.
- Production Supabase credentials are stored in the production Supabase project's settings.
- Access to production credentials is restricted to authorized team members via Supabase's project access controls and Vercel's environment variable permissions.

## 4.3 Supabase Project Separation

Each environment has its own Supabase project:
- Separate databases (no shared data).
- Separate Storage buckets (dev/staging buckets may use cheaper tiers).
- Separate Auth configurations (email templates, rate limits).
- Migrations are applied to each environment independently via the Supabase CLI.

**Migration promotion path:** Migrations are developed locally, tested against the local Supabase instance, applied to staging for validation, then applied to production via the Supabase CLI with a manual review step.

## 4.4 Isolation Guarantees

- **Data isolation:** Development and staging databases contain no production data. Staging may contain sanitized copies for realistic testing.
- **Credential isolation:** Each environment has its own Supabase credentials. Compromising the development project does not expose production data.
- **Deployment isolation:** Vercel preview deployments use the staging Supabase project. Only the production Vercel deployment connects to the production Supabase project.

---

# 5. Secret Protection

## 5.1 The Rule

**The Supabase service-role key must never reach a browser bundle. Under any circumstance. No exceptions.**

The service-role key bypasses RLS. If it reaches a browser, any user who opens the developer console can extract it and gain full database access.

## 5.2 ESLint Protection

- An ESLint rule (custom or via `eslint-plugin-no-secrets`) flags any import or reference to `SUPABASE_SERVICE_ROLE_KEY` in files that could be bundled for the browser.
- The rule checks for:
  - Direct imports of the service-role client in `src/components/`, `src/hooks/`, or any file with `'use client'`.
  - References to `process.env.SUPABASE_SERVICE_ROLE_KEY` outside `src/lib/supabase/`.
  - Accidental inclusion of `server.ts` in client bundles via dynamic imports.

## 5.3 Build-Time Checks

- A build script verifies that the production bundle does not contain the string `SUPABASE_SERVICE_ROLE_KEY` or any recognizable fragment of the actual key value.
- This check runs as part of `next build` and fails the build if a violation is detected.

## 5.4 CI Scanning

- Every pull request runs a secret-scanning step (e.g., `truffleHog` or `git-secrets`) against the changed files.
- The scan checks for:
  - Hardcoded credentials (any secret pattern).
  - Environment variable names that suggest secrets in client-visible code.
  - Base64-encoded strings that decode to recognizable secret patterns.

## 5.5 Environment Variable Conventions

| Variable | Visibility | Description |
|----------|-----------|-------------|
| `SUPABASE_URL` | Server + Client | Supabase project URL. Non-sensitive. |
| `SUPABASE_ANON_KEY` | Server + Client | Supabase anon (public) key. Designed for client use. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server ONLY | Full-access key. Must never appear in client-boundable code. |
| `NEXT_PUBLIC_*` | Client-visible | Only non-sensitive configuration. No secrets. |

**Rule:** Any environment variable used in a file with `'use client'` or in `src/components/` must be prefixed `NEXT_PUBLIC_`. Any variable containing a secret must never have this prefix.

## 5.6 Server-Only Module Convention

- Files in `src/lib/supabase/server.ts` and `src/lib/supabase/admin.ts` are server-only.
- These files are never imported from Client Components, `src/hooks/`, or `src/components/`.
- If a Server Component needs to perform a server-only operation, it calls a Server Action — it does not import the server-side client directly.

## 5.7 Code Review Rules

Every pull request is reviewed for:
- [ ] No service-role key references in client-boundable files.
- [ ] No new `NEXT_PUBLIC_` variables that contain secrets.
- [ ] No hardcoded credentials, tokens, or connection strings.
- [ ] Server-only imports are only from server-side code (Server Components, Server Actions, Route Handlers, `src/lib/`).

---

# 6. Git Strategy

## 6.1 Branch Model

```
main (protected)
  └─ feature/<description> (short-lived, PR-based)
  └─ fix/<description> (short-lived, PR-based)
```

- **`main`** is the deployable branch. Every commit on `main` is a release candidate.
- **Feature branches** are created from `main` and merged back via pull request.
- **No long-lived branches.** Feature branches are short-lived (days, not weeks).
- **No `develop` branch.** The team is small; a develop branch adds ceremony without benefit.

## 6.2 Commit Conventions

- Commits use the format: `type(scope): description`
  - `feat(products): add draft save with debounce`
  - `fix(media): handle upload timeout retry`
  - `chore(migrations): add media_assets indexes`
  - `docs(architecture): update state machine diagram`
  - `test(rls): add partner isolation test`
- Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `perf`, `security`.
- Commits are atomic — one logical change per commit.

## 6.3 Pull Requests

- Every change goes through a pull request. No direct commits to `main`.
- PRs are reviewed by at least one other team member.
- PRs must pass all CI checks (lint, typecheck, tests, build) before merging.
- PRs are kept small. A PR that changes more than 5 files or adds more than 200 lines of application code should be split.

## 6.4 Migration Handling

- Database migrations live in `supabase/migrations/` and are versioned sequentially.
- Migrations are committed to the repository with the feature or fix that requires them.
- Migrations are applied to development first, then staging, then production — in that order.
- **Migrations are never edited after being applied to production.** If a migration has a bug, a new migration corrects it.
- Migrations are reviewed in PRs with the same rigor as application code.

## 6.5 Release Tagging

- Tags follow semantic versioning: `v1.2.3`.
- A tag is created when a set of changes is ready for deployment to production.
- Tags are annotated and include a summary of changes.
- The staging environment is continuously deployed from `main`. Production is deployed from tags.

---

# 7. Testing Strategy

## 7.1 Testing Pyramid

```
        ┌─────────┐
        │  E2E    │  Few — critical user journeys
        ├─────────┤
        │ Server  │  Moderate — Server Actions, API endpoints
        │ Action  │
        ├─────────┤
        │  RLS    │  Moderate — security-critical data isolation
        │ Tests   │
        ├─────────┤
        │   DB    │  Moderate — state transitions, constraints
        │ Integr. │
        ├─────────┤
        │  Unit   │  Many — pure functions, validation, utilities
        └─────────┘
```

## 7.2 Unit Tests

**What:** Pure functions, validation logic, utility functions, type transformations.

**Where:** `tests/unit/`

**What must be tested:**
- Product validation functions (precondition checks, field validation).
- Media checksum computation and dedup logic.
- State transition validation (is a given transition valid?).
- Error class construction and formatting.
- Storage path generation.
- Any function containing business logic that could fail silently.

**What does not need unit tests:**
- Trivial getters/setters.
- TypeScript type definitions.
- UI component rendering (covered by E2E tests).

## 7.3 Database / Integration Tests

**What:** Database behavior that cannot be tested in isolation — state transitions, constraints, cascading deletes, trigger behavior.

**Where:** `tests/integration/`

**What must be tested:**
- `transition_product_state` database function: valid transitions succeed, invalid transitions are rejected, idempotency works.
- `products` cascading deletes: deleting a Product removes its stories, makers, shops, media_assets, and state transitions.
- `UNIQUE(partner_id, checksum_sha256)` on `media_assets`: duplicate uploads are rejected.
- Audit log triggers: role changes, state transitions, and review decisions create audit entries.
- The `updated_at` trigger updates timestamps on row changes.

**Setup:** Tests run against a real PostgreSQL instance (local Supabase Docker or a test database). Each test suite runs in a transaction that is rolled back after the test.

## 7.4 RLS Security Tests

**What:** Multi-tenant data isolation. These are the most critical tests in the project.

**Where:** `tests/integration/rls/`

**What must be tested:**
- **Partner isolation:** Partner A cannot SELECT, UPDATE, or DELETE Partner B's Products, stories, makers, shops, or media — even with direct REST calls or crafted URLs.
- **Admin access:** An Admin can SELECT all Partners' data but cannot modify Products (only transition state via the dedicated function).
- **Storage policies:** Partner A cannot read or write Storage objects belonging to Partner B. Signed URLs for Partner A's media cannot be used to access Partner B's media.
- **Role escalation prevention:** A Partner cannot UPDATE their own `profiles.role`.
- **ID manipulation:** Supplying another Partner's `product_id` in a request does not grant access to that Product (RLS re-resolves ownership from `auth.uid()`).

**Test methodology:** Tests create multiple test users (Partners and Admins), authenticate as each, and attempt cross-tenant operations. All cross-tenant operations must fail.

## 7.5 Server Action / API Tests

**What:** Server Action behavior — input validation, authorization, state transitions, error responses.

**Where:** `tests/server-actions/`

**What must be tested:**
- `submitProduct`: valid submission transitions state, invalid submission returns validation errors, unauthorized user cannot submit another Partner's Product, idempotent on retry.
- `saveDraft`: draft is persisted, concurrent saves do not corrupt data.
- `uploadMedia`: file is uploaded to Storage, metadata is inserted, dedup prevents duplicates, unauthorized uploads are rejected.
- `reviewProduct`: Admin can approve/reject/request-changes, non-Admin cannot review, idempotent on retry.
- Error responses: validation errors return field-level messages, auth errors return generic messages (no sensitive details).

## 7.6 E2E Tests

**What:** Critical user journeys through the actual application.

**Where:** `tests/e2e/`

**What must be tested:**
- Partner registration → login → profile completion → Product creation → draft save → media upload → submission → view submitted state.
- Admin login → view submitted Products → inspect story/maker/shop/media → approve/reject/request-changes.
- Partner receives review decision → edits Product (if changes-requested) → re-submits.
- Authentication boundary: unauthenticated user is redirected to login, Partner cannot access Admin routes, Admin cannot access Partner routes.

**What does not need E2E tests:**
- Every edge case (covered by unit/integration tests).
- Visual design (covered by manual QA and design review).
- Every Admin filter and search combination.

## 7.7 What Must Pass Before Merging

Every PR must pass:
- [ ] Unit tests for new or changed logic.
- [ ] Integration tests for new or changed database behavior.
- [ ] RLS security tests for any change to authorization policies.
- [ ] Server Action tests for any new or changed Server Action.
- [ ] E2E tests for any new or changed user-facing flow.
- [ ] Lint, TypeScript typecheck, and production build.

Tests are written alongside implementation, not after. A PR without tests for its critical behavior does not pass review.

---

# 8. Quality Gates (CI)

Every pull request must pass the following automated checks:

| Check | Tool | Mandatory? | Purpose |
|--------|------|-----------|---------|
| **Formatting** | Prettier | Yes | Consistent code style. Auto-fixed on commit via pre-commit hook. |
| **Lint** | ESLint | Yes | Catch errors, enforce patterns, flag potential bugs. Custom rules for secret detection. |
| **TypeScript** | `tsc --noEmit` | Yes | Type safety. No `any` types without explicit justification. |
| **Unit tests** | Vitest | Yes | Verify pure function behavior. |
| **Integration tests** | Vitest + test database | Yes | Verify database behavior, state transitions, constraints. |
| **RLS security tests** | Vitest + test database | Yes | Verify multi-tenant isolation. |
| **Server Action tests** | Vitest | Yes | Verify mutation behavior and error handling. |
| **Build** | `next build` | Yes | Verify the application compiles and produces a valid production build. |
| **Secret scan** | `truffleHog` / `git-secrets` | Yes | Detect accidental credential commits. |
| **Migration lint** | `supabase migration lint` | Yes (when migrations are included) | Verify migrations are valid and non-destructive. |

## 8.1 Check Configuration

- **Pre-commit hook:** Prettier auto-format, ESLint fix, secret scan on staged files.
- **CI pipeline:** All checks above run on every PR. A failing check blocks merge.
- **Branch protection:** `main` is protected. Merges require passing CI and at least one approving review.
- **E2E tests:** Run on the staging environment after deployment (not on every PR, to keep CI fast). PRs that affect critical flows must have E2E tests that pass on staging before the PR is merged.

## 8.2 Performance in CI

- Integration and RLS tests run in parallel where possible.
- E2E tests run on staging (post-deploy) rather than in CI to keep PR feedback fast.
- Total CI time target: under 5 minutes for the standard PR check suite.

---

# 9. Database Development Rules

## 9.1 Migrations

- All schema changes are made through versioned migration files in `supabase/migrations/`.
- Migration filenames use the format: `YYYYMMDDHHMMSS_description.sql` (e.g., `20250101000001_initial_schema.sql`).
- Migrations are sequential. Each migration builds on the previous one. No migration assumes a schema state other than "all prior migrations applied."
- Migrations are **idempotent in effect** — applying them twice produces the same result (PostgreSQL DDL is naturally idempotent for most operations, but `CREATE IF NOT EXISTS` and `DROP IF EXISTS` should be used where applicable).
- Migrations are reviewed in PRs. A migration that drops data, drops columns, or modifies existing data must include a justification comment.
- **No migration is ever edited after it has been applied to production.** Corrections are made via new migrations.

## 9.2 Naming Conventions

- **Tables:** Plural, snake_case (e.g., `products`, `product_stories`, `media_assets`).
- **Columns:** snake_case (e.g., `partner_id`, `lifecycle_state`, `checksum_sha256`).
- **Foreign keys:** `<referenced_table_singular>_id` (e.g., `partner_id`, `product_id`).
- **Indexes:** `idx_<table>_<column(s)>` (e.g., `idx_products_partner_id`, `idx_products_lifecycle_state`).
- **Constraints:** Named descriptively (e.g., `chk_products_lifecycle_state`, `uq_media_assets_partner_checksum`).
- **Functions:** snake_case (e.g., `transition_product_state`, `is_valid_transition`).
- **Schemas:** `public` for application tables. `storage` for Supabase Storage (managed by Supabase). No custom schemas in v1.

## 9.3 Foreign Keys

- Every foreign key has an explicit `ON DELETE` action:
  - `CASCADE` when the child's existence depends on the parent (e.g., `product_stories` → `products`).
  - `RESTRICT` or `SET NULL` when the child should survive parent deletion (rare in v1).
- Foreign keys are always named explicitly (e.g., `fk_product_stories_product`).
- Foreign key columns are NOT NULL unless the relationship is genuinely optional.

## 9.4 Constraints

- **CHECK constraints** enforce domain rules at the database level where the rule is unambiguous and universally applicable (e.g., `lifecycle_state` CHECK, `role` CHECK, `content_format` CHECK).
- **UNIQUE constraints** enforce uniqueness (e.g., `UNIQUE(partner_id, checksum_sha256)` on `media_assets`, `UNIQUE(idempotency_key)` on `product_state_transitions`).
- **NOT NULL constraints** are used for required fields. Optional fields are NULLable.
- **Application-level validation** handles rules that are conditional, context-dependent, or require access to external data (e.g., "is this transition valid given the current state" — handled by the `transition_product_state` function).

## 9.5 Indexes

- Indexes are created for:
  - Foreign key columns (automatic performance benefit for JOINs).
  - Columns used in WHERE clauses for common queries (`partner_id`, `lifecycle_state`, `submitted_at`).
  - Columns used in ORDER BY clauses for list views.
- Indexes are not created speculatively. They are added when a query plan shows a need or when a query pattern is confirmed as common.
- Composite indexes are used when queries filter on multiple columns (e.g., `(partner_id, lifecycle_state)` for "my products by state").

## 9.6 Timestamps

- Every table has `created_at` (DEFAULT `NOW()`) and `updated_at` (DEFAULT `NOW()`, updated by trigger).
- `updated_at` is updated automatically via a `BEFORE UPDATE` trigger — the application does not set it manually.
- Timestamps use `TIMESTAMPTZ` (timestamp with time zone). All timestamps are stored in UTC.
- The application converts to the user's local timezone for display only — storage is always UTC.

## 9.7 Soft Deletion

- Tables that may need historical reference use `deleted_at` (nullable `TIMESTAMPTZ`).
- **Current v1 soft-delete usage:** `media_assets.deleted_at` — allows distinguishing "never had media" from "had media but deleted it," and enables a cleanup job for orphaned Storage objects.
- **No blanket soft-delete policy.** Soft deletion is added per-table when there is a specific reason (audit, cleanup, recovery). It is not applied universally.
- Soft-deleted rows are excluded from normal queries via `WHERE deleted_at IS NULL`. Admin queries may include soft-deleted rows when reviewing history.

## 9.8 Transactions

- State transitions (submission, review decisions) are wrapped in database transactions.
- The `transition_product_state` function wraps the entire state change (idempotency check, state validation, row lock, state update, transition record insert) in a single transaction.
- Upload operations use a two-phase approach: Storage upload first, metadata insertion second — with a cleanup path for the Storage object if metadata insertion fails.
- Application code does not manage transactions directly. Transactions are encapsulated in database functions or server-side service functions.

## 9.9 State Transitions

- Product lifecycle state transitions are **exclusively** handled by the `transition_product_state` database function.
- No application code directly UPDATEs `products.lifecycle_state`. The application calls the function, which validates the transition and executes it atomically.
- The function enforces: valid transitions, idempotency (via `idempotency_key`), atomicity (single transaction), and audit logging (inserts into `product_state_transitions`).
- Valid transitions:
  - `draft` → `submitted` (Partner submits)
  - `submitted` → `approved` (Admin approves)
  - `submitted` → `rejected` (Admin rejects)
  - `submitted` → `changes_requested` (Admin requests changes)
  - `changes_requested` → `draft` (Partner re-opens for editing)
  - `changes_requested` → `submitted` (Partner re-submits)

## 9.10 Concurrency

- State transitions use `SELECT ... FOR UPDATE` to lock the Product row during the transition, preventing concurrent submissions.
- Draft saves use optimistic concurrency (the application checks that the draft version hasn't changed before saving, or uses a simple last-write-wins with `updated_at` tracking).
- Media uploads are idempotent via checksum dedup — uploading the same file twice does not create duplicate records.

## 9.11 RLS

- **Default-deny.** Every table has RLS enabled. If a policy is missing, access is denied.
- **RLS is the final authorization boundary.** The application enforces authorization, but RLS is the safety net that prevents any bypass.
- **Service-role bypasses RLS.** The service-role client is used only for system operations (audit logs, state transitions) that must bypass RLS. These operations are isolated in dedicated modules with strict access control.
- **RLS policies are tested.** Every policy has at least one RLS security test that verifies it works correctly.
- **RLS policies are reviewed in PRs.** Any change to RLS policies requires a security-focused review.
- **RLS policies reference `auth.uid()`, never client-supplied IDs.** A policy that checks `user_id = <client value>` is wrong. It must check `user_id = auth.uid()`.

---

# 10. Application Architecture Rules

## 10.1 Layer Boundaries

```
┌──────────────────────────────────────────────────────────────┐
│ Browser                                                      │
│ - Client Components (React)                                  │
│ - Calls Server Actions or fetches from Route Handlers         │
│ - Never directly accesses database or Storage                │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTP (form data, JSON)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Next.js Server                                               │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Server Components                                         │ │
│ │ - Render UI based on server-fetched data                 │ │
│ │ - No mutable operations                                   │ │
│ │ - Authorization: resolve role, conditionally render       │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Server Actions                                            │ │
│ │ - All mutations (create, update, delete, submit)          │ │
│ │ - Validation: input validation before any DB access       │ │
│ │ - Authorization: verify role, verify ownership            │ │
│ │ - Business rules: enforce domain logic                    │ │
│ │ - Call service functions → database functions             │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Server-side service layer (`src/lib/`)                   │ │
│ │ - Product operations (submit, draft, transition)          │ │
│ │ - Media operations (upload, delete, checksum)             │ │
│ │ - Auth operations (getProfile, requireRole)               │ │
│ │ - Supabase client calls                                   │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────────────────┘
                       │ Supabase client (anon or service-role)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ Supabase                                                     │
│ ┌────────────────┐  ┌─────────────────────────────────────┐ │
│ │ PostgreSQL     │  │ Storage                             │ │
│ │ - RLS enforces │  │ - Storage policies enforce          │ │
│ │   authorization │  │   authorization                     │ │
│ │ - Database      │  │ - Signed URLs for client access     │ │
│ │   functions     │  │ - Service-role for admin ops        │ │
│ │   (transitions) │  │                                     │ │
│ └────────────────┘  └─────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## 10.2 Where Things Happen

| Concern | Where | Why |
|---------|-------|-----|
| **Input validation** | Server Action (before any DB call) | Prevents invalid data from reaching the database. Client-side validation is for UX only — server-side is the authority. |
| **Authorization (application)** | Server Action / Server Component | The application checks role and ownership before performing any operation. This provides clear error messages and prevents unnecessary DB calls. |
| **Authorization (database)** | RLS policies | The final safety net. Even if the application has a bug, RLS prevents unauthorized access. |
| **Business rules** | Server Action → database function | Rules like "valid state transitions" and "submission preconditions" are enforced in the application layer, with critical rules (state transitions) also enforced in database functions for atomicity. |
| **Database access** | `src/lib/` service functions | All DB access goes through typed service functions. No ad-hoc queries in Server Actions. |
| **File operations** | Server-side only | Upload, delete, and signed URL generation happen on the server. The client receives signed URLs for direct uploads but never handles credentials. |

## 10.3 Server/Client Boundary

- **Server Components** are the default. They fetch data, render UI, and call Server Actions.
- **Client Components** (`'use client'`) are used only when interactivity is required (forms, real-time updates, media upload progress).
- **Client Components never:**
  - Make authorization decisions.
  - Access the database directly.
  - Know about service-role credentials.
  - Modify data without calling a Server Action.
- **Server Actions are the only mutation mechanism.** There are no client-side mutations, no direct API calls from Client Components that modify data, no client-side database access.

## 10.4 Validation Strategy

- **Server-side validation is mandatory and authoritative.** Every Server Action validates its inputs before any side effect.
- **Client-side validation is for UX only.** It provides immediate feedback but is never trusted for security.
- **Validation uses Zod schemas** (or equivalent) that are shared between client and server where practical, but server-side validation always runs regardless.
- **Database constraints are the final safety net** for structural rules (NOT NULL, CHECK, UNIQUE).

## 10.5 Error Propagation

- Server Actions return structured results: `{ success: true, data: ... }` or `{ success: false, error: { type, message, fields } }`.
- Errors are never thrown as unhandled exceptions to the client. They are caught, classified, and returned as structured error responses.
- Server-side errors (database failures, unexpected exceptions) are logged with full context but return a generic message to the client: "An unexpected error occurred. Please try again."

---

# 11. Error Handling

## 11.1 Error Types

```typescript
// src/lib/errors/types.ts
enum ErrorType {
  VALIDATION = 'validation',       // Input failed validation
  AUTHORIZATION = 'authorization', // User lacks permission
  NOT_FOUND = 'not_found',         // Resource does not exist
  CONFLICT = 'conflict',           // Operation conflicts with current state
  DATABASE = 'database',           // Database operation failed
  STORAGE = 'storage',             // Storage operation failed
  EXTERNAL = 'external',           // External service failure
  UNEXPECTED = 'unexpected',       // Unhandled error
}
```

## 11.2 Error Handling by Category

**Validation errors:**
- Return field-level error messages (e.g., `{ field: 'name', message: 'Name is required' }`).
- Do not expose internal validation logic or database constraint names.
- Client displays errors inline next to the relevant field.

**Authorization errors:**
- Return a generic message: "You do not have permission to perform this action."
- Do not reveal whether the resource exists, what the user's role is, or why they were denied.
- Log the authorization failure with context (user ID, attempted action, resource ID) for audit purposes.

**Not-found errors:**
- Return a generic message: "The requested resource was not found or you do not have access to it."
- Do not distinguish between "does not exist" and "exists but you cannot access it" — both return the same message to prevent information leakage.

**Conflict errors:**
- Occur when an operation conflicts with the current state (e.g., submitting an already-submitted Product, uploading a duplicate file).
- Return a specific message explaining the conflict: "This Product has already been submitted."
- Include the current state in the response so the client can update its UI.

**Database errors:**
- Log the full error (including SQLSTATE, constraint name) server-side.
- Return a generic message: "A database error occurred. Please try again."
- Do not expose database schema details, table names, or constraint violations.

**Storage errors:**
- Log the full error server-side.
- Return: "The file could not be uploaded. Please try again."
- Distinguish between transient errors (retry) and permanent errors (file too large, invalid type) — but only in logs, not in user-facing messages.

**Unexpected errors:**
- Caught by a global error handler in Server Actions.
- Logged with full stack trace, request context, and user ID.
- Return: "An unexpected error occurred. Please try again or contact support if the problem persists."
- Never expose stack traces, internal paths, or environment details to the client.

## 11.3 Error Logging

All errors are logged with:
- Correlation ID (from request headers or generated).
- User ID (if authenticated).
- Action being performed.
- Error type and message.
- Stack trace (server-side only).

Errors are never silently swallowed. Every caught error is logged with enough context to diagnose the cause, without logging secrets, credentials, request bodies, or unnecessary PII.

---

# 12. Observability

## 12.1 Minimum V1 Requirements

**Structured logs:**
- All server-side logs use structured JSON format.
- Log fields: `timestamp`, `level`, `correlationId`, `userId`, `action`, `errorType`, `message`.
- Logs contain useful diagnostic information without unnecessarily logging sensitive data, request payloads, secrets, credentials, or personal information.
- For Server Actions and other application operations, log meaningful events: request start/completion, state transitions, authorization failures, and errors. Use correlation IDs and record relevant identifiers where safe.
- Do not log complete request bodies. Do not log secrets or credentials. Do not log unnecessary PII.
- Do not interpret the logging requirement as "log everything." Log what is needed to diagnose production issues — nothing more.

**Request/correlation IDs:**
- Every incoming request receives a correlation ID (from `x-request-id` header or generated).
- The correlation ID is propagated through all downstream operations (database calls, Storage calls).
- The correlation ID is returned in the response header and included in all log entries.
- This enables tracing a single request across the entire system.

**Error tracking:**
- An error tracking service (e.g., Sentry) captures unhandled exceptions and reported errors.
- Error reports include: correlation ID, user ID, action, stack trace, request context.
- Error reports do not include secrets, PII, or request bodies (which may contain sensitive content).
- Error tracking is server-side only. Client-side error tracking (if used) sends only non-sensitive error metadata.

**Health checks:**
- `/api/health` returns the application's health status.
- Health check verifies: database connectivity, Storage connectivity, Supabase Auth connectivity.
- Health check does not expose internal details — returns `{ status: 'healthy' }` or `{ status: 'degraded', details: [...] }`.
- Health check is used by Vercel's deployment verification and monitoring.

**Audit events:**
- The following events are recorded in `audit_logs`:
  - Admin views a Product (optional — see non-blocking items).
  - State transitions (submission, approval, rejection, changes-requested).
  - Role changes (when implemented).
  - Review decisions (with Admin identity, timestamp, and notes).
- Audit logs are written server-side via the service-role client. They bypass RLS.
- Audit logs are immutable (no UPDATE or DELETE permitted).

## 12.2 What Is Not Included in V1

- Distributed tracing (OpenTelemetry, Jaeger) — adds complexity without clear need for a small team.
- Custom metrics dashboards — Vercel Analytics and Supabase's built-in monitoring are sufficient.
- Alerting — manual monitoring is sufficient for v1. Automated alerts can be added when the team grows or traffic patterns stabilize.
- Performance monitoring (APM) — not required for v1. Performance is validated through testing and load testing when needed.

---

# 13. Documentation Rules

## 13.1 What Must Be Updated and When

| Change type | Documents to update | When |
|-------------|-------------------|------|
| Architecture change | Architecture Final v1, relevant ADRs, this Engineering Foundation Specification | Before code is written |
| Database schema change | Architecture Final v1 (schema sections), migration files, RTM | Before migration is created |
| Security behavior change | Architecture Final v1 (security sections), this Engineering Foundation (Secret Protection, RLS sections) | Before code is written |
| Domain decision change | Relevant decision record in `docs/decisions/`, Architecture Final v1 | Before implementation of the affected feature |
| API / Server Action change | Architecture Final v1 (API sections), caller documentation | Before the Server Action is modified |
| Environment variable change | `.env.example`, this Engineering Foundation (Environment Strategy) | Before the variable is introduced |
| Testing requirement change | This Engineering Foundation (Testing Strategy) | Before the test is expected |

## 13.2 B-02 — Open Product Decision

```text
B-02
Status: OPEN
Decision owner: Product/Domain stakeholder
Question: What defines a complete Product for submission?
```

The eventual submission rule must remain isolated so it can be decided later without requiring unnecessary architectural changes. No code, migration, or Server Action that depends on B-02 should be written as if the decision has been made.

If `submitProduct()` is implemented before B-02 is resolved, it must fail safely or remain explicitly unavailable rather than silently applying an invented rule. The submission validation boundary may be defined in the architecture (the place where preconditions are checked), but the actual business rule — which components and fields are required — must remain unresolved until the stakeholder provides the answer.

The decision must be updated in the requirements/decision documentation once the stakeholder provides the answer.

## 13.3 Documentation Ownership

- Architecture Final v1 is owned by the Lead Software Architect.
- Decision records are owned by the person who proposes the decision.
- This Engineering Foundation Specification is owned by the Principal Software Engineer.
- Documentation updates are part of the Definition of Done (§14). A feature is not complete until its documentation is updated.

---

# 14. Definition of Done

A feature, bug fix, or change is not complete until all of the following are satisfied:

## 14.1 Implementation

- [ ] Code implements the documented requirement correctly.
- [ ] Code follows the Engineering Principles (§1) and Claude Development Rules (§2).
- [ ] Code is in the correct location within the repository structure (§3).
- [ ] No debug code, console.logs, or commented-out code remains.

## 14.2 Validation

- [ ] Input validation is implemented server-side in the Server Action.
- [ ] Database constraints (NOT NULL, CHECK, UNIQUE) are in place for structural rules.
- [ ] Validation error messages are clear and field-specific.

## 14.3 Authorization

- [ ] The application checks authorization (role + ownership) before performing any operation.
- [ ] RLS policies cover the affected tables and have been tested.
- [ ] No service-role client is used where the anon client with RLS would suffice.

## 14.4 Tests

- [ ] Unit tests cover new or changed pure functions and validation logic.
- [ ] Integration tests cover new or changed database behavior.
- [ ] RLS security tests cover any change to authorization policies or new tables.
- [ ] Server Action tests cover new or changed Server Actions.
- [ ] E2E tests cover new or changed user-facing flows.
- [ ] All tests pass.

## 14.5 Error Handling

- [ ] All error paths return appropriate, non-sensitive error messages.
- [ ] Errors are logged with correlation ID, user ID, and context.
- [ ] No unhandled exceptions reach the client.

## 14.6 Security Review

- [ ] The change has been reviewed for security implications (data exposure, injection, authorization bypass, secret exposure).
- [ ] No new secrets or credentials are introduced.
- [ ] No client-boundable code references server-only modules or credentials.

## 14.7 Documentation

- [ ] Architecture documents are updated if the change affects architecture, security, or domain rules.
- [ ] Decision records are updated if the change resolves or modifies an open decision.
- [ ] Code comments explain non-obvious logic (not trivial logic).
- [ ] `.env.example` is updated if new environment variables are introduced.

## 14.8 Code Quality

- [ ] Lint passes (ESLint).
- [ ] TypeScript typecheck passes (`tsc --noEmit`).
- [ ] Prettier formatting is applied.
- [ ] Build succeeds (`next build`).

## 14.9 Migration Review (if applicable)

- [ ] Migration is reviewed for correctness, idempotency, and data safety.
- [ ] Migration has been tested against a copy of production-like data (for non-trivial migrations).
- [ ] Migration rollback plan exists (for destructive migrations).

## 14.10 Review

- [ ] At least one team member has reviewed the PR.
- [ ] All CI checks pass.
- [ ] The PR is approved and merged.

---

# 15. Explicit Open Decision

## B-02 — Submission Completeness

```text
B-02
Status: OPEN
Decision owner: Product/Domain stakeholder
Question: What defines a complete Product for submission?
```

**B-02 is unresolved.** No submission completeness rule has been assumed, invented, or defaulted. The engineering architecture supports any eventual business rule without requiring schema changes.

The eventual submission rule must remain isolated so it can be decided later without unnecessary architectural changes. No code, migration, or Server Action that depends on B-02 should be written as if the decision has been made.

If `submitProduct()` is implemented before B-02 is resolved, it must fail safely or remain explicitly unavailable rather than silently applying an invented rule. The submission validation boundary may be defined in the architecture (the place where preconditions are checked), but the actual business rule — which components and fields are required — must remain unresolved until the stakeholder provides the answer.

The decision must be updated in the requirements/decision documentation once the stakeholder provides the answer.

---

**End of Engineering Foundation Specification.**

*This document is the engineering baseline for V1 implementation. It will be updated as the project evolves. Changes to this document follow the Documentation Rules in §13.*
