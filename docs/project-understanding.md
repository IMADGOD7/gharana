# PandaVerse Gharana Partner Portal
## Project Understanding Document

**Status:** Draft v1 — pre-implementation analysis
**Phase:** Understand → Identify → Design (review pending)
**Prepared by:** Lead Software Architect / Senior Engineering Manager
**No application code, database schema, or project scaffolding has been created.**

---

## 0. Important Note on Inputs

This document has been produced from the requirements narrative provided inline in the kickoff brief. No attached specification file was available at the time of writing. If a fuller specification document exists (PDF, docx, markdown, Figma export, Notion page, etc.), it should be ingested **before design finalization** so that:

- naming and terminology (e.g. "maker", "shop", "story") match the brand
- the exact submission → review → approval state machine is captured precisely
- any explicit admin capabilities we have not enumerated are not missed
- any explicit non-functional targets (SLOs, regions, retention, GDPR) are honored

Where this document makes assumptions, they are called out explicitly in §10 (Unknowns).

---

## 1. Executive Summary

### What the product is
**PandaVerse Gharana Partner Portal** is a private, authenticated web application that connects two roles around a single shared artifact: a **Product**.

- **Partners** — typically independent creators, makers, or shop owners — register, build out a profile, and assemble rich Product submissions (story, maker information, shop information, original photos and videos). Each Product exists as a long-lived draft that a Partner can resume, and is finalized only when the Partner explicitly submits it for review.
- **Admins** — internal staff representing PandaVerse Gharana — manage Partners and review submitted Products. They read, search, filter, and decide what happens to each submission (approve, reject, or request changes).

The product is essentially a **curated intake and review system** for content the brand needs to publish or feature elsewhere.

### What business problem it solves
Without a dedicated portal, the brand's intake of creator content typically happens through email, spreadsheets, shared drives, and ad-hoc messaging. That produces:

- lost or misplaced submissions
- inconsistent product records (different fields, different formats)
- unverifiable ownership of media
- no clean audit trail of who submitted what and when
- no isolation between creators (creators see each other's data)
- no review workflow with traceable decisions

The portal centralizes this into one role-segregated, auditable system.

### Who uses it
- **Partners** (external creators / makers / shop owners): register, complete a profile, create and submit Products, upload original media.
- **Admins** (internal staff): manage Partners, browse and search Products, inspect every Product's story / maker / shop / media, and make review decisions.

### Core workflows (at a glance)
1. Partner registration & login
2. Partner profile completion
3. Product creation as a draft
4. Incremental save → resume draft → continue
5. Media upload (originals only)
6. Product submission for review
7. Admin review (approve / reject / request changes)
8. Admin search & filtering across the catalog
9. Admin Partner management

### What makes this a production system rather than a simple CRUD app
A naive CRUD framing hides the real risks. This system must be production-grade because:

- **Multi-tenant isolation.** Partner A must never see Partner B's data — including Products, drafts, media, and profile. This is enforced at the database (RLS) and storage layers, not just in the UI.
- **Long-lived drafts with media.** A draft may exist for weeks, accumulate gigabytes of originals, and be edited concurrently or from multiple devices. The system must handle partial state cleanly.
- **Original media is the asset.** "Originals" implies a downstream pipeline (transcoding, publishing) likely lives outside the portal; we must preserve original files bit-for-bit and record their provenance.
- **Submission is a state transition, not a save.** Submission locks the product, switches the lifecycle state, and exposes it to Admin. A second submission of the same Product must not be possible; concurrent edits must not race submission.
- **Admin actions are consequential.** Approve/reject/request-changes are decisions that downstream systems may consume. They need to be auditable and idempotent.
- **Security is the primary non-functional requirement.** Authentication, authorization, storage access, and ID manipulation must all be hardened before any other priority.
- **Operability.** Deployed on Vercel + Supabase means real users, real outages, real migrations. Logging, error visibility, and rollback safety are required.

---

## 2. Actors

| Actor | Type | Responsibility |
|---|---|---|
| **Partner** | Human (external) | Register, manage own profile, create and submit Products, upload originals, manage own drafts. |
| **Admin** | Human (internal) | Manage Partners, browse Products, review submissions, make decisions. |
| **Authentication System** | System (Supabase Auth) | Identity, sessions, password reset, email verification. |
| **Database** | System (PostgreSQL via Supabase) | Durable persistence of profiles, Products, stories, makers, shops, reviews, audit. |
| **Storage System** | System (Supabase Storage) | Durable storage of original media (photos, videos). |
| **Edge / Application Runtime** | System (Next.js on Vercel) | Server-side enforcement of business rules that RLS cannot express alone (validation, transactions, side-effects). |
| **Object-Relation Layer (PostgREST via Supabase)** | System | Mediates all DB access; RLS is evaluated at this boundary. |
| **Email / Notification System** | System (implied) | Verification, password reset, submission received, review decision. Not explicitly required, but realistic for production. |
| **Downstream Content Pipeline** | External system (implied) | Consumes approved Products (and their media). "Originals" phrasing implies transcoding/publishing happens elsewhere. |
| **Attacker / Curious User** | Adversarial | Attempts to read another Partner's records, forge identities, exfiltrate media, or tamper with submissions. |

**Notes on actors not in the brief but implied:**
- A **Super Admin / Platform Owner** is not named but is almost always required in practice — someone to promote an Admin, revoke access, and handle legal/data-export requests. Worth confirming.
- A **review-decision consumer** (downstream) is implied by "submitted for review". Whether the portal pushes to it (webhook) or it polls is a design question.
- **Audit readers** (compliance, legal) — implied by the security stance; they need read access to history without write access.

---

## 3. Functional Requirements

Each requirement is tagged as **[E]**xplicit, **[I]**nference, or **[?]** Unknown.

### 3.1 Authentication
- **[E]** Partner registration (sign-up)
- **[E]** Partner authentication (login)
- **[E]** Admin authentication (login)
- **[I]** Logout / session termination
- **[I]** Password reset (standard production requirement)
- **[I]** Email verification before sensitive actions (e.g. before submitting a Product, or at sign-up)
- **[?]** Whether Admins are seeded manually, invited, or self-register with a code
- **[?]** Whether Admin sessions have stricter requirements (IP allowlist, MFA)

### 3.2 Partner Management
- **[E]** Partners can manage their own profile
- **[I]** Admins can manage Partners (list, view, suspend, edit, delete)
- **[I]** Profile fields are not enumerated in the brief; need a confirmed schema (display name, bio, contact, location, social handles, etc.)
- **[?]** Whether a Partner can delete their own account, and what happens to their Products and media (legal hold? re-assignment? hard delete?)
- **[?]** Whether Partner accounts need approval/verification before they can submit

### 3.3 Product Management
- **[E]** Partners can create Products
- **[E]** Partners can save Products as drafts
- **[E]** Partners can resume drafts later
- **[I]** Partners can edit their own draft
- **[I]** Partners can delete their own draft (or only Admin can — needs decision)
- **[I]** Partners can list their own Products filtered by state (draft / submitted / approved / rejected / changes-requested)
- **[?] / [E]** A Product is composed of: story + maker + shop + media (per the brief). These are sub-entities, not separate Products.

### 3.4 Product Stories
- **[E]** Partners can enter product stories
- **[I]** A story is rich text (possibly with limited formatting: paragraphs, headings, links)
- **[I]** Story length limits (chars/words) — to be set
- **[?]** Whether stories support multiple languages
- **[?]** Whether story revisions are tracked (versioning)

### 3.5 Maker Information
- **[E]** Partners can enter maker information
- **[I]** "Maker" likely refers to the person(s) who physically made the Product — possibly distinct from the Partner account. Could be the Partner themselves or someone they represent.
- **[I]** Maker fields: name, bio, photo, location, techniques, materials — to be confirmed
- **[?]** One maker per Product vs. multiple? One maker per Partner vs. many?

### 3.6 Shop Information
- **[E]** Partners can enter shop information
- **[I]** "Shop" likely refers to where the Product can be purchased / where the Partner sells — possibly external (URL, address)
- **[I]** Shop fields: name, URL, address, hours, contact — to be confirmed
- **[?] / [I]** One shop per Partner vs. many shops per Partner

### 3.7 Media Management
- **[E]** Partners can upload original photos and videos
- **[I]** Originals are stored bit-identical; we never transcode inside the portal
- **[I]** Media is associated with a Product (and possibly with a story / maker as well)
- **[I]** Upload progress, retry, resumability (large videos)
- **[I]** Validation: MIME, dimensions/duration limits, max file size, malware scanning (implied by production grade)
- **[?]** Whether photos and videos have separate quotas or policies
- **[?]** Whether originals can be replaced (and whether prior versions are retained)
- **[?]** Whether EXIF / metadata is preserved, stripped, or surfaced

### 3.8 Product Submission & Review
- **[E]** Partners can submit Products for review
- **[E]** Admins can review submitted Products
- **[I]** Submission is a one-way transition: draft → submitted (locked)
- **[I]** Review produces a decision: approve / reject / request changes
- **[I]** "Request changes" returns the Product to the Partner for editing
- **[I]** Decision is recorded with timestamp, Admin identity, and optional notes
- **[?] / [I]** Whether decisions can be reversed by another Admin
- **[?]** Whether a Product can be re-submitted after changes-requested and how many times
- **[?]** Whether Partners see Admin's review notes

### 3.9 Admin Operations
- **[E]** Manage partners
- **[E]** View products
- **[E]** Inspect product stories, makers, shops, and media
- **[E]** Search and filter content
- **[I]** Inspect profile data of a Partner
- **[I]** Download original media (for downstream pipeline or archival)
- **[?]** Whether Admins can edit a Product directly, or only via the review/decision mechanism

### 3.10 Search & Filtering
- **[E]** Admins can search and filter content
- **[I]** Filters likely include: state, partner, date range, has-media, has-maker, has-shop, full-text on story
- **[?]** Whether Partners can search their own catalog

### 3.11 Content Library / Catalog
- **[I]** An aggregate view of all Products across all states — required for Admin search & filtering
- **[?]** Whether there is a "public catalog" surface — the brief implies the portal is private, but downstream publication is implied
- **[?] / [I]** Audit log of who viewed what Product and when (implied by security stance)

---

## 4. Non-Functional Requirements

### 4.1 Security (top priority)
- **Authentication must be enforced server-side.** No client-only gating.
- **Authorization is enforced at three layers**: Next.js server (route handlers / RSC), Supabase RLS (database), and Supabase Storage policies (object access). All three must agree.
- **Tenant isolation.** A Partner must not be able to read or write another Partner's data, including via direct REST calls, raw SQL through PostgREST, signed-URL guessing, or path traversal in Storage.
- **ID integrity.** All identifiers are UUIDs. Never trust client-supplied IDs in URL paths to imply ownership — always re-resolve ownership against the authenticated user.
- **Secret hygiene.** No service-role keys in client code. Only the Supabase anon key is shipped to the browser. Service-role access only from server code (route handlers, RSC, migrations).
- **Transport security.** TLS everywhere; HSTS; secure cookies (httpOnly, sameSite=lax/Strict, secure in prod).
- **CSRF.** Server actions / route handlers must be CSRF-safe (Supabase + Next.js conventions give us this by default if we use server actions correctly).
- **Rate limiting** on auth endpoints, magic links, and uploads.
- **Audit logging** for Admin reads of sensitive data and all review decisions.

### 4.2 Reliability
- **No silent data loss.** Draft autosave must be durable enough that a Partner can close the tab and resume next week.
- **Idempotent writes** for upload + metadata, submission, and review decisions.
- **Eventual consistency is fine for search index**, but the source of truth is always Postgres.

### 4.3 Availability
- **Target:** The portal is a back-office tool, not consumer-facing public traffic, so 99.5% is a reasonable starting SLO. Final number to be confirmed.
- **Degraded modes:** if Storage is unavailable, draft save must still succeed (DB-only writes should not depend on Storage being up). If Search is unavailable, the Admin catalog should still load (DB query).

### 4.4 Performance
- **Cold-start acceptable**, warm paths fast: under 200ms TTFB for typical Partner reads; under 500ms for Admin search results up to a few thousand Products.
- **Large media uploads** use signed URLs or direct-to-bucket uploads to keep the application server out of the hot path.

### 4.5 Scalability
- **Horizontal scale** is automatic (Vercel + Supabase). We design for single-region to start; multi-region is not required by the brief.
- **Storage scaling** is handled by Supabase; we just need to define bucket quotas per Partner.

### 4.6 Maintainability
- **Strict TypeScript** end-to-end. No `any` in business logic. Branded types for IDs.
- **Single source of truth for the schema** — Supabase types generated from Postgres, not hand-written.
- **Migrations are forward-only and reversible via down migrations.** We keep a `supabase/migrations` directory.
- **No dead code, no commented-out code in main.** Strict lint rules.

### 4.7 Observability
- **Structured logs** from server code with request IDs.
- **Supabase logs** integrated (Postgres + Storage + Auth).
- **Error tracking** (e.g. Sentry or equivalent) — to be confirmed in §10.
- **Audit log table** for Admin actions and review decisions (queried, not just appended).
- **Health check endpoint** for Vercel.

### 4.8 Data Integrity
- **Foreign keys with ON DELETE rules** carefully chosen (especially for media tied to a Product).
- **State machine enforced in DB** (CHECK constraint or trigger) for Product lifecycle.
- **Transactions** for any write that spans multiple tables (e.g. create draft + initial story).
- **Unique constraints** to prevent duplicate submissions, duplicate media records.

### 4.9 Deployment
- **Preview deployments per PR** (Vercel).
- **Production deploys from `main`** with required checks (lint, type, test, migration dry-run).
- **Migrations applied as part of CI/CD** to the staging project first, then prod.
- **Environment separation**: dev / staging / prod projects on Supabase. Never share keys.

### 4.10 Testing
- **Unit tests** for business logic and state transitions.
- **Integration tests** against a real (test) Supabase project — not mocks — because RLS is exactly the kind of thing mocks would let you ship broken.
- **RLS tests** as a dedicated suite: for every table, verify a Partner cannot read/write another Partner's rows, and an Admin can.
- **Storage policy tests** as a dedicated suite: paths/prefixes enforce ownership.
- **End-to-end tests** for the critical user journeys (sign-up → draft → submit → review).
- **Security review** before launch: dependency audit, secrets scan, OWASP top-10 sweep.

---

## 5. Domain Model — Initial Draft

> Not a schema. These are the conceptual entities, their purpose, ownership, key relationships, and invariants. The schema is designed in a later phase.

### 5.1 `User` / Identity
- **Purpose:** Authentication subject.
- **Likely form:** A row in `auth.users` (Supabase-managed). Application data is held in a `profiles` table keyed by `auth.users.id`.
- **Ownership:** Self.
- **Relationships:** One-to-one with `profiles`. One-to-many to `products`.
- **Invariants:** A user has exactly one role: `partner` or `admin`. Role is set at provisioning and not user-changeable.

### 5.2 `Profile`
- **Purpose:** Display name, contact, bio, and other personal/brand data shown to Admins.
- **Ownership:** Self (Partner) or Admin-managed.
- **Relationships:** Belongs to one user.
- **Invariants:** Created on first authenticated session if it does not exist; cannot be deleted while the user exists (cascade).

### 5.3 `Product`
- **Purpose:** The central artifact. A Product is a draft or submitted bundle of story + maker + shop + media + status.
- **Ownership:** Exactly one Partner (the creator).
- **Relationships:** Belongs to one Partner. Has one story, one maker, one shop (one-to-one or one-to-one-with-NULL), many media records.
- **Invariants:**
  - Has a `lifecycle_state` ∈ {`draft`, `submitted`, `approved`, `rejected`, `changes_requested`}.
  - Only the owning Partner can edit while in `draft` or `changes_requested`.
  - `submitted`, `approved`, `rejected` are read-only for Partners.
  - State transitions are append-only history (see `ProductStateTransition`).
  - A Product cannot be deleted while it has any media references; deletion must cascade or null-out media carefully.

### 5.4 `ProductStory`
- **Purpose:** The narrative text of a Product.
- **Ownership:** The owning Partner (via Product).
- **Relationships:** Belongs to one Product (one-to-one).
- **Invariants:** Length-bounded; sanitized HTML or plain text per design choice.

### 5.5 `Maker`
- **Purpose:** The maker(s) who physically created the Product.
- **Ownership:** The owning Partner (via Product).
- **Relationships:** Belongs to one Product (one-to-one or one-to-many).
- **Invariants:** May be the same person as the Partner, or someone else. Needs decision on cardinality.

### 5.6 `Shop`
- **Purpose:** The place where the Product is sold / where the Partner operates.
- **Ownership:** The owning Partner (via Product or globally).
- **Relationships:** Could be a Product-level attribute or a Partner-level attribute reusable across Products. **Decision needed.**
- **Invariants:** Same — cardinality and reuse to be confirmed.

### 5.7 `MediaAsset`
- **Purpose:** Metadata for an uploaded original (photo or video).
- **Ownership:** The owning Partner (via Product).
- **Relationships:** Belongs to one Product (and optionally to a story/maker/shop).
- **Invariants:**
  - References exactly one Storage object by path.
  - Stores checksum (SHA-256) to detect duplicates and verify integrity.
  - Stores MIME, size, original filename, dimensions/duration.
  - Cannot be referenced by more than one Product (no reuse across Products).
  - **Originals are immutable.** Replacing a media asset is a new record, not an overwrite, until proven otherwise.

### 5.8 `ProductStateTransition` (audit log)
- **Purpose:** Immutable record of every state change with actor, timestamp, reason.
- **Ownership:** System (append-only).
- **Invariants:** No UPDATE / DELETE permitted (RLS denies writes).

### 5.9 `ReviewDecision` (or part of state transitions)
- **Purpose:** Record Admin review actions (approve/reject/request-changes) with notes.
- **Ownership:** Admin.
- **Invariants:** Immutable after write. Idempotent on retry.

### 5.10 `AuditLog` (optional separate from state transitions)
- **Purpose:** Record sensitive reads and writes (Admin viewing a Partner's media, etc.).
- **Invariants:** Append-only.

### 5.11 Relationships diagram (text)
```
User (auth.users)
 └── Profile
 └── Product (many)
       ├── ProductStory   (1:1)
       ├── Maker          (1:1 or 1:N — TBD)
       ├── Shop           (1:1 or 1:N — TBD)
       ├── MediaAsset     (1:N)
       └── ProductStateTransition (1:N, append-only)
```

---

## 6. Critical Business Rules

### 6.1 Partner data isolation (HARD RULE)
- A Partner **must never** be able to read or write another Partner's Products, drafts, stories, makers, shops, media, or profiles.
- Enforced by RLS on every table that contains Partner-owned data.
- Enforced by Storage policies: object paths are namespaced by Partner ID; a Partner's signed URL grants are scoped to their namespace.
- Enforced at the API surface: server routes check ownership even when the query has already been filtered by RLS (defense in depth).

### 6.2 Admin privileges
- Admins can **read** all Products, profiles, and media.
- Admins can **write** review decisions and manage Partner accounts.
- Admins **cannot impersonate** a Partner unless an explicit impersonation feature is added — and if added, it must be auditable and constrained.
- Admin actions are logged.

### 6.3 Product ownership
- A Product has exactly one owning Partner, set at creation and never changed.
- If a Partner account is deleted, ownership transfer is a separate, explicit operation — not silent.

### 6.4 Media ownership
- Every MediaAsset belongs to exactly one Product and through it, to exactly one Partner.
- Originals are stored under a Partner-namespaced prefix and cannot be moved or renamed by the Partner.

### 6.5 Draft persistence
- Drafts persist indefinitely until the Partner submits, deletes, or the account is removed.
- Autosave is non-destructive: partial saves must not corrupt the draft.

### 6.6 Submission rules
- A Product can be submitted only if all required fields are present (story / maker / shop / at least one media item — to be confirmed as the requirement list).
- Submission transitions `draft` → `submitted` atomically and emits an event/notification.
- A second submission of an already-submitted Product is a no-op (idempotent) and **must not** create duplicate records.
- Once submitted, the Product becomes read-only for the Partner.

### 6.7 Review rules
- Only Admins can transition `submitted` → `approved` / `rejected` / `changes_requested`.
- Review decisions are immutable. Correction requires a new decision with a reference to the prior one.
- A Product in `changes_requested` returns to the Partner's editable space with Admin notes visible.

### 6.8 Original media preservation
- Originals are stored bit-identical. The portal does not modify or transcode them.
- Checksums are computed on upload and verified on read.
- Deletion of a MediaAsset removes the Storage object in the same transaction or with a documented cleanup path (orphan handling needed).

### 6.9 Ambiguities flagged here
- Whether a Product requires all four sub-entities (story + maker + shop + media) to submit, or some subset.
- Whether the same Maker/Shop can be reused across Products of the same Partner.
- Whether Admin can edit a Product's content directly or only via the decision mechanism.
- Whether deletion of a draft cascades to its media or leaves orphans for an explicit cleanup.

---

## 7. Critical Workflows (System-Level)

> These describe the expected behavior at the system level. No implementation detail yet.

### 7.1 Registration
1. Partner submits email + password (or invited token).
2. Auth system creates the user.
3. A `profiles` row is provisioned with role=`partner` (RLS / trigger / server action — to be decided).
4. Email verification sent (if enabled).
5. Partner is redirected to onboarding.

### 7.2 Login
1. Partner / Admin submits credentials.
2. Auth validates and issues a session.
3. Server middleware resolves the role and routes accordingly.

### 7.3 Onboarding
1. Partner completes profile (display name, bio, contact, etc.).
2. Profile is saved; Partner can now create Products.

### 7.4 Product creation
1. Partner clicks "New Product".
2. Server creates a `Product` with `lifecycle_state='draft'` and an empty `ProductStory`.
3. Partner is redirected to the draft editor.

### 7.5 Draft save / resume
1. As the Partner edits, server autosaves on a debounced cadence (or on explicit save).
2. Each save is a partial update of one sub-entity (story, maker, shop).
3. Drafts are listed on a "My Drafts" page; opening one resumes editing.

### 7.6 Media upload
1. Partner selects files in the editor.
2. Client requests a signed upload URL or a server route that issues one.
3. Client uploads directly to Storage (no proxy through Vercel).
4. On successful upload, client (or server) inserts a `MediaAsset` row referencing the object.
5. The `MediaAsset` is associated with the Product. The association is **not** considered durable until the DB row exists; upload-only-without-metadata must be detected and cleaned up.

### 7.7 Product submission
1. Partner clicks "Submit for review".
2. Server validates completeness.
3. Server begins a transaction: lock the Product, verify state == `draft` or `changes_requested`, set state = `submitted`, append a state transition.
4. Server returns success.
5. (Optional) Notify Admin / downstream.

### 7.8 Admin review
1. Admin opens a submitted Product from the catalog.
2. Admin reads story, maker, shop, media; downloads originals if needed.
3. Admin records a decision: approve / reject / request changes, with notes.
4. Decision is recorded in `ReviewDecision` and `ProductStateTransition`.

### 7.9 Approval / rejection / change-request flow
- **Approve:** state → `approved`. Portal-side work done; downstream pipeline may be notified.
- **Reject:** state → `rejected`. Terminal. Partner is notified.
- **Request changes:** state → `changes_requested`. Product returns to Partner's editable list with Admin notes visible.

### 7.10 Admin search & filter
1. Admin opens catalog with filters (state, partner, date, has-media, etc.).
2. Server runs a query within RLS-bypassing-Admin policies.
3. Results paginate; deep-link preserves filters in the URL.

---

## 8. Risks and Failure Modes

For each, the risk is described without prematurely designing the solution.

### 8.1 Authentication succeeds but profile creation fails
- **Risk:** A user exists in `auth.users` but no `profiles` row. App crashes or renders a half-state. Subsequent RLS checks may behave inconsistently because role is unknown.
- **Why it matters:** First-impression failure; debugging is hard because the user is "logged in but broken."

### 8.2 Database unavailable
- **Risk:** Reads return 5xx; writes fail mid-flight. Drafts may be in inconsistent states if a transaction is half-committed.
- **Why it matters:** Partners lose work; trust erodes.

### 8.3 Storage unavailable
- **Risk:** Uploads fail; metadata writes may succeed with broken references; reads of media return 5xx.
- **Why it matters:** Draft save that depends on Storage becomes unreliable.

### 8.4 Upload succeeds but metadata insertion fails
- **Risk:** Storage object exists with no DB row. Result: orphan storage, unreferenced object, billed but invisible.
- **Why it matters:** Storage cost drift; confusing debug.

### 8.5 Database succeeds but response is lost
- **Risk:** Partner retries a write (e.g. submit) and either duplicates or produces inconsistent state.
- **Why it matters:** Submission is a state transition; duplicates or wrong states break review.

### 8.6 Duplicate submission
- **Risk:** Two "submit" requests race and both succeed, producing duplicate notifications, duplicate state transitions, or inconsistent final state.

### 8.7 Duplicate upload
- **Risk:** Same file uploaded twice by accident → wasted storage, confusing media list.
- **Why it matters:** Need deduplication strategy (checksum-based or user-facing).

### 8.8 Session expiration mid-edit
- **Risk:** Partner loses a long edit if their session expires mid-save.
- **Why it matters:** Silent data loss.

### 8.9 Concurrent edits
- **Risk:** Partner opens the same draft in two tabs; last write wins; partial overwrite.
- **Why it matters:** Surprising data loss for the user.

### 8.10 Unauthorized resource access
- **Risk:** A Partner guesses another Partner's Product UUID and tries `GET /products/<id>`. Without RLS + server-side checks, they read another Partner's data.

### 8.11 Malicious ID manipulation
- **Risk:** Client tampers with body, query string, or signed-URL parameters to access another tenant's data or escalate role.

### 8.12 Environment misconfiguration
- **Risk:** Wrong Supabase project URL, anon key, or service-role key committed. Service-role key in the client = full DB read/write for any user.
- **Why it matters:** Catastrophic and silent until exploited.

### 8.13 Deployment configuration mismatch
- **Risk:** Migration applied to staging but not prod; or new env var added but not set in prod; or RLS policy added in code but not applied to the DB.
- **Why it matters:** "Works in staging, breaks in prod" or "shipping RLS in code that the DB doesn't enforce."

### 8.14 Other risks worth listing
- **Storage bucket misconfigured public** → media leak.
- **RLS left disabled** on a table during development → silent leak.
- **Service role key used in a Server Component accidentally** → privilege escalation if component is rendered into a client tree.
- **Migrations not idempotent** → partial state on re-run.
- **Signed URL leak** → time-limited but real exposure window.

---

## 9. Architectural Concerns (Decisions Required Before Implementation)

### 9.1 Server/client boundaries
- Where does logic live? Next.js Server Components and Server Actions for any operation that touches the DB, Storage, or auth state. Client Components only for interactivity.
- Are we using Route Handlers (`app/api/...`) or Server Actions? **Recommendation:** Server Actions for mutations; Server Components for reads. Route Handlers only for things like webhooks, signed-URL generation, and health checks.

### 9.2 RLS design
- One policy per operation, per role. No blanket `TO authenticated` policies.
- Role is read from `profiles.role`, not from a JWT custom claim (or, if we use claims, they must be kept in sync).
- **Default deny** on every table; explicitly grant `select/insert/update/delete`.
- Storage policies mirror DB policies.

### 9.3 Storage policy design
- Path convention: `{partner_id}/{product_id}/{asset_id}.{ext}` — namespaced by Partner ID for isolation.
- Buckets: one bucket per media type (photos, videos), or one bucket with prefixes? **Recommendation:** one bucket with strict prefixes to keep policies simpler.
- Signed URLs for download (time-limited, audit-logged for Admin downloads).
- Direct upload via signed upload URL; metadata insert is a separate, transactional step.

### 9.4 Transaction boundaries
- Use Postgres transactions for any write that spans multiple tables: create-draft-with-story, submit-with-state-transition, delete-product-with-media-cleanup.
- RLS still applies inside transactions — do not use service-role to bypass unless absolutely necessary.

### 9.5 Idempotency
- Submission, review decisions, and media metadata writes must be idempotent under retry.
- Pattern: client supplies an idempotency key (UUID) on critical mutations; server dedupes via a unique constraint or an idempotency table.

### 9.6 Concurrency strategy
- Use Postgres row-level locks (`SELECT ... FOR UPDATE`) on the Product row during state transitions.
- Optimistic concurrency for draft edits: a `version` or `updated_at` column; client sends it; server rejects if stale. **Decision needed.**

### 9.7 Error model
- A single, typed application error type with stable codes.
- Server returns machine-readable codes; UI maps them to user-friendly copy.
- Never leak DB error text to the client.

### 9.8 Audit logging
- DB trigger or server-side insert on review decisions, Admin reads of sensitive data, and Partner deletions.
- Audit table is append-only (RLS denies writes outside the system path).

### 9.9 Observability
- Structured logger in server code (request ID, user ID, role).
- Integration with Supabase logs + Vercel logs.
- Error tracking service (TBD) capturing server errors and key client errors.

### 9.10 Migrations
- Directory: `supabase/migrations`.
- Numbered, forward-only.
- CI step: `supabase db lint` + dry-run.
- Production migrations applied via a controlled pipeline (manual approval + staging-first).

### 9.11 Deployment strategy
- Vercel: preview per PR, production from `main`.
- Supabase: dev / staging / prod projects, separated by env vars.
- Smoke test post-deploy hitting a known-protected endpoint to confirm RLS is active.

### 9.12 Testing strategy
- Unit (Vitest) for pure logic.
- Integration (Vitest + Supabase local or test project) for DB and RLS.
- E2E (Playwright) for the critical journeys.
- A "security" test suite that runs RLS negative tests on every table.

### 9.13 CI/CD
- Lint, type-check, unit, integration on PR.
- Migration lint + DB lint on PR.
- E2E on PR (against an ephemeral Supabase or a shared test project).
- Production deploy requires green checks and a manual approval.

### 9.14 Dependency / supply-chain hygiene
- Lockfile committed; `npm ci` in CI.
- Dependabot / Renovate enabled.
- `npm audit` in CI; failing threshold for high/critical.

---

## 10. Unknowns and Questions Requiring Product / Architecture Decisions

These are decisions that materially change the system. Please confirm or correct each one.

### A. Roles & provisioning
1. **Admin provisioning.** How does someone become an Admin? Manual via SQL/Supabase dashboard, an invite-only flow, or a separate Admin sign-up path?
2. **Super Admin / Owner role.** Is there a tier above Admin for promoting Admins, handling data-export / deletion requests, and recovery? If yes, how is it bootstrapped?
3. **Email verification.** Required at sign-up, before first submission, or never?
4. **MFA.** Required for Admins? Available for Partners?

### B. Partner profile & lifecycle
5. **Profile fields.** What is the canonical schema for a Partner profile (display name, bio, contact, location, social handles, languages)?
6. **Partner self-delete.** Can a Partner delete their own account? What happens to their Products and media (legal hold, anonymization, hard delete)?
7. **Partner suspension.** Can an Admin suspend a Partner, and how does suspension affect their in-flight drafts and submissions?

### C. Product shape
8. **Required fields for submission.** Is a Product submittable when story + maker + shop + at least one media item are present, or some other rule?
9. **Maker cardinality.** One maker per Product, or multiple? Is the Maker always the Partner, or can it be someone else?
10. **Shop cardinality.** One shop per Product, or one shop per Partner reused across Products?
11. **Maker/Shop reuse.** If a Partner has multiple Products, can they reuse the same Maker/Shop records?
12. **Story fields.** Plain text, rich text, or markdown? Length limits? Multi-language?

### D. Media
13. **Photo/video limits.** Max file size, max count per Product, supported formats.
14. **Quotas.** Per-Partner storage quota?
15. **Replacement.** Can a Partner replace an uploaded original? If yes, is the prior version retained?
16. **EXIF / metadata.** Preserve, strip, or surface?
17. **Malware scanning.** Required at upload time, or deferred?
18. **Dedup.** Detect duplicate uploads by checksum and dedupe, or allow duplicates?

### E. Submission / review
19. **Submission preconditions.** What makes a Product "complete enough" to submit?
20. **Review notes visibility.** Are Admin notes visible to the Partner on rejection / changes-requested?
21. **Re-submission limits.** Unlimited re-submissions after changes-requested, or capped?
22. **Decision reversibility.** Can an Admin reverse their own or another's decision?
23. **Direct edit by Admin.** Can Admins edit Product content directly, or only via the review decision mechanism?

### F. Search & catalog
24. **Search scope.** Full-text on story only, or also on maker / shop / profile? Filter combinations?
25. **Partner search.** Can Partners search across their own Products only?
26. **Pagination.** Cursor-based preferred; page size limits?

### G. Downstream / integrations
27. **Downstream pipeline.** Is there an external system that consumes approved Products? Does the portal push (webhook) or does the system pull?
28. **Email / notifications.** Which events trigger email: verification, password reset, submission received, decision made?

### H. Compliance & legal
29. **Data residency.** Single region, multi-region?
30. **Retention.** How long are rejected Products and their media retained?
31. **GDPR / data export.** Is there a data-export endpoint for "right of access"? Is there a data-deletion endpoint?
32. **PII in media.** Are uploaded videos/photos considered PII? What consent is captured at upload?

### I. Operational
33. **Error tracking.** Confirm Sentry (or equivalent) is acceptable.
34. **Log retention.** How long are server logs retained?
35. **Status page / incident comms.** Is there a public status page requirement?

### J. Brand & UI
36. **Brand assets.** Logo, color tokens, typography — please share.
37. **Localization.** Single language (English) at launch, or multi-language?

---

## 11. Recommended Development Strategy

### Guiding principle
**Understand → Identify → Design → Review → Then Build.**
The next phase is **Review**: review this document, resolve unknowns in §10, then proceed to design. We do not scaffold the app, install packages, or write the first line of code until §10 is closed.

### Phase 0 — Decision & Spec Lock (current → next milestone)
- Resolve all blocking unknowns in §10.
- Ingest any attached specification document.
- Produce a final Project Understanding Document (this file, revised).
- Lock the technology stack (already proposed: Next.js + TS + Tailwind + Supabase + Vercel).

### Phase 1 — Foundations (no UI yet)
- Create a non-runtime project skeleton (folders, lint/format, CI, env handling) — but **no app pages yet**.
- Provision Supabase dev / staging / prod projects.
- Author the migration plan: empty database, roles, RLS scaffolding, policies (initially permissive for development).
- Define typed Supabase clients (browser, server, service-role) with strict separation.
- Set up error tracking and logging.

### Phase 2 — Auth & Identity
- Implement sign-up, login, logout, password reset.
- Implement role resolution and middleware.
- Implement profile provisioning on first authenticated session.
- Write RLS tests for `profiles`.

### Phase 3 — Product Domain
- Author migrations: `products`, `product_stories`, `makers`, `shops`, `media_assets`, `product_state_transitions`, `review_decisions`.
- Enforce the state machine in DB (CHECK + trigger).
- Write RLS tests for every table.
- Implement server actions: create draft, update story/maker/shop, save (autosave + manual).

### Phase 4 — Media
- Storage bucket creation and policies (path-namespaced by partner_id).
- Signed-URL generation for upload and download.
- Media metadata writes inside the same transaction as object existence check.
- Orphan-cleanup job or strategy.

### Phase 5 — Submission & Review
- Server action: submit (with preconditions, transaction, idempotency).
- Admin views: catalog, search, filter, detail.
- Server action: review decision (approve / reject / request-changes) with notes.
- Notifications (if in scope).

### Phase 6 — Admin Operations
- Partner management views and actions.
- Audit log view for Admins.

### Phase 7 — UX Polish
- Empty states, error states, loading states.
- Accessibility pass (keyboard, screen reader, contrast).
- Responsive pass.

### Phase 8 — Hardening
- Rate limiting.
- Dependency audit.
- Security review (RLS negative tests, OWASP top-10 sweep, secret scan).
- Performance pass (Lighthouse, query plans, image/video handling).

### Phase 9 — Production Cutover
- Migration dry-run on staging → staging smoke → production migration → production smoke → announcement.
- On-call and rollback plan.

### Phase ordering rationale
- Phases 0–2 deliver an authenticatable shell with a hardened identity boundary — the foundation that everything else depends on.
- Phase 3 is the domain core; we never touch UI for Products until the DB and RLS are tested.
- Phase 4 (media) is its own risk surface and is built and tested before submission so that the submission flow has real media to operate on.
- Phase 5 is the most consequential workflow (state transitions); it gets its own phase with security review baked in.
- Phases 6–9 are downstream of the secure core.

---

## 12. My Understanding of the System (Plain Summary)

PandaVerse Gharana Partner Portal is a **two-role, authenticated web application** that lets external **Partners** (creators / makers / shop owners) build rich product submissions — composed of a story, maker information, shop information, and original photos/videos — and submit them for review by internal **Admins**. The portal's central purpose is to be a **secure, role-isolated, auditable intake and review system**, not a public catalog or a generic CRUD app.

The system's center of gravity is **isolation**: every Partner lives in their own namespace in the database and in Storage, enforced by Row Level Security and Storage policies, and reinforced at the application server. Around that, the system's other hard requirements are **durable drafts** (Partners can leave and come back), **immutable originals** (we never modify uploaded media), and **a one-way submission state machine** with idempotent, audited transitions.

I would not write a line of code, install a package, or open a database until the unknowns in §10 are resolved — especially Admin provisioning, the submission preconditions, the Maker/Shop cardinality decisions, and the media replacement policy. Once those are settled, the build order should be foundations → auth → product domain → media → submission/review → admin operations → polish → hardening → cutover.

---

## 13. Major Architectural Risks (Top 5)

1. **RLS and Storage policy drift.** A table or bucket shipped without policies, or with permissive policies in production, is the single most catastrophic failure mode. Mitigation: default-deny policies everywhere; CI must verify policies exist; a dedicated RLS test suite must run in CI.
2. **Service-role key exposure or misuse.** A leaked or mis-scoped service-role key silently grants full DB and Storage access. Mitigation: server-only service-role usage; lint rule banning `process.env.SUPABASE_SERVICE_ROLE_KEY` from any file under `app/` client components; runtime check on cold start.
3. **Originals are not actually preserved.** If we ever modify, transcode, or strip originals, we lose the brand's pipeline trust. Mitigation: originals bucket is write-once per asset id; deletes only via an explicit, audited operation; checksum recorded at upload.
4. **Submission is not idempotent.** Duplicate submissions, double state transitions, or "submitted twice" produce downstream chaos. Mitigation: row-level lock + state precondition check inside a transaction + idempotency key.
5. **Migration / environment mismatch.** "Works in staging, broken in prod" because migrations weren't applied or RLS differs between projects. Mitigation: staging-first migration pipeline; post-deploy smoke that exercises an RLS-protected query from a Partner session.

---

## 14. Decisions We Must Make Before Coding

(See §10 for the full list; the minimum set blocking design is below.)

1. **Admin provisioning path** (decision A1) — affects DB triggers, migrations, and the very first user creation.
2. **Maker cardinality** (D9) — affects table design (one-to-one vs. one-to-many).
3. **Shop cardinality and reuse** (D10, D11) — affects whether Shop is a Product-level or Partner-level entity.
4. **Submission preconditions** (E19) — affects server validation logic.
5. **Media replacement policy** (D15) — affects whether MediaAsset is append-only or updateable.
6. **Downstream integration boundary** (G27) — affects whether we ship a webhook now or defer.
7. **Email / notifications scope** (G28) — affects whether we add an email provider now.
8. **Storage path convention confirmation** (already recommended: `{partner_id}/{product_id}/{asset_id}.{ext}`).
9. **Idempotency key convention** for state transitions.
10. **Error tracking vendor** (Sentry or equivalent) — affects env wiring.

---

## 15. Proposed Project Documentation Structure

```
/docs
  /00-overview
    project-charter.md
    glossary.md
    project-understanding-document.md      ← this file
  /01-architecture
    system-architecture.md
    server-client-boundary.md
    rls-policy-design.md
    storage-policy-design.md
    state-machine.md
    error-model.md
    idempotency.md
    concurrency.md
  /02-data-model
    domain-model.md
    schema-reference.md                     ← generated from migrations
    migrations-playbook.md
  /03-security
    threat-model.md
    rls-test-matrix.md
    storage-test-matrix.md
    secrets-and-env.md
    audit-log.md
  /04-api
    server-actions-reference.md
    route-handlers-reference.md
    supabase-clients.md
  /05-frontend
    routing.md
    components.md
    forms-and-state.md
    a11y-checklist.md
  /06-operations
    environments.md
    ci-cd.md
    observability.md
    incident-response.md
    rollback-plan.md
  /07-testing
    test-strategy.md
    rls-test-suite.md
    e2e-journeys.md
  /08-process
    branching-strategy.md
    code-review-checklist.md
    release-checklist.md
```

---

## 16. Status & Next Step

This document is **ready for your review**. It contains no application code, no schema, no scaffolding, and no package installs, per the kickoff instructions.

**Next actions, in order:**
1. You review this document and answer the open items in §10 (especially §A, §C, §D, §E, §G).
2. If a fuller specification document exists, share it; we will reconcile this draft against it.
3. On your go-ahead, we move to the **Design** phase: state machine, RLS policy matrix, storage policy matrix, schema draft, API surface draft, and the foundations of the engineering plan.
4. The **Build** phase begins only after the design has been reviewed.

I am waiting for your review.