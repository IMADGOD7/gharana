# PandaVerse Gharana Partner Portal
## Final Architecture v1.0

**Status:** Final — Architecture Hardening & Adversarial Review Complete
**Phase:** Design (final, pre-implementation)
**Prepared by:** Lead Software Architect / Senior Engineering Manager

**No application code, no database schema SQL, no package installation, and no Next.js scaffolding have been created.**

**Classification rule (unchanged from prior documents):**
- **EXPLICIT REQUIREMENT** — directly stated in the project specification
- **INFERENCE** — logically inferred from requirements
- **ARCHITECTURE DECISION** — a design choice we are proposing
- **ASSUMPTION** — temporarily assumed because information is missing
- **DEFERRED** — intentionally not implemented in the current version
- **OPEN QUESTION** — requires product/architecture approval

---

# PART 1 — AUTHORIZATION & ROLE ARCHITECTURE

## 1.1 Identity Source

The authenticated identity originates from **Supabase Auth**. When a user logs in, Supabase Auth validates credentials and issues a session. The session contains a JWT with the user's `sub` claim, which is the `auth.users.id` UUID. This JWT is transmitted as an httpOnly cookie on every request.

The application **never** creates or manages users directly. User creation happens exclusively through Supabase Auth (`auth.admin.createUser()` from server-side code, or the Supabase sign-up API from client-side registration).

## 1.2 Role Determination

The user's role is stored in the **application database** (`profiles.role`), not in the JWT. On every request:

1. Supabase Auth validates the session cookie and sets `auth.uid()` to the user's UUID.
2. The application (middleware or Server Component) queries `profiles.role` for that UUID.
3. The role is used for authorization decisions.

**Why not JWT claims?** Storing the role in the database rather than the JWT means that changing a user's role requires only a database UPDATE — it does not require re-issuing tokens, waiting for token expiry, or invalidating active sessions. This is a correctness and operational advantage, not primarily a security one.

## 1.3 How Role Is Trusted

The role is trusted because:

- **RLS policies read from the database.** `profiles.role` is a column in a table protected by RLS. A user cannot modify their own role because the UPDATE policy on `profiles` only allows the user to update their own non-role fields (or no fields at all — see below).
- **The application reads role from the DB on every request.** It does not cache the role in client-side state, JWT claims, or cookies. Every Server Action and Server Component resolves the role fresh from the database.
- **Role changes are atomic with audit logging.** When an Admin changes a user's role, it happens in a transaction that also writes to `audit_logs`.

## 1.4 Correction of Prior Claim

The prior architecture document stated: *"Role is read from `profiles.role`, not from a JWT custom claim (or, if we use claims, they must be kept in sync)."* and implied this **eliminates** JWT-forging attacks.

This was an **overstatement.** The correct analysis is:

- **JWT custom claims are not used for authorization.** This eliminates the risk of a user forging a JWT with elevated claims, because we don't read claims for authorization. This is a genuine security improvement.
- **However, `profiles.role` is not inherently more secure than JWT claims.** A user who can modify `profiles.role` can escalate privileges regardless of where the role is stored. The security comes from the **access control on the `profiles` table**, not from the storage location of the role.
- **RLS is the actual security boundary.** The role is trusted because RLS prevents unauthorized writes to `profiles.role`, not because it lives in the database rather than the JWT.

The corrected principle: **The role is trusted because the table that contains it is protected by RLS with default-deny policies.**

## 1.5 Partner/Admin Authorization Enforcement

### Application Layer
- Every Server Action begins with: `const profile = await getProfile()`. If `profile` is null or `profile.role` is unexpected, the action returns an authorization error.
- Every Server Component that renders role-protected data resolves the role server-side and conditionally renders.
- **Client Components never make authorization decisions.** They call Server Actions, which enforce authorization server-side.

### RLS Layer
- **`profiles` table:**
  - `SELECT`: Users can SELECT their own row (`user_id = auth.uid()`). Admins can SELECT all rows.
  - `UPDATE`: Users can UPDATE their own row but **NOT the `role` column**. Admins can UPDATE any row including `role`.
  - This is enforced by a policy that explicitly excludes the `role` column from the user's UPDATE grant, or by a trigger that prevents non-Admin role changes.
- **`products` and sub-entities:**
  - `SELECT`: Partners see only their own (`partner_id = auth.uid()`). Admins see all.
  - `INSERT`: Partners can INSERT with `partner_id = auth.uid()`. The `partner_id` is set by the application server, never from client input.
  - `UPDATE`: Partners can UPDATE their own rows only when `lifecycle_state` is in an editable state. Admins can UPDATE for review decisions.
  - `DELETE`: Partners can DELETE their own drafts. Admins cannot DELETE Products (only transition state).
- **`product_state_transitions`, `review_decisions`, `audit_logs`:**
  - No client-side writes. RLS denies all INSERT/UPDATE/DELETE from authenticated roles. Writes happen only through a server-side function or service-role path that is not exposed to clients.

### Role Change Handling
When an Admin changes a user's role:
1. The Admin triggers a Server Action that:
   - Verifies the Admin has permission (only Super Admin can change roles, or any Admin — TBD by product decision).
   - Updates `profiles.role`.
   - Inserts an `audit_logs` entry.
   - (Optional) Invalidates the user's active sessions via Supabase Auth admin API.
2. The change takes effect on the user's next request (role is resolved from DB each time).

## 1.6 Who Can Create or Modify Administrative Roles

**ASSUMPTION for v1:** Role changes are performed only by database operators via the Supabase dashboard or direct SQL. There is no self-service role management UI in v1.

**If a self-service mechanism is added later:** It must be restricted to a Super Admin role. The Super Admin is bootstrapped during initial project setup (manual SQL). This is an **OPEN QUESTION** (Q02).

## 1.7 Service-Role Credential Isolation

The Supabase service-role key has **full, unrestricted access** to the database and Storage. It bypasses RLS entirely.

**Isolation rules:**
1. The service-role key exists **only** as a server-side environment variable (`SUPABASE_SERVICE_ROLE_KEY`).
2. It is **never** imported into any file that could be bundled for the browser.
3. It is **never** used in Server Components, Server Actions, or Route Handlers that process user input — **except** for system operations that must bypass RLS (e.g., inserting into `audit_logs`, `product_state_transitions`). These operations are isolated in a dedicated server module with strict access control.
4. A build-time check fails if `SUPABASE_SERVICE_ROLE_KEY` is referenced in any file under the `app/` directory.
5. A runtime check on cold start verifies that the service-role client is only instantiated in server-only modules.

**Service-role usage pattern:**

```typescript
// ✅ CORRECT: server-only module, never imported by client code
// src/lib/server/db-admin.ts
import { createClient } from '@supabase/supabase-js';
const adminDb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ✅ CORRECT: used in a Server Action for system-only writes
export async function recordStateTransition(...) {
  const supabase = await getServerSupabase(); // anon client for RLS context
  // ... validation with anon client ...
  const admin = getAdminSupabase(); // service-role client
  await admin.from('product_state_transitions').insert(...);
}

// ❌ WRONG: service-role client in a Client Component
'use client';
import { adminDb } from '@/lib/server/db-admin'; // This would be bundled!
```

## 1.8 Client-Side vs Server/DB Authorization

| Layer | Role Information | Trust Level | Purpose |
|-------|-----------------|-------------|---------|
| **Client (React state)** | Derived from server-rendered props or a lightweight auth context | **UX only — never trusted for security** | Show/hide UI elements (e.g., "Submit" button) |
| **Server (Server Actions, Server Components)** | Resolved from `profiles.role` on every request | **Authoritative for UX** | Conditional rendering, routing |
| **Database (RLS)** | Reads `auth.uid()` and joins to `profiles.role` via policy logic | **Authoritative for data access** | Row-level filtering, write permission |

**Critical rule:** Client-side role information (React context, localStorage, URL params) is never used for authorization. It is a UX convenience only. The server and database are the only trusted authorization layers.

## 1.9 Potential Failure Modes

| Failure Mode | Risk | Mitigation |
|-------------|------|-----------|
| RLS recursion (policy queries a table that triggers the same policy) | Infinite loop, DB crash | Policy queries use `auth.uid()` directly; no policy joins to a table that has RLS on the same query path |
| Stale role in application cache | User retains old role after change | Role is resolved from DB on every request; no caching of role |
| Service-role key in client bundle | Full DB access from browser | Build-time check, runtime check, lint rule, code review |
| Role column not protected by RLS on UPDATE | User changes own role to `admin` | RLS policy explicitly restricts UPDATE to non-role columns; application also rejects role changes from non-Admin |
| Trigger recursion (trigger on `profiles` that queries `profiles`) | Infinite loop | Triggers use `NEW`/`OLD` records directly; no SELECT from `profiles` inside a `profiles` trigger |

## 1.10 Recommended Secure Design Summary

```
Identity:  Supabase Auth (auth.users) — not managed by application
Role:      profiles.role — stored in DB, resolved on every request
Trust:     RLS protects the profiles table; application reads role from DB
Admin:     Service-role key used ONLY in isolated server modules for system writes
Client:    Never has service-role access; anon key only; RLS applies
```

---

# PART 2 — STORAGE ARCHITECTURE

## 2.1 Bucket Strategy

**Decision: One bucket named `originals`.**

Rationale: The system stores one type of object (original media files). A single bucket with path prefixes is simpler to manage than multiple buckets. The `media_type` column in `media_assets` distinguishes photos from videos.

**Bucket configuration:**

| Setting | Value | Reason |
|---------|-------|--------|
| Public access | **Disabled** | No object should be publicly accessible. All access goes through authenticated policies or signed URLs. |
| File size limit | **Per-upload limit enforced at application level** (see §2.5) | Storage-level limit as a safety net |
| Allowed MIME types | **All** (enforced at application level) | Storage doesn't need to restrict; application validates before upload |
| Versioning | **Disabled** | We don't need version history; originals are immutable by design |
| Object retention / lock | **Disabled** | Objects must be deletable for cleanup |
| CDN | **Optional** | Vercel's edge network handles static assets. Storage CDN can be enabled for faster Admin downloads if needed. |

## 2.2 Object Path Convention

**Format:** `{partner_id}/{product_id}/{asset_id}.{ext}`

**Example:** `a1b2c3d4-e5f6-7890-abcd-ef1234567890/p5f6g7h8-i9j0-1234-abcd-ef5678901234/m9i0j1k2-l3m4-5678-abcd-ef9012345678.jpg`

**Rules:**
- `partner_id` is the UUID of the owning Partner (from `auth.users.id`).
- `product_id` is the UUID of the Product.
- `asset_id` is the UUID of the `media_assets` row.
- `ext` is the original file extension (lowercase).
- Paths are **never** generated from client input. The server constructs the full path from authenticated user context and database IDs.

## 2.3 Ownership Model

Ownership is determined by the `partner_id` prefix in the object path. This is the **sole** mechanism for Storage-level access control. The `media_assets` table provides the metadata mapping, but the Storage policy enforces isolation independently.

**Ownership chain:**
1. Storage object path starts with `{partner_id}/` — Storage policy enforces access.
2. `media_assets.partner_id` matches the `partner_id` in the path — DB enforces consistency.
3. `media_assets.product_id` → `products.partner_id` — DB enforces Product ownership.

All three must agree. If any link is broken, the object is inaccessible.

## 2.4 Upload Authorization

| Step | Who | Authorization Check |
|------|-----|-------------------|
| Request signed upload URL | Authenticated Partner | Server Action: user is authenticated, owns the Product, Product is in `draft` or `changes_requested` state |
| Upload to Storage | Partner's browser | Signed URL is scoped to `partner_id/{product_id}/*` with a short expiry (5 minutes). The path prefix in the signed URL matches the Partner's own ID. |
| Metadata insert | Server Action | Validates Storage object exists, computes checksum, inserts `media_assets` row with `partner_id = auth.uid()` |

**Signed URL generation:**
- The server generates a signed upload URL using the Supabase Storage API.
- The URL is scoped to: `PUT` method, path `{partner_id}/{product_id}/{asset_id}.{ext}`, expiry 5 minutes.
- The `asset_id` UUID is generated server-side before the signed URL is issued (so the path is known at signing time).
- The client receives the URL and uploads directly. The client does not choose the path.

## 2.5 Read Authorization

| Reader | Condition | Mechanism |
|--------|-----------|-----------|
| Partner (own media) | `media_assets.partner_id = auth.uid()` | Storage policy: path starts with `auth.uid()::text` |
| Admin (any media) | Role = `admin` | Storage policy: `auth.jwt() ->> 'role' = 'admin'` OR separate policy using the `profiles` join |
| Unauthenticated | None | Denied |

**Note on Admin Storage access:** Storage policies can reference the authenticated user's role by checking `auth.uid()` against the `profiles` table. However, Supabase Storage policies have limited SQL表达能力. The recommended approach:

- Admins download media through a **Server Action / Route Handler** that uses the service-role client to generate a time-limited signed download URL.
- The application checks the Admin's role server-side before generating the URL.
- This keeps the Storage policy simple (Partner access only by path prefix) and moves Admin access to the application layer where it can be audited.

**Revised approach:**
- Storage policy for `SELECT` (download): Allow if path prefix matches `auth.uid()` (Partners) OR if the request comes from the service-role client (server-side Admin downloads via Route Handler).
- Storage policy for `INSERT` (upload): Allow if path prefix matches `auth.uid()`.
- Storage policy for `DELETE`: Same as SELECT.

Actually, the cleanest approach is:
- Storage policies allow Partners to access their own paths.
- Admin access to Storage is **always** through a server-side Route Handler that uses the service-role client. The Storage bucket policy does not grant Admins direct access. Instead, the Route Handler generates a signed URL on behalf of the Admin.
- This means: **Storage policies only know about Partners. Admin access is mediated entirely by the application.**

## 2.6 File Validation

| Check | Where | How |
|-------|-------|-----|
| MIME type (allowlist) | Server (before issuing signed URL) | Check `file.type` against allowlist: `image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/quicktime` |
| File extension | Server (before issuing signed URL) | Secondary check: extension must match MIME type |
| File size | Server (before issuing signed URL) | Max 50MB per file. Enforced before signed URL is issued (client never gets a URL for oversized files). |
| Magic bytes | Server (after upload) | Read the first 16 bytes from Storage and verify against expected magic bytes for the claimed MIME type. Reject and flag for cleanup if mismatch. |
| Dimensions / duration | Server (after upload) | Read from Storage object metadata or re-upload stream. Validate: images ≥ 100×100px, ≤ 10000×10000px; videos ≤ 30 minutes duration. |
| Malware scan | **DEFERRED** | Not in v1. Flag for v2. |

## 2.7 Checksum Strategy

- **Algorithm:** SHA-256.
- **When computed:** Client computes checksum before upload (using the Web Crypto API). Client sends checksum to the server as part of the signed-URL request. Server **re-verifies** the checksum after upload by reading the object from Storage and computing SHA-256 independently.
- **Why double-check:** Client-supplied checksums can be wrong (browser bugs, tampering). Server-side verification is the authoritative check.
- **Stored in:** `media_assets.checksum_sha256`.
- **Used for:** Dedup detection, integrity verification, and orphan cleanup (checksum helps identify orphaned objects).

## 2.8 Partial Failure Handling — Critical Analysis

This is the hardest problem in the media architecture. There are two asymmetric failure scenarios:

### Scenario A: Storage upload succeeds, database metadata creation fails

**What happens:**
1. Client uploads file to Storage → 200 OK.
2. Client calls Server Action to create `media_assets` row.
3. Server Action fails (DB error, validation error, server crash).
4. Storage object exists. No DB row. Orphaned file.

**Why this is the dangerous direction:** The Storage object is "real" (it exists and costs money). The DB row is "missing" (invisible, unusable). The Partner sees an upload failure and may retry, creating a second object.

**Mitigation (three-layer):**

1. **Application level:** The Server Action that inserts the metadata row **must** be a single, atomic operation that includes:
   - Verify the Storage object exists (HEAD request).
   - Re-compute the checksum from the Storage object.
   - Insert the `media_assets` row with all required fields.
   - If ANY step fails, the entire operation fails and the Partner is told to retry.

2. **Dedup at retry:** If the Partner retries the upload, the server detects the existing Storage object (same path) and creates the DB row. The second upload does not create a second object (same path = overwrite, but the checksum matches, so we treat it as a success).

3. **Cleanup job:** A daily job scans the `originals` bucket for objects without a matching `media_assets` row and deletes objects older than 24 hours. This is the safety net.

**Guarantee:** After the cleanup job runs, there are no orphaned Storage objects. The window of inconsistency is ≤24 hours.

### Scenario B: Database metadata exists, Storage upload fails

**What happens:**
1. Client calls Server Action to request a signed URL.
2. Server Action creates the `media_assets` row optimistically (or after verifying preconditions).
3. Client attempts upload to Storage → fails.
4. DB row exists. No Storage object. "Phantom" media record.

**Why this is the less-dangerous direction:** The DB row is invisible to the Partner (the media doesn't display because the object doesn't exist). The row is also invisible to Admins (no object to download). The inconsistency is self-evident and self-healing: the DB row points to a non-existent path.

**Mitigation:**

1. **Do NOT create the DB row before the upload.** The metadata insert happens **after** the upload succeeds. This is the two-phase pattern. The DB row is only created once the Storage object is confirmed to exist.

2. **If a DB row exists without a Storage object:** The cleanup job also handles this case: it queries `media_assets` rows where the referenced Storage object does not exist and deletes those rows. This handles the case where the optimistic insert pattern was used (should not happen, but as a safety net).

**Revised upload flow (corrected from prior document):**

```
Phase 1: Pre-authorization (Server Action)
  - Partner requests upload for a Product
  - Server verifies: Partner owns Product, Product is in editable state
  - Server generates: asset_id (UUID), storage_path, signed upload URL
  - Server returns: signed URL + asset_id + expected checksum

Phase 2: Upload (Client → Storage)
  - Client uploads file directly to Storage using signed URL
  - Client computes SHA-256 checksum
  - Client sends: asset_id + checksum to Server Action

Phase 3: Verification & Metadata (Server Action)
  - Server verifies: Storage object exists at the expected path
  - Server re-computes SHA-256 from Storage object (authoritative)
  - Server checks: no existing media_assets row with same (product_id, checksum)
  - Server inserts: media_assets row with all metadata
  - All within a transaction (if any step fails, nothing is committed)
```

**Key correction from prior document:** The prior document suggested the client could insert the metadata row. The corrected design: **the server always performs the metadata insert**, re-verifying the checksum from Storage. The client only reports the checksum it computed; the server does not trust it.

## 2.9 Orphaned Object Strategy

**Two cleanup jobs:**

1. **Storage orphans** (objects without DB rows): Daily job scans `originals` bucket for objects not referenced in `media_assets.storage_path`. Objects older than 24 hours are deleted. Runs via Supabase Edge Function on a cron schedule.

2. **DB orphans** (rows without Storage objects): Daily job queries `media_assets` where the referenced Storage object does not exist (HEAD request returns 404). Rows are deleted. This handles the (unlikely) case where a DB row was created but the object was deleted externally.

**Why 24 hours:** Partners may have slow connections. A 24-hour grace period allows for uploads that complete but where the metadata step is delayed.

## 2.10 Original Media Preservation

- The `originals` bucket is the system of record for original files.
- Files are **never** modified after upload (no transcoding, no resizing, no format conversion).
- Files are **never** served through a CDN that might transform them.
- Checksums are verified at upload and stored. On any read (Admin download, Partner view), the checksum can be re-verified.
- Deletion requires an explicit action (Partner removes media, Product deletion, cleanup job). Accidental deletion is mitigated by the 24-hour grace period before cleanup.

---

# PART 3 — DATABASE MIGRATION STRATEGY

## 3.1 Forward Migration Strategy

All migrations are **forward-only** and numbered sequentially (`001_`, `002_`, `003_`, ...). Each migration file is a single, atomic SQL file.

**Naming convention:**
```
supabase/migrations/
  202508310001_create_profiles.up.sql
  202508310002_create_products.up.sql
  202508310003_create_product_stories.up.sql
  ...
```

Each migration file contains only the SQL for that migration. Down migrations are handled separately (see §3.4).

## 3.2 Schema Versioning

- The database tracks the migration history in Supabase's built-in migration tracking table (`supabase_migrations.schema_migrations`).
- The application **never** reads or writes this table directly.
- The Supabase CLI manages migration tracking.
- The current schema version is always the latest applied migration.

## 3.3 Migration Ordering

Migrations are applied in strict numerical order. No migration depends on a future migration. Dependencies are within the same migration or earlier ones.

**Ordering principles:**
1. Tables are created before foreign keys reference them.
2. RLS policies are created after the tables they protect.
3. Triggers are created after the tables and functions they reference.
4. Indexes are created after the data they index (to avoid locking during migration).

## 3.4 Down Migrations (Rollback)

**Important correction from prior document:** The prior document stated "reversible via down migrations." This is an **overstatement for production systems.**

**Correct policy:**

- **Migrations that add tables, columns, or indexes** may have down migrations (DROP TABLE, DROP COLUMN, DROP INDEX).
- **Migrations that remove tables, columns, or data** do NOT have executable down migrations. The data is gone. The "down" migration is a no-op with a comment explaining why.
- **Migrations that modify data** (e.g., backfill, data correction) do NOT have down migrations.
- **Migrations that add RLS policies** may have down migrations (DROP POLICY).
- **Migrations that change RLS policies** may have down migrations (revert to previous policy).

**Production rollback strategy:** For destructive migrations, rollback is a **forward-fix** (apply a new migration that restores the state) rather than a reverse migration. This is safer because:
1. It preserves the migration history (you can see what happened and what was fixed).
2. It doesn't risk re-applying a broken migration.
3. It allows for partial rollback (restore one table without reverting others).

## 3.5 Deployment Process

```
Developer creates migration locally
        │
        ▼
Developer runs `supabase db push` against local dev project
        │
        ▼
Developer commits migration file + application code in a single PR
        │
        ▼
CI runs:
  1. `supabase db lint` — SQL syntax check
  2. `supabase db diff` — verify migration is well-formed
  3. `npm run test:integration` — run RLS tests against a test project
  4. `npm run typecheck` — verify TypeScript compiles
        │
        ▼
PR approved and merged to `main`
        │
        ▼
CI applies migration to STAGING Supabase project
        │
        ▼
Smoke test runs against staging (RLS smoke test, health check)
        │
        ▼
Manual approval required
        │
        ▼
Migration applied to PRODUCTION Supabase project
        │
        ▼
Production smoke test
        │
        ▼
Deploy Next.js application to Vercel production
```

**Key rules:**
- Migrations are never applied outside this pipeline.
- The same migration file is applied to staging and production (no manual edits).
- If a migration fails on staging, it is fixed in a new migration (not by editing the original).
- Production application code is deployed **after** the migration, not before. This ensures the code is compatible with the schema.

## 3.6 Backup and Recovery

| Asset | Backup Strategy | Recovery Strategy |
|-------|----------------|-------------------|
| Supabase PostgreSQL | Supabase automated daily backups (point-in-time recovery for 7–30 days, depending on plan) | Restore from backup via Supabase dashboard |
| Supabase Storage | Not automatically backed up by Supabase | Cross-region replication (if on Pro/Team plan) or periodic export of critical objects |
| Application code | Git (GitHub) | Standard Git recovery |
| Environment variables | Vercel dashboard (encrypted) | Re-configure from secure vault |

**Recovery procedure for a failed migration:**
1. If migration fails on staging: fix in a new migration, re-run pipeline.
2. If migration fails on production: use Supabase point-in-time recovery to restore to pre-migration state. Apply a corrected migration. Do NOT attempt to manually edit the production database.

## 3.7 When Forward-Fix Is Safer Than Rollback

A forward-fix (new migration that corrects the issue) is always preferred over a rollback (reversing a migration) when:

1. **Data has been written** after the migration (rollback would lose data).
2. **The migration is non-trivial** (e.g., a migration that creates a table, populates it, and creates indexes — rolling back the table creation would lose the data).
3. **Other migrations depend on the changed schema** (rolling back would break subsequent migrations).
4. **The rollback is not well-tested** (forward-fixes are easier to test in isolation).

**Rule of thumb:** If the migration touched more than one table, or if any data was written between the migration and the discovery of the issue, use a forward-fix.

## 3.8 Destructive Migration Handling

Destructive migrations (DROP TABLE, DROP COLUMN, mass DELETE) require:

1. **Explicit review:** A second engineer reviews the migration and confirms the data is safe to delete.
2. **Staging validation:** The migration is applied to staging and the result is verified (data is gone, application still works).
3. **Manual approval gate:** Production application of a destructive migration requires explicit sign-off.
4. **Backup verification:** Confirm that a recent backup exists before applying the destructive migration.

---

# PART 4 — STATE MACHINE ENFORCEMENT

## 4.1 Where to Enforce the State Machine

The state machine must be enforced at **multiple layers**. No single layer is sufficient.

### Layer 1: Database CHECK Constraint

```sql
-- Conceptual (not final SQL)
ALTER TABLE products ADD CONSTRAINT valid_lifecycle_state
  CHECK (lifecycle_state IN ('draft', 'submitted', 'approved', 'rejected', 'changes_requested'));
```

This prevents invalid state values from being written. It does **not** prevent invalid transitions (e.g., `draft` → `approved` directly).

**What it provides:** Data integrity at the storage level. Impossible to have a Product in an undefined state.

### Layer 2: Database Trigger (for transition validation)

A `BEFORE UPDATE` trigger on `products` checks that any change to `lifecycle_state` is a valid transition per the state machine. If the transition is invalid, the trigger raises an exception and the UPDATE is rejected.

```sql
-- Conceptual
CREATE OR REPLACE FUNCTION validate_product_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lifecycle_state <> OLD.lifecycle_state THEN
    IF NOT is_valid_transition(OLD.lifecycle_state, NEW.lifecycle_state) THEN
      RAISE EXCEPTION 'Invalid state transition: % → %', OLD.lifecycle_state, NEW.lifecycle_state;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_product_state_transition_trigger
  BEFORE UPDATE OF lifecycle_state ON products
  FOR EACH ROW EXECUTE FUNCTION validate_product_state_transition();
```

**What it provides:** Invalid transitions are rejected at the database level, regardless of which application path initiated them. This is the safety net.

**Critique of trigger approach:**
- Triggers are invisible to callers. A developer writing a Server Action may not know a trigger exists.
- Triggers can cause confusing error messages ("trigger raised exception" vs. "invalid state transition").
- Triggers can interact with RLS in unexpected ways (the trigger runs in the context of the calling user, not a superuser).
- Triggers are harder to test than explicit function calls.

### Layer 3: Application-Level State Machine Function

A dedicated server-side function `transitionProductState(productId, fromState, toState, actorId, reason, idempotencyKey)` that:

1. Validates the transition (calls a pure function `isValidTransition(from, to)`).
2. Acquires a row-level lock (`SELECT ... FOR UPDATE`).
3. Checks the current state matches `fromState`.
4. Performs the state change and inserts the transition record.
5. All within a transaction.

```typescript
// Conceptual
async function transitionProductState(params: {
  productId: UUID;
  toState: 'submitted' | 'approved' | 'rejected' | 'changes_requested';
  actorId: UUID;
  actorRole: 'partner' | 'admin';
  reason?: string;
  idempotencyKey?: string;
}): Promise<ProductStateTransitionResult> {
  const supabase = getServerSupabase();

  // Idempotency check
  if (params.idempotencyKey) {
    const existing = await supabase
      .from('product_state_transitions')
      .select('*')
      .eq('idempotency_key', params.idempotencyKey)
      .single();
    if (existing) return { status: 'already_done', transition: existing };
  }

  // Transaction: lock + validate + transition
  const result = await supabase.rpc('transition_product_state', {
    p_product_id: params.productId,
    p_to_state: params.toState,
    p_actor_id: params.actorId,
    p_actor_role: params.actorRole,
    p_reason: params.reason,
    p_idempotency_key: params.idempotencyKey,
  });

  return result;
}
```

The database function `transition_product_state` wraps the entire operation in a transaction, including the idempotency check, state validation, row lock, state update, and transition record insert.

**What it provides:** Clear, testable, atomic state transitions. The function is called explicitly by the application. Errors are descriptive. Idempotency is built in.

## 4.2 Recommended Design: Combination

| Layer | What It Enforces | Why |
|-------|-----------------|-----|
| **CHECK constraint** | Valid state values only | Prevents typos, invalid enum values. Cheap and reliable. |
| **Application function** (`transition_product_state`) | Valid transitions, idempotency, atomicity | Primary enforcement. Clear, testable, explicit. |
| **RLS** | Who can call the function / update the table | Access control. Partners can only transition their own Products. |

**We do NOT use a trigger.** Triggers are removed from the design because:
1. They obscure the state machine logic (it lives in a trigger, not in visible code).
2. They make debugging harder (errors come from triggers, not from explicit calls).
3. The application function + CHECK constraint provide equivalent safety with better testability.

The state machine is enforced by:
1. **CHECK constraint** on the `lifecycle_state` column (valid values only).
2. **Application function** that validates transitions explicitly and performs them atomically.
3. **RLS** that controls who can invoke the function.

## 4.3 Transition Function Contract

```sql
-- Conceptual database function
CREATE OR REPLACE FUNCTION transition_product_state(
  p_product_id UUID,
  p_to_state TEXT,
  p_actor_id UUID,
  p_actor_role TEXT,
  p_reason TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_state TEXT,
  error_code TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_state TEXT;
  v_version INT;
BEGIN
  -- Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT to_state INTO v_current_state
    FROM product_state_transitions
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;
    IF FOUND THEN
      RETURN QUERY SELECT true, v_current_state, NULL, NULL;
      RETURN;
    END IF;
  END IF;

  -- Lock and read current state
  SELECT lifecycle_state, version INTO v_current_state, v_version
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL, 'NOT_FOUND', 'Product not found';
    RETURN;
  END IF;

  -- Validate transition (calls a pure validation function)
  IF NOT is_valid_transition(v_current_state, p_to_state) THEN
    RETURN QUERY SELECT false, v_current_state, 'INVALID_TRANSITION',
      format('Cannot transition from %s to %s', v_current_state, p_to_state);
    RETURN;
  END IF;

  -- Perform transition
  UPDATE products
  SET lifecycle_state = p_to_state,
      version = v_version + 1,
      submitted_at = CASE WHEN p_to_state = 'submitted' THEN NOW() ELSE submitted_at END,
      reviewed_at = CASE WHEN p_to_state IN ('approved', 'rejected', 'changes_requested') THEN NOW() ELSE reviewed_at END
  WHERE id = p_product_id;

  -- Record transition
  INSERT INTO product_state_transitions
    (id, product_id, from_state, to_state, actor_id, actor_role, reason, idempotency_key, created_at)
  VALUES
    (gen_random_uuid(), p_product_id, v_current_state, p_to_state, p_actor_id, p_actor_role, p_reason, p_idempotency_key, NOW());

  RETURN QUERY SELECT true, p_to_state, NULL, NULL;
END;
$$;
```

## 4.4 Valid Transitions (Final)

```
draft            → submitted          (Partner submits)
draft            → changes_requested  (NOT VALID — Admin cannot act on drafts)
submitted        → approved           (Admin approves)
submitted        → rejected           (Admin rejects)
submitted        → changes_requested  (Admin requests changes)
changes_requested → submitted         (Partner re-submits)
approved         → (no transitions)   (terminal)
rejected         → (no transitions)   (terminal)
```

All other transitions are **invalid** and are rejected by `is_valid_transition()`.

## 4.5 Failure Behavior

If the transition function fails at any point (validation error, DB error, deadlock), the entire operation is rolled back (it runs in a transaction). The Product remains in its original state. The error is returned to the caller with a descriptive code.

---

# PART 5 — AUDIT LOGGING

## 5.1 Audit Event Taxonomy

| Category | Events | Retention |
|----------|--------|-----------|
| **AUTH** | Login success, login failure, logout, password reset, email verification | 90 days |
| **SECURITY** | RLS violation attempts, rate limit hits, suspicious patterns | 180 days |
| **ADMIN** | Admin reads Partner profiles, Admin reads Products, Admin downloads media | 180 days |
| **REVIEW** | Review decisions (approve/reject/request-changes), review notes | Indefinite (linked to Product lifecycle) |
| **DATA_MUTATION** | Product creation, Product deletion, media upload, media deletion | Indefinite (linked to Product lifecycle) |
| **MEDIA** | Upload success, upload failure, checksum mismatch, orphan detection | 90 days |

## 5.2 What Must Be Audited

| Event | Category | Who | Why |
|--------|----------|-----|-----|
| Admin views a Partner profile | ADMIN | Admin action | Privacy / compliance |
| Admin views a Product | ADMIN | Admin action | Privacy / compliance |
| Admin downloads media | ADMIN | Admin action | Data access tracking |
| Admin records a review decision | REVIEW | Admin action | Consequential decision |
| Partner submits a Product | DATA_MUTATION | Partner action | Lifecycle event |
| Partner deletes a Product | DATA_MUTATION | Partner action | Destructive action |
| Partner deletes media | DATA_MUTATION | Partner action | Destructive action |
| Role change | SECURITY | Admin / System | Privilege change |
| Account suspension | SECURITY | Admin action | Access restriction |
| Login failure (rate-limited) | SECURITY | System | Attack detection |

## 5.3 What Should NOT Be Audited

- Every draft save / autosave (too noisy; draft saves are routine operations, not security events)
- Every media upload success (routine; upload failures are more interesting)
- Page views (handled by Vercel analytics, not the audit log)
- Successful authentication (login success is logged in application logs, not necessarily in the audit table)

## 5.4 Who Can Read Audit Logs

| Role | Access | Mechanism |
|------|--------|-----------|
| Admin | Read all audit logs | RLS: `role = 'admin'` |
| Partner | **No access** to audit logs | RLS denies all access |
| Super Admin | Read all audit logs | Same as Admin (if Super Admin role exists) |

**No one can write to the audit log from the application layer.** Audit log entries are written only by:
1. Database triggers (for automatic events).
2. Server-side code using the service-role client (for application-initiated events).

## 5.5 Audit Log Implementation

**Two sources of audit data:**

1. **`audit_logs` table:** Structured, queryable audit events. Written by server-side code and database triggers.
2. **Application logs (Vercel + structured JSON):** Operational logs with request IDs. Used for debugging and incident response. Not queryable in the same way as the audit table.

**Database triggers for automatic audit:**

```sql
-- Conceptual: trigger on profiles.role change
CREATE OR REPLACE FUNCTION audit_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role <> OLD.role THEN
    INSERT INTO audit_logs (id, actor_id, actor_role, action, target_type, target_id, metadata, created_at)
    VALUES (gen_random_uuid(), auth.uid(), 'admin', 'role_changed', 'profile', NEW.user_id,
            jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role), NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 5.6 Sensitive Information in Audit Logs

**Must NEVER be logged:**
- Passwords, tokens, secrets
- Full file contents
- Raw SQL queries
- Service-role key values
- PII in `metadata` field (use IDs, not names or emails)

**May be logged (with care):**
- User IDs (UUIDs) — these are not PII
- Resource IDs (Product IDs, MediaAsset IDs)
- Action types (from a controlled vocabulary)
- Timestamps
- IP addresses — **OPEN QUESTION:** Whether IP addresses are considered PII in the jurisdiction. If yes, hash them before storing.

## 5.7 Reads vs Mutations

**Mutations are always audited.** Every state transition, every media operation, every deletion.

**Reads are selectively audited.** We audit Admin reads of Partner data (profile, Product, media) because these are privacy-sensitive. We do NOT audit:
- Partner reads of their own data (routine, not a security event).
- Admin reads of Products in the Admin catalog (bulk browsing is expected; individual deep dives are audited).

The boundary: **accessing a specific Partner's specific resource** (their profile, their specific Product, their specific media file) triggers an audit log entry. Browsing a list does not.

## 5.8 Retention

| Category | Retention | Notes |
|----------|-----------|-------|
| AUTH | 90 days | Standard security log retention |
| SECURITY | 180 days | Longer for attack pattern analysis |
| ADMIN | 180 days | Compliance / privacy review |
| REVIEW | Linked to Product lifecycle | Retained as long as the Product exists; after Product deletion, review records are retained for 180 additional days |
| DATA_MUTATION | Linked to Product lifecycle | Same as REVIEW |
| MEDIA | 90 days | Upload events are less critical long-term |

**OPEN QUESTION H30:** Exact retention requirements depend on compliance obligations (GDPR, local regulations). The above are default recommendations.

---

# PART 6 — ADVERSARIAL SECURITY REVIEW

Acting as a Principal Security Engineer. The attacker has a legitimate Partner account and attempts to escalate access or access other Partners' data.

## THREAT-01: IDOR via Direct Product UUID Access

| Aspect | Detail |
|--------|--------|
| **Threat** | Partner A knows Partner B's Product UUID and sends `GET /api/products/{B's-uuid}` |
| **Attack path** | Direct API call bypassing the UI. Could use curl, Postman, or browser dev tools. |
| **Impact** | Partner A reads Partner B's story, maker, shop, and media metadata. **Critical.** |
| **Mitigation** | **RLS:** `SELECT` policy on `products` requires `partner_id = auth.uid()`. Partner A's `auth.uid()` ≠ Partner B's `partner_id`. Query returns 0 rows. **Application:** Server Action re-resolves ownership from the Product ID. Never trusts a `partner_id` from the client. |
| **Verification test** | Integration test: Create two Partners. Partner A attempts `SELECT * FROM products WHERE id = Partner_B's_product_id`. Assert 0 rows. Repeat for every table. |

## THREAT-02: IDOR via Media Path Guessing

| Aspect | Detail |
|--------|--------|
| **Threat** | Partner A guesses Partner B's Storage path and requests a download |
| **Attack path** | If Partner A knows the path convention `{partner_id}/{product_id}/{asset_id}.{ext}`, they can construct paths for Partner B. They request a signed download URL or direct Storage access. |
| **Impact** | Partner A downloads Partner B's original media. **Critical.** |
| **Mitigation** | **Storage policy:** Path prefix must match `auth.uid()`. Partner A's `auth.uid()` ≠ Partner B's `partner_id` prefix. Request is denied. **Application:** Signed URLs are generated server-side with the correct `partner_id` prefix. The client never constructs Storage paths. |
| **Verification test** | Storage policy test: Create two Partners. Partner A attempts to download a file from Partner B's path. Assert 403. Partner A attempts to upload to Partner B's path. Assert 403. |

## THREAT-03: Client-Side Role Spoofing

| Aspect | Detail |
|--------|--------|
| **Threat** | Partner modifies client-side JavaScript state (React context, Redux, localStorage) to set `role = 'admin'` |
| **Attack path** | Browser dev tools → React DevTools → edit state. Or modify localStorage. Or intercept and modify the Server Action response. |
| **Impact** | Partner sees Admin-only UI elements. **Low-Medium impact** because the application and RLS do not trust client-side role information. |
| **Mitigation** | **Application:** Every Server Action and Server Component resolves the role from `profiles.role` server-side. Client-side role state is UX-only. **RLS:** All authorization decisions happen at the database level. Even if the client tricks the application into calling an Admin Server Action, the action resolves the role server-side and rejects the request. |
| **Verification test** | Integration test: As a Partner, attempt to call an Admin-only Server Action (e.g., `getAllProducts()`). Assert 403. Even if the client sends `role: 'admin'` in the request body, the server ignores it. |

## THREAT-04: JWT Claim Manipulation

| Aspect | Detail |
|--------|--------|
| **Threat** | Partner intercepts their JWT and modifies claims to include `role: 'admin'` or a different `sub` |
| **Attack path** | Browser dev tools → Application → Cookies → copy JWT → decode → modify → re-encode (with a stolen signing key, which they don't have). Or modify the JWT in transit if TLS is terminated incorrectly. |
| **Impact** | If the application trusted JWT claims for authorization, this would be critical. **In our design: Low impact** because we don't read role from JWT claims. |
| **Mitigation** | **Design choice:** Role is read from `profiles.role` in the database. JWT is used only for identity (`auth.uid()`). Even if a user modifies their JWT, the `sub` claim (user ID) is validated by Supabase Auth's signature. The role comes from the DB. |
| **Residual risk:** If the `sub` claim is forged (stolen signing key), the attacker could impersonate another user. **Mitigation:** The signing key is managed by Supabase Auth and is never exposed. TLS prevents in-transit modification. |
| **Verification test** | Penetration test: Attempt to use a modified JWT. Supabase Auth rejects it (invalid signature). Even if a valid JWT for User A is presented, RLS filters by `auth.uid()` which matches User A, not User B. |

## THREAT-05: Service-Role Key in Client Bundle

| Aspect | Detail |
|--------|--------|
| **Threat** | Developer accidentally imports a module that uses the service-role client into a Client Component. The service-role key is bundled and shipped to the browser. |
| **Attack path** | Malicious user inspects the JavaScript bundle, extracts the service-role key, and uses it to bypass all RLS. |
| **Impact** | Complete database and Storage access. **Catastrophic.** |
| **Mitigation** | **Multi-layer:** (1) **Build-time check:** CI step scans the built JavaScript bundle for the service-role key pattern. (2) **Lint rule:** ESLint rule bans `SUPABASE_SERVICE_ROLE_KEY` in files with `'use client'` directive. (3) **Module isolation:** Service-role client lives in `src/lib/server/` which is never imported by client code. (4) **Code review:** Checklist item. (5) **Runtime check:** On server cold start, log a warning if the service-role client is instantiated in a context that could be client-rendered. |
| **Verification test** | CI step: After build, grep the output `.next/static/chunks/*.js` for the service-role key string. Assert not found. |

## THREAT-06: RLS Policy Bypass via Application Bug

| Aspect | Detail |
|--------|--------|
| **Threat** | A Server Action has a bug that causes it to query the wrong table, use the wrong column, or skip the ownership check |
| **Attack path** | Developer writes: `supabase.from('products').select('*').eq('id', productId)` — forgetting to add `.eq('partner_id', auth.uid())`. RLS should catch this, but... |
| **Impact** | If RLS is correctly configured, the query still returns only the Partner's own rows. If RLS has a bug or is missing, data is leaked. |
| **Mitigation** | **RLS is the safety net.** The application bug is a UX issue (the Partner sees only their own data, which happens to be correct) or a performance issue (full table scan). The data is not leaked. **The critical requirement is that RLS is always correctly configured and tested.** |
| **Verification test** | RLS test suite: For every table, verify that a Partner querying without an ownership filter returns only their own rows. This test runs in CI on every PR. |

## THREAT-07: RLS Recursion via Policy Self-Join

| Aspect | Detail |
|--------|--------|
| **Threat** | An RLS policy on Table A joins to Table B, which also has RLS. The policy on Table B joins back to Table A. Infinite recursion. |
| **Impact** | Database crash, denial of service. |
| **Mitigation** | **Design rule:** RLS policies use `auth.uid()` directly. They do NOT join to other tables that have RLS policies. The `profiles` table is the only table that policies join to (for role resolution), and `profiles` has a simple SELECT policy that does not join to any other table. |
| **Verification test** | Load test: Create a Partner, attempt a complex query that could trigger recursion. Assert query completes without error. Monitor PostgreSQL for recursive query errors. |

## THREAT-08: Mass Assignment via Client-Supplied Fields

| Aspect | Detail |
|--------|--------|
| **Threat** | Partner sends extra fields in a Product update request (e.g., `lifecycle_state: 'approved'`, `partner_id: other-user's-id`) |
| **Attack path** | Intercept Server Action call (browser dev tools → Network → edit request body) and add unauthorized fields. |
| **Impact** | If the server blindly inserts all client-supplied fields into an UPDATE query, the Partner could change the Product's state or ownership. **Critical.** |
| **Mitigation** | **Application:** Server Actions use explicit column lists. Never use `supabase.from('products').update(clientSuppliedObject)`. Always use `supabase.from('products').update({ lifecycle_state: 'submitted', ...explicitFields })`. Fields like `partner_id`, `lifecycle_state`, `version` are never taken from client input. **RLS:** Even if the application allows the update, RLS prevents a Partner from setting `partner_id` to another user's ID (the UPDATE policy checks `partner_id = auth.uid()`). |
| **Verification test** | Integration test: As Partner A, attempt to update Product B's `lifecycle_state` to `approved`. Assert the update fails (RLS blocks it) or is ignored (application doesn't use the client-supplied field). |

## THREAT-09: Replay Attack on Submission

| Aspect | Detail |
|--------|--------|
| **Threat** | Attacker captures a valid "submit" request and replays it later |
| **Attack path** | Network traffic capture (if TLS is compromised), or browser history interception. |
| **Impact** | Duplicate submission, duplicate state transition. **Medium** (mitigated by idempotency). |
| **Mitigation** | **Idempotency key:** Every submission request includes a unique, single-use `idempotency_key`. Replaying the same request with the same key returns the cached result. Replaying with a different key creates a new request, but the row-level lock + state precondition check prevents a second transition. |
| **Verification test** | Integration test: Submit a Product. Replay the exact same request (same idempotency key). Assert the second call returns the same result without creating a duplicate transition. |

## THREAT-10: Enumeration via Timing Side-Channel

| Aspect | Detail |
|--------|--------|
| **Threat** | Attacker measures response times to determine whether a Product ID exists (valid IDs return faster because RLS finds a match vs. scanning for no match) |
| **Attack path** | Send many requests with different Product UUIDs and measure response times. |
| **Impact** | Low — information disclosure about which Product IDs exist. Not a direct data breach. |
| **Mitigation** | Return 404 with a constant-time delay for both "not found" and "not authorized" cases. This is a **future improvement**; v1 can use the standard RLS behavior. |
| **Verification test** | Performance test: Measure response times for valid vs. invalid Product IDs. Assert no significant timing difference. |

## Summary of Adversarial Review

| Threat | Severity | Mitigated By | Residual Risk |
|--------|----------|-------------|---------------|
| IDOR via Product UUID | Critical | RLS + Application | None (if RLS is correct) |
| IDOR via Media Path | Critical | Storage policy + Application | None (if policies are correct) |
| Client-side role spoofing | Low-Medium | Server-side role resolution | None |
| JWT claim manipulation | Low (design eliminates this) | Role in DB, not JWT | None for role escalation |
| Service-role key in bundle | Critical | Build-time + lint + module isolation | Low (human error risk) |
| RLS bypass via app bug | Critical | RLS as safety net | None (if RLS is tested) |
| RLS recursion | High | Policy design rules | Low |
| Mass assignment | Critical | Explicit column lists + RLS | None |
| Replay attack | Medium | Idempotency keys | Low |
| Timing enumeration | Low | Constant-time responses (future) | Low |

**No fundamental security gaps were discovered.** The three-layer authorization model (Application → RLS → Storage) provides defense in depth. The main residual risks are operational (service-role key exposure via human error, RLS misconfiguration during development).

---

# PART 7 — RELIABILITY ATTACK

Acting as a Senior SRE. Attempting to break the system through failure scenarios.

## 7.1 Double-Click Submit

| Aspect | Detail |
|--------|--------|
| **Failure** | Partner double-clicks "Submit" → two simultaneous submit requests |
| **Detection** | Row-level lock (`SELECT ... FOR UPDATE`) serializes the two transactions. The second transaction reads `lifecycle_state = 'submitted'` (set by the first) and fails the precondition check. Idempotency key provides a secondary check. |
| **Recovery** | Second request returns 409 Conflict. Client shows "already submitted" message. |
| **User experience** | Partner sees success on first click; "already submitted" on second. No data corruption. |
| **Data consistency** | **Guaranteed.** Only one state transition occurs. |

## 7.2 Retry After Timeout

| Aspect | Detail |
|--------|--------|
| **Failure** | Submit request executes and commits, but the response is lost (network timeout, client crash). Partner retries. |
| **Detection** | Server receives retry with the same `idempotency_key`. Queries `product_state_transitions` for an existing record with that key. |
| **Recovery** | Returns the existing result without re-executing the transition. |
| **User experience** | Partner sees "Product submitted successfully." |
| **Data consistency** | **Guaranteed.** No duplicate transition. |

## 7.3 Request Succeeds but Response Is Lost (Media Upload)

| Aspect | Detail |
|--------|--------|
| **Failure** | File uploaded to Storage. Server crashes or response is lost before `media_assets` row is inserted. |
| **Detection** | Client: Partner checks media list; file is not listed. Cleanup job: finds orphaned Storage object. |
| **Recovery** | Client: Partner retries upload. Server detects existing Storage object (same path), re-verifies checksum, creates DB row. Cleanup job: deletes orphaned objects older than 24h. |
| **User experience** | Partner sees upload failure and retries. If they re-upload the same file, it succeeds (dedup detects the existing object). |
| **Data consistency** | **Guaranteed within 24h.** Temporary inconsistency window (Storage object exists without DB row) is resolved by the cleanup job. |

## 7.4 Browser Refresh During Save

| Aspect | Detail |
|--------|--------|
| **Failure** | Partner is editing a draft. They click "Save." The save is in progress. They refresh the browser. |
| **Detection** | The save request either completes (and the response is lost) or is aborted. |
| **Recovery** | If the save completed: the DB has the latest data. Partner refreshes and sees the saved data. If the save was aborted: the DB has the previous version. Partner needs to re-enter their changes. |
| **User experience** | **Problem:** Without client-side preservation, the Partner loses their unsaved changes on refresh. This is the most damaging UX failure. |
| **Mitigation** | **React state preservation:** The draft editor uses React state (not just controlled inputs bound to DB data). On refresh, the page re-fetches from the DB, losing client-side state. To preserve changes: (1) Debounced autosave (every 2 seconds of inactivity, auto-save to server). (2) On beforeunload, attempt a final save. (3) If the Partner returns to the draft within the autosave window, their changes are preserved. (4) **Future:** localStorage as a client-side buffer (but this is not available in the current desktop artifact environment; for the actual app, it's fine). |
| **Data consistency** | **Guaranteed.** The DB always reflects the last committed save. Unsaved changes are in client memory only. |

## 7.5 Session Expires During Editing

| Aspect | Detail |
|--------|--------|
| **Failure** | Partner's session expires while editing. They click "Save." Server returns 401. |
| **Detection** | Server returns 401 Unauthorized. Client middleware detects expired session. |
| **Recovery** | Client shows "Session expired. Please log in again." Partner logs in → redirected to the draft → re-fetches from DB. |
| **User experience** | Partner may lose unsaved changes (see §7.4). The draft in the DB is intact. |
| **Data consistency** | **Guaranteed.** No DB inconsistency. |
| **Improvement:** Extend the session on activity (Supabase supports session refresh). Debounced autosave reduces the window of unsaved changes. |

## 7.6 Two Browser Tabs Editing the Same Product

| Aspect | Detail |
|--------|--------|
| **Failure** | Partner opens Draft X in Tab A and Tab B. Edits in Tab A, saves. Edits in Tab B with stale data, saves. Tab B's save overwrites Tab A's changes. |
| **Detection** | Optimistic concurrency: `products.version` column. Tab B's save includes `WHERE version = N`. Server finds `version = N+1` (set by Tab A). UPDATE affects 0 rows. |
| **Recovery** | Server returns 409 Conflict. Client refreshes data and shows: "This draft was updated in another tab. [Refresh]" |
| **User experience** | Partner clicks "Refresh" → sees the latest data → re-applies their changes. |
| **Data consistency** | **Guaranteed.** Last write does not silently win. Partner resolves the conflict. |

## 7.7 Two Admins Reviewing the Same Product

| Aspect | Detail |
|--------|--------|
| **Failure** | Admin A and Admin B both open a `submitted` Product. Admin A approves. Admin B, not seeing the update, rejects. |
| **Detection** | Same mechanism as §7.1: row-level lock + state precondition check. Admin B's transaction waits for Admin A's commit, reads `lifecycle_state = 'approved'`, fails the `submitted` precondition. |
| **Recovery** | Returns 409 Conflict. Admin B sees "This Product has already been reviewed." |
| **User experience** | Admin B refreshes the catalog to see the current state. |
| **Data consistency** | **Guaranteed.** Only one review decision is applied. |

## 7.8 Storage Upload Succeeds, DB Fails

| Aspect | Detail |
|--------|--------|
| **Failure** | File uploaded to Storage. Server crashes during metadata insert. |
| **Detection** | Client: Partner sees upload failure. Cleanup job: detects orphaned Storage object. |
| **Recovery** | Partner retries upload. Server detects existing object, creates DB row. Cleanup job removes orphan after 24h. |
| **Data consistency** | **Guaranteed within 24h.** See §2.8 for detailed analysis. |

## 7.9 DB Succeeds, Response Is Lost

| Aspect | Detail |
|--------|--------|
| **Failure** | Submit request: state transition commits. Response is lost. Partner retries. |
| **Detection** | Idempotency key matches an existing transition. |
| **Recovery** | Server returns cached result. |
| **Data consistency** | **Guaranteed.** No duplicate transition. |

## 7.10 Database Unavailable

| Aspect | Detail |
|--------|--------|
| **Failure** | Supabase PostgreSQL is unreachable. |
| **Detection** | All DB queries return errors. Server returns 5xx. |
| **Recovery** | No automatic recovery. Partners retry when service is back. |
| **User experience** | "Service temporarily unavailable. Your drafts are saved and will be here when we're back." |
| **Data consistency** | **Guaranteed.** No partial transactions. Either the DB is up and transactions complete, or nothing writes. |

## 7.11 Storage Unavailable

| Aspect | Detail |
|--------|--------|
| **Failure** | Supabase Storage is unreachable. |
| **Detection** | Signed URL generation fails. Upload requests return 5xx. Media load requests return 5xx. |
| **Recovery** | Partners can continue editing non-media fields. Uploads are blocked with a clear message. |
| **User experience** | "File uploads are temporarily unavailable. You can continue editing your draft." |
| **Data consistency** | **Guaranteed.** DB writes are independent of Storage. No orphaned DB rows caused by Storage unavailability. |

## 7.12 Network Interruption During Upload

| Aspect | Detail |
|--------|--------|
| **Failure** | Partner's browser loses network during a large file upload. |
| **Detection** | Upload fails. Client shows error. |
| **Recovery** | Partner retries. If using resumable uploads (future), the upload resumes from the last chunk. In v1: full retry. |
| **Data consistency** | **Guaranteed.** If the upload partially completed, the partial object exists in Storage. The metadata insert never happened (upload must complete before metadata step). Cleanup job removes partial objects. |

## 7.13 Deployment During Active Usage

| Aspect | Detail |
|--------|--------|
| **Failure** | Next.js application is deployed while Partners are actively editing. |
| **Detection** | Vercel performs a rolling deployment. Existing requests complete on the old instance. New requests go to the new instance. |
| **Recovery** | No action needed. Vercel handles this atomically. |
| **User experience** | Partners may experience a brief (<1s) delay on their next action as the new instance warms up. |
| **Data consistency** | **Guaranteed.** The database is not affected by application deploys. All DB operations continue normally. |

## 7.14 Migration Failure

| Aspect | Detail |
|--------|--------|
| **Failure** | A migration fails to apply (SQL error, constraint violation, timeout). |
| **Detection** | CI/staging pipeline fails. Migration is not applied to production. |
| **Recovery** | Fix the migration in a new file. Re-run the pipeline. The failed migration is never applied to production. |
| **User experience** | No impact. The deployment is blocked until the migration is fixed. |
| **Data consistency** | **Guaranteed.** Failed migrations are not applied. Production remains on the previous schema. |

## 7.15 Partial Deployment (Code Deployed, Migration Not Applied)

| Aspect | Detail |
|--------|--------|
| **Failure** | Application code is deployed but the required migration was not applied. |
| **Detection** | Application starts, hits the DB, encounters missing columns/tables. Returns 500. |
| **Recovery** | **Prevented by pipeline:** The deployment process requires the migration to be applied to staging first, and the smoke test to pass, before the application is deployed. This scenario should never happen. |
| **Prevention:** Deploy migrations BEFORE deploying application code. The CI/CD pipeline enforces this order. |
| **Data consistency** | **Guaranteed by process.** |

## 7.16 Duplicate Media Upload

| Aspect | Detail |
|--------|--------|
| **Failure** | Partner uploads the same file twice (same checksum, same Product). |
| **Detection** | Unique constraint on `(partner_id, checksum_sha256)` prevents the second insert. |
| **Recovery** | Server detects the existing record and returns it. The second upload to Storage is a no-op (same path = overwrite, but content is identical). |
| **User experience** | Partner sees the file already exists. No duplicate in the media list. |
| **Data consistency** | **Guaranteed.** Only one `media_assets` row per unique file per Partner. |

---

# PART 8 — CONCURRENCY

## 8.1 Where Concurrency Control Is Required

| Operation | Concurrency Risk | Required Control |
|-----------|-----------------|-----------------|
| Product editing (draft save) | Two tabs / two devices editing the same draft | **Optimistic concurrency** (version column) |
| Product submission | Two submit requests racing | **Pessimistic locking** (row-level lock in transaction) + idempotency key |
| Admin review | Two Admins reviewing the same Product | **Pessimistic locking** (row-level lock in transaction) |
| Media upload metadata insert | Concurrent upload + Product deletion | **Row-level lock** on Product during metadata insert |
| Media upload dedup | Two simultaneous uploads of the same file | **Unique constraint** on `(partner_id, checksum_sha256)` |
| Profile creation | Two simultaneous first-login provisions | **Unique constraint** on `profiles.user_id` |
| Role change | Concurrent role changes by two Admins | **Last-write-wins** (acceptable; role changes are rare and audited) |

## 8.2 Optimistic Concurrency (Draft Editing)

**Where:** Product story, maker, shop updates.

**Mechanism:**
- `products` table has a `version` column (integer, default 1, incremented on every state change).
- Every update to a sub-entity (story, maker, shop) also increments `products.version` (to detect concurrent edits across all sub-entities).
- Client includes the `version` it read in the update request.
- Server UPDATE includes `WHERE version = :clientVersion`.
- If 0 rows are affected, the server returns 409 Conflict with the current version.
- Client refreshes and retries.

**Why optimistic:** Draft editing is low-contention (one Partner, one draft). Optimistic concurrency has lower overhead than pessimistic locks and provides a better UX (no waiting).

**What it does NOT protect:** Two Partners editing different drafts. Two Partners editing different sub-entities of the same draft (these are independent UPDATEs). The `version` column tracks the Product's overall version, not per-field locks.

## 8.3 Pessimistic Locking (State Transitions)

**Where:** Product submission, Admin review.

**Mechanism:**
- The `transition_product_state` database function uses `SELECT ... FOR UPDATE` to lock the Product row.
- The lock is held for the duration of the transaction (typically <100ms).
- This serializes concurrent state change attempts. The second transaction waits for the first to commit, then re-reads the state and either succeeds or fails.

**Why pessimistic:** State transitions are high-stakes (they change the Product's lifecycle) and low-frequency (a Product is submitted once, reviewed once). The brief lock duration is acceptable.

## 8.4 Unique Constraints (Dedup and Idempotency)

| Constraint | Purpose |
|-----------|---------|
| `UNIQUE(partner_id, checksum_sha256)` on `media_assets` | Prevent same file uploaded twice by the same Partner |
| `UNIQUE(idempotency_key) WHERE idempotency_key IS NOT NULL` on `product_state_transitions` | Prevent duplicate state transitions |
| `UNIQUE(user_id)` on `profiles` | Prevent duplicate profile provisioning |
| `UNIQUE(product_id)` on `product_stories`, `makers`, `shops` | Enforce one-to-one relationships |

## 8.5 What Does NOT Need Concurrency Control

- **Admin catalog browsing:** Read-only, no concurrency risk.
- **Partner listing their own Products:** Read-only, no concurrency risk.
- **Media download:** Read-only, no concurrency risk.
- **Audit log writes:** Append-only, multiple writers are fine (INSERTs don't conflict).

---

# PART 9 — IDEMPOTENCY

## 9.1 Operations Requiring Idempotency

| Operation | Idempotency Mechanism | Why |
|-----------|----------------------|-----|
| Product creation | Client-generated `idempotency_key` stored in `products.idempotency_key` (new column) OR natural idempotency (POST creates a new resource each time — not idempotent, but no duplicate harm) | **Not strictly required** — creating a Product twice creates two Products, which is expected behavior. No idempotency key needed. |
| Draft save (story/maker/shop) | Natural idempotency — same data, same result. UPDATE is idempotent by nature. | No idempotency key needed. |
| Product submission | `idempotency_key` in `product_state_transitions` | **Required.** Retry must not create duplicate transitions. |
| Media upload + metadata | `UNIQUE(partner_id, checksum_sha256)` + path-based dedup | **Required.** Retry must not create duplicate media records. |
| Review decision | `idempotency_key` in `product_state_transitions` | **Required.** Retry must not create duplicate decisions. |
| Media deletion | Natural idempotency — DELETE is idempotent (second delete returns "not found" which is fine) | No idempotency key needed. |
| Product deletion | Natural idempotency — same as above | No idempotency key needed. |
| Profile creation | `UNIQUE(user_id)` on `profiles` | Prevents duplicate provisioning on first login. |

## 9.2 Idempotency Key Design

**Format:** UUID v4, generated client-side.

**Scope:** One idempotency key per state transition action (submit, review decision). The key is scoped to the Product (for submission) or to the Product + decision (for review).

**Lifetime:** Idempotency keys are retained permanently in `product_state_transitions`. They serve as both the idempotency check and the audit record.

**Client responsibility:** The client generates a fresh UUID for each "submit" or "review" action. It stores the key in React state for the duration of the request. If the request is retried, the same key is sent.

## 9.3 Where Idempotency Is NOT Required

- **GET requests:** Naturally idempotent (no side effects).
- **Draft saves:** Naturally idempotent (same UPDATE, same result).
- **Deletions:** Naturally idempotent (DELETE of a non-existent resource is a no-op).
- **Product creation:** Not idempotent, but creating two Products is not a harmful duplicate (it's expected behavior).

---

# PART 10 — FINAL ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                    PandaVerse Gharana Partner Portal                        │
│                         Final Architecture v1.0                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

╔═════════════════════════════════════════════════════════════════════════════╗
║  ┌──────────┐    ┌──────────────────────────────────────────────────────┐  ║
║  │ Partner  │    │                    Browser                           │  ║
║  │ (User)   │    │  ┌────────────────────────────────────────────────┐  │  ║
║  └────┬─────┘    │  │         Client Components ('use client')       │  │  ║
║       │ HTTPS    │  │  - File upload input                           │  │  ║
║       │          │  │  - Form state management                       │  │  ║
║       │          │  │  - Real-time feedback (progress, errors)       │  │  ║
║       │          │  │  - UI interactivity (modals, tabs, etc.)       │  │  ║
║       │          │  └────────────────────────────────────────────────┘  │  ║
║       │          │                                                        │  ║
║       │          │  ┌────────────────────────────────────────────────┐  │  ║
║       │          │  │    Server Components (default, no directive)   │  │  ║
║       │          │  │  - Data fetching                               │  │  ║
║       │          │  │  - Authorization checks (server-side)          │  │  ║
║       │          │  │  - Page rendering                              │  │  ║
║       │          │  └────────────────────────────────────────────────┘  │  ║
║       │          │                                                        │  ║
║       │          │  ┌────────────────────────────────────────────────┐  │  ║
║       │          │  │         Server Actions (mutations)             │  │  ║
║       │          │  │  - createProduct()                             │  │  ║
║       │          │  │  - updateStory() / updateMaker() / updateShop()│  │  ║
║       │          │  │  - submitProduct()                             │  │  ║
║       │          │  │  - uploadMedia() → returns signed URL          │  │  ║
║       │          │  │  - confirmUpload() → inserts metadata          │  │  ║
║       │          │  │  - deleteProduct() / deleteMedia()             │  │  ║
║       │          │  │  - reviewProduct() (Admin)                     │  │  ║
║       │          │  └────────────────────────────────────────────────┘  │  ║
║       │          │                                                        │  ║
║       │          │  ┌────────────────────────────────────────────────┐  │  ║
║       │          │  │         Route Handlers (app/api/)              │  │  ║
║       │          │  │  - GET /api/media/download → signed URL        │  │  ║
║       │          │  │  - GET /api/health                             │  │  ║
║       │          │  │  - GET /api/health/ready                       │  │  ║
║       │          │  │  - POST /api/webhooks/... (deferred)           │  │  ║
║       │          │  └────────────────────────────────────────────────┘  │  ║
║       │          │                                                        │  ║
║       │          │  ┌────────────────────────────────────────────────┐  │  ║
║       │          │  │         Middleware (Edge)                       │  │  ║
║       │          │  │  - Session validation (Supabase Auth)           │  │  ║
║       │          │  │  - Role resolution (from profiles)              │  │  ║
║       │          │  │  - Route protection (Partner vs Admin)          │  │  ║
║       │          │  │  - Rate limiting                                │  │  ║
║       │          │  └────────────────────────────────────────────────┘  │  ║
║       │          └────────────────────────────────────────────────────────┘  ║
║       │          │                   │                    │                  │  ║
║       │          │  ┌────────────────▼────────────────▼────────────────┐  │  ║
║       │          │  │              Supabase Client (anon)               │  │  ║
║       │          │  │  - Uses ANON_KEY only                             │  │  ║
║       │          │  │  - Subject to RLS                                 │  │  ║
║       │          │  │  - Used in Server Components, Server Actions       │  │  ║
║       │          │  └──────────────────────────────────────────────────┘  │  ║
║       │          │                                                        │  ║
║       │          │  ┌──────────────────────────────────────────────────┐  │  ║
║       │          │  │        Supabase Client (service-role)            │  │  ║
║       │          │  │  - Uses SERVICE_ROLE_KEY                          │  │  ║
║       │          │  │  - Bypasses RLS                                   │  │  ║
║       │          │  │  - Server-ONLY module (never imported by client)  │  │  ║
║       │          │  │  - Used for: audit_logs insert, state_transitions, │  │  ║
║       │          │  │    Admin download signed URLs                     │  │  ║
║       │          │  └──────────────────────────────────────────────────┘  │  ║
║       └──────────┼────────────────────────────────────────────────────────┼─┘  ║
║                  │                   │                    │                  │    ║
║     ┌────────────▼──────┐  ┌──────────▼──────────┐                           │    ║
║     │   Supabase Auth    │  │   Supabase Storage  │                           │    ║
║     │                    │  │   (bucket: originals)│                          │    ║
║     │  - Users           │  │                     │                           │    ║
║     │  - Sessions        │  │  Path convention:    │                           │    ║
║     │  - Passwords       │  │  {partner_id}/       │                           │    ║
║     │  - Email verify    │  │  {product_id}/       │                           │    ║
║     │                    │  │  {asset_id}.{ext}    │                           │    ║
║     └──────────┬─────────┘  └──────────┬──────────┘                           │    ║
║                │                      │                                        │    ║
║     ┌──────────▼──────────────────────▼──────────────────────────────────┐ │    ║
║     │                      Supabase PostgreSQL                              │ │    ║
║     │                                                                      │ │    ║
║     │  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  ┌────────────┐ │ │    ║
║     │  │ profiles │  │   products   │  │product_stories│  │   makers   │ │    ║
║     │  └────┬─────┘  └──────┬───────┘  └──────┬────────┘  └─────┬──────┘ │ │    ║
║     │       │               │                  │                   │       │ │    ║
║     │  ┌────┴───────────────┴──────────────────┴───────────────────┴───┐ │ │    ║
║     │  │                       ROW LEVEL SECURITY                        │ │ │    ║
║     │  │  ┌──────────────────────────────────────────────────────────┐  │ │ │    ║
║     │  │  │  Partner policies: WHERE partner_id = auth.uid()        │  │ │ │    ║
║     │  │  │  Admin policies:    full access (role = 'admin')        │  │ │ │    ║
║     │  │  │  Default deny on all tables                               │  │ │ │    ║
║     │  │  │  No blanket TO authenticated policies                     │  │ │ │    ║
║     │  │  │  System tables: no client writes                          │  │ │ │    ║
║     │  │  └──────────────────────────────────────────────────────────┘  │ │ │    ║
║     │  └───────────────────────────────────────────────────────────────┘ │ │    ║
║     │                                                                   │ │    ║
║     │  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────────┐  │ │    ║
║     │  │ product_state│  │ review_decisions│  │     audit_logs        │  │ │    ║
║     │  │ transitions  │  │                 │  │  (append-only)        │  │ │    ║
║     │  └──────────────┘  └─────────────────┘  └──────────────────────┘  │ │    ║
║     │                                                                   │ │    ║
║     │  ┌───────────────────────────────────────────────────────────────┐ │ │    ║
║     │  │                    media_assets                                │ │ │    ║
║     │  │  - partner_id (denormalized for RLS)                          │ │ │    ║
║     │  │  - checksum_sha256 (UNIQUE per Partner)                       │ │ │    ║
║     │  │  - storage_path (UNIQUE)                                      │ │ │    ║
║     │  └───────────────────────────────────────────────────────────────┘ │ │    ║
║     └───────────────────────────────────────────────────────────────────┘ │    ║
║                                                                            │    ║
╚═════════════════════════════════════════════════════════════════════════════╝    ║
                                                                                   │
  ┌──────────────────────────────────────────────────────────────────────────────┘
  │
  │  ┌──────────────────────────────────────────────────────────────┐
  │  │                    Observability & Monitoring                 │
  │  │  - Structured logs (request ID, userId, action, durationMs)  │
  │  │  - Error tracking (Sentry or equivalent)                     │
  │  │  - Supabase logs (Postgres + Storage + Auth)                 │
  │  │  - Vercel logs                                               │
  │  │  - Health checks: /api/health, /api/health/ready             │
  │  │  - Uptime monitoring (external ping every 60s)               │
  │  └──────────────────────────────────────────────────────────────┘
  │
  │  ┌──────────────────────────────────────────────────────────────┐
  │  │                    CI/CD Pipeline                             │
  │  │  1. Lint + Typecheck                                         │
  │  │  2. Unit tests                                               │
  │  │  3. Integration tests (RLS test suite)                       │
  │  │  4. Migration lint + dry-run                                 │
  │  │  5. Apply to staging                                         │
  │  │  6. Smoke test                                               │
  │  │  7. Manual approval                                          │
  │  │  8. Apply to production                                      │
  │  │  9. Deploy Next.js to Vercel                                │
  │  │ 10. Production smoke test                                    │
  │  └──────────────────────────────────────────────────────────────┘
```

## 10.1 Authorization Flow (Detailed)

```
Incoming Request
       │
       ▼
┌───────────────┐
│   Middleware   │ ← Vercel Edge
│  - Validate    │   Verifies Supabase Auth session cookie
│    session     │   Extracts auth.uid() from JWT
│  - Resolve     │   Queries profiles.role for auth.uid()
│    role        │   Attaches role to request context
│  - Route       │   Redirects /partner/* → /login if not authenticated
│    protection  │   Redirects /admin/* → /partner if not admin
└───────┬───────┘
       │
       ▼
┌───────────────┐
│ Server Action  │ ← Next.js Server Component / Server Action
│  - Re-resolve  │   Re-reads profile.role from DB (not from middleware
│    role        │   context — defense in depth)
│  - Validate    │   Checks ownership, state, business rules
│    ownership   │
│  - Execute     │
│    operation   │
└───────┬───────┘
       │
       ▼
┌───────────────┐
│ Supabase Client│ ← anon client (subject to RLS)
│  (anon)        │   All queries filtered by RLS policies
│                │   Partner: WHERE partner_id = auth.uid()
│                │   Admin: no filter
└───────┬───────┘
       │
       ▼
┌───────────────┐
│  PostgreSQL    │
│  + RLS         │
│                │ ← Final enforcement layer
│                │   Even if application has a bug, RLS prevents
│                │   cross-tenant access
└────────────────┘
```

## 10.2 Server vs Client Boundary

| Code | Runs Where | Has Access To |
|------|-----------|--------------|
| Server Components | Vercel Edge / Node.js | DB (anon + service-role), Storage (service-role), Auth |
| Server Actions | Vercel Edge / Node.js | Same as Server Components |
| Route Handlers | Vercel Edge / Node.js | Same as Server Components |
| Middleware | Vercel Edge | Auth session, minimal DB queries |
| Client Components | Browser | Supabase anon client only (RLS applies). No service-role access. |

**Rule:** If code needs the service-role client, it must be in a server-only module (`src/lib/server/`). It can never be imported by a Client Component.

---

# PART 11 — FINAL ARCHITECTURE DECISIONS

| Decision | Choice | Reason | Alternatives Rejected |
|----------|--------|--------|----------------------|
| **Framework** | Next.js (App Router) | Server Components + Server Actions eliminate separate API layer. Vercel-native deployment. TypeScript integration. | Remix, SvelteKit, standalone React + Express |
| **Language** | TypeScript (strict mode) | End-to-end type safety. Supabase type generation. Catches bugs at compile time. | JavaScript |
| **Backend platform** | Supabase | PostgreSQL + RLS + Auth + Storage in one platform. RLS is the foundation of our security model. | Firebase, AWS Cognito + RDS + S3, Clerk + PlanetScale |
| **Database** | PostgreSQL | Only mainstream DB with mature RLS. JSONB, full-text search, CHECK constraints, triggers. | MySQL, MongoDB, DynamoDB |
| **Multi-tenancy** | RLS (Row Level Security) | Enforced at DB layer. Defense in depth. Cannot be bypassed by application bugs. | Application-level filtering only |
| **Storage** | Supabase Storage | Path-based policies that integrate with auth model. Single platform with DB and Auth. | AWS S3, Cloudflare R2 |
| **Authentication** | Supabase Auth (email/password) | Mature, secure, integrates with RLS via auth.uid(). httpOnly cookies. | OAuth-only, magic-link only, custom auth |
| **Authorization** | 3-layer: Application → RLS → Storage | Defense in depth. No single point of failure. | Single-layer (application only) |
| **Server/Client boundary** | Server Components + Server Actions for all data/mutations; Client Components only for interactivity | Minimizes client attack surface. Server-side authorization is authoritative. | Client-heavy SPA with separate API |
| **State machine** | Application function + CHECK constraint (no trigger) | Explicit, testable, clear error messages. Triggers obscure logic. | Database trigger |
| **Migration strategy** | Supabase CLI, forward-only, staging-first | Version-controlled, reproducible, staging validation, production manual approval | Manual SQL, migration-less |
| **Rollback** | Forward-fix for destructive changes; down migrations for additive changes | Safer than reversing destructive operations | Always-reversible migrations |
| **Idempotency** | Client-generated UUID keys for state transitions; unique constraints for media | Prevents duplicate transitions and media records | Server-generated keys, no idempotency |
| **Concurrency** | Optimistic (draft edits) + pessimistic (state transitions) + unique constraints | Appropriate control per operation. No unnecessary locking. | Pessimistic everywhere (overhead) |
| **Audit logging** | DB table (audit_logs) + application logs (structured JSON) | Queryable audit trail + operational debugging. Selective (not every read). | Log-only (not queryable), audit everything (noisy) |
| **Observability** | Structured logs with request IDs + error tracking + health checks + uptime monitoring | Correlatable events, fast debugging, proactive alerting | Unstructured logs, no error tracking |
| **Deployment** | Vercel (preview per PR, prod from main) + Supabase (dev/staging/prod) | Native Next.js deployment, environment separation, staging-first migrations | Manual deployment, single environment |
| **Deferred: microservices** | No | Adds operational complexity without solving v1 problems | Microservices |
| **Deferred: Redis** | No | Not needed at v1 scale. Supabase + Vercel caching sufficient | Redis |
| **Deferred: message queue** | No | Not needed for v1 async operations | BullMQ, AWS SQS |
| **Deferred: search engine** | No | Postgres full-text search sufficient for v1 scale | Elasticsearch, Typesense |
| **Deferred: notifications** | No (unless explicitly required) | Adds email provider infrastructure. Not explicitly required by brief. | Resend, SendGrid |
| **Deferred: downstream pipeline** | No | Portal is the intake system. Downstream can poll or webhook later. | Webhook infrastructure |

---

# PART 12 — V1 vs FUTURE

## Required for V1

Only functionality explicitly required or directly inferred from the project specification:

**Authentication & Identity:**
- Partner registration (email/password)
- Partner login / logout
- Admin login (provisioned manually)
- Session management (Supabase Auth)
- Role-based access (Partner vs Admin)
- Email verification (before first submission — ASSUMPTION)

**Partner Features:**
- Profile management (display name, bio, contact, location — exact fields TBD)
- Product creation (as draft)
- Draft editing (story, maker, shop)
- Draft save / resume
- Media upload (photos, videos)
- Product submission for review

**Admin Features:**
- Partner management (list, view, suspend)
- Product catalog (view all Products)
- Product inspection (story, maker, shop, media)
- Search and filter (by state, partner, date, full-text on story)
- Review decisions (approve, reject, request changes) with notes

**System Features:**
- Row Level Security (all tables)
- Storage policies (path-based isolation)
- State machine enforcement
- Idempotent state transitions
- Checksum-based media dedup
- Audit logging (Admin reads, review decisions, mutations)
- Structured logging with request IDs
- Health checks
- Migration pipeline (staging-first)
- Preview deployments per PR

## Deferred (Not V1)

These capabilities are explicitly **not** implemented in v1:

| Capability | Why Deferred | When to Revisit |
|------------|-------------|----------------|
| Email notifications | Not explicitly required. Adds email provider infrastructure. | When product requires submission/review notifications |
| Downstream publishing webhook | Portal is the intake system. Downstream can poll. | When downstream system is ready to integrate |
| Search engine (Elasticsearch, etc.) | Postgres full-text sufficient for v1 scale (up to ~10K Products) | When search performance degrades |
| Redis / caching layer | Not needed at v1 traffic levels | When query latency exceeds targets |
| Message queue / job queue | Not needed for v1 async operations | When async workload grows |
| Microservices | Single Next.js app is sufficient | When team size or traffic justifies service split |
| Separate backend server | Next.js handles server logic | Never, unless specific requirement emerges |
| Partner self-delete | Not explicitly required; legal retention questions | When product decision is made |
| Partner search | Not explicitly required; Admin search is primary | When Partners request catalog search |
| Public catalog | Brief implies private portal | When public-facing catalog is a product requirement |
| Media replacement | OPEN QUESTION — not decided | When product decision is made |
| Maker/Shop reuse across Products | OPEN QUESTION — not decided | When product decision is made |
| Multi-language / i18n | Default to English for v1 | When localization is required |
| Malware scanning | Not explicitly required | When security policy requires it |
| Rate limiting infrastructure (external) | Vercel Edge + Supabase Auth rate limits sufficient | When auth attack volume increases |

---

# PART 13 — FINAL BLOCKER LIST

## BLOCKERS

**These issues must be resolved before implementation can begin safely.**

| # | Blocker | Why It Blocks | Resolution Path |
|---|---------|--------------|----------------|
| B-01 | **Admin provisioning method** (OPEN QUESTION Q01) | Affects the very first user creation, the `profiles` provisioning flow, and whether we need an Admin onboarding UI. Cannot design the registration flow without knowing how Admins are created. | Product decision: manual SQL, invite-only, or self-registration with code. |
| B-02 | **Submission preconditions** (OPEN QUESTION Q08) | Affects server-side validation logic for the submit action. Cannot write the `submitProduct()` Server Action without knowing what "complete enough" means. | Product decision: which fields are required for submission. |
| B-03 | **Maker fields and cardinality** (OPEN QUESTIONS D9, Q09) | Affects the `makers` table schema. Cannot write the migration without knowing the fields and whether one or many makers per Product. | Product decision: exact fields, required vs optional, cardinality. |
| B-04 | **Shop fields and cardinality** (OPEN QUESTIONS D10, Q11, Q10) | Affects the `shops` table schema. Same as above. | Product decision: exact fields, required vs optional, Product-level vs Partner-level. |
| B-05 | **Story format and length** (OPEN QUESTION Q11) | Affects the `product_stories` schema and the editor component. | Product decision: plain text, markdown, or rich text; length limits. |
| B-06 | **Media replacement policy** (OPEN QUESTION Q12) | Affects whether `media_assets` rows are immutable or allow updates, and the deletion behavior of old Storage objects. | Product decision: can Partners replace originals? Is prior version retained? |
| B-07 | **Service-role key isolation verification** | Must be confirmed that the service-role key cannot reach the browser. This is a build-time + CI configuration task that must be set up before any code that uses the service-role client is written. | Engineering task: configure ESLint rule, build-time check, and CI scan before writing server modules. |

**Minimum to unblock implementation: B-01, B-02, B-03, B-04, B-05, B-06.** B-07 is an engineering task that must be completed during the foundations phase but doesn't block the architecture.

## NON-BLOCKING IMPROVEMENTS

These can be addressed during implementation without blocking the start:

| # | Improvement | When to Address |
|---|-------------|-----------------|
| N-01 | Email verification timing (OPEN QUESTION Q03) | During auth implementation (Phase 2) |
| N-02 | Partner self-delete and account deletion policy (OPEN QUESTION Q06) | During Partner management implementation (Phase 6) |
| N-03 | Partner suspension behavior (OPEN QUESTION Q07) | During Partner management implementation (Phase 6) |
| N-04 | File size / count limits (OPEN QUESTION D13) | During media upload implementation (Phase 4) |
| N-05 | Storage quota per Partner (OPEN QUESTION D14) | During media upload implementation (Phase 4) |
| N-06 | EXIF / metadata handling (OPEN QUESTION D22) | During media upload implementation (Phase 4) |
| N-07 | Malware scanning (OPEN QUESTION D21) | v2 |
| N-08 | Review notes visibility to Partner (OPEN QUESTION Q15) | During review implementation (Phase 5) |
| N-09 | Decision reversibility (OPEN QUESTION Q16) | During review implementation (Phase 5) |
| N-10 | Admin direct edit capability (OPEN QUESTION Q17) | During review implementation (Phase 5) |
| N-11 | Downstream integration (OPEN QUESTION Q18) | When downstream system is ready |
| N-12 | Email notifications (OPEN QUESTION Q19) | When product requires it |
| N-13 | Data retention policy (OPEN QUESTION H30) | During compliance review |
| N-14 | IP address logging in audit (PII concern) | During audit implementation |
| N-15 | Exact SLO targets | During observability setup |
| N-16 | Error tracking service selection | During foundations setup |
| N-17 | Brand assets (logo, colors, typography) | During UX polish (Phase 7) |
| N-18 | Multi-language support | v2 |
| N-19 | Constant-time error responses (timing attack mitigation) | During hardening (Phase 8) |

## OPEN PRODUCT QUESTIONS

These require a human/product decision. They are grouped by priority.

### Must resolve before implementation:

| # | Question | Impact |
|---|----------|--------|
| Q01 | How does someone become an Admin? | Affects provisioning flow, first user creation |
| Q08 | What are the exact submission preconditions? | Affects submit validation logic |
| Q09 | What are the exact Maker fields? | Affects `makers` table schema |
| Q10 | What are the exact Shop fields? | Affects `shops` table schema |
| Q11 | Story format (plain/markdown/rich text) and length? | Affects `product_stories` schema and editor |
| Q12 | Can Partners replace uploaded originals? | Affects `media_assets` lifecycle |
| Q17 | Can Admins edit Product content directly? | Affects Admin capabilities and RLS |

### Can resolve during implementation:

| # | Question | Impact |
|---|----------|--------|
| Q02 | Super Admin role exists? | Affects role hierarchy (can add later) |
| Q03 | Email verification timing | Affects auth flow |
| Q04 | MFA for Admins | Affects auth configuration |
| Q05 | Exact Profile fields | Affects `profiles` schema |
| Q06 | Partner self-delete | Affects deletion flow |
| Q07 | Partner suspension behavior | Affects suspension logic |
| Q13 | File size / count limits | Affects upload validation |
| Q14 | Storage quota per Partner | Affects quota enforcement |
| Q15 | Review notes visibility | Affects Partner's reviewed Products view |
| Q16 | Decision reversibility | Affects state machine |

### Can defer to v2:

| # | Question | Impact |
|---|----------|--------|
| Q18 | Downstream pipeline integration | Not v1 |
| Q19 | Email notifications | Not v1 unless required |
| Q20 | Data retention policy | Default to 180 days; refine later |
| Q21 | Malware scanning | Not v1 |
| Q22 | EXIF handling | Default to preserve; refine later |

## ARCHITECTURE ASSUMPTIONS

These are assumptions we are explicitly accepting for v1. If any prove incorrect, they become blockers for v2.

| # | Assumption | Rationale | Risk if Wrong |
|---|-----------|-----------|--------------|
| A-01 | Single region deployment | Back-office tool; no multi-region requirement | Latency for distributed team |
| A-02 | No per-Partner storage quota | Simplicity; Supabase Storage scales automatically | Cost overrun if Partners upload excessively |
| A-03 | Product has exactly one Maker record | Simplifies schema; multiple makers can be comma-separated | Inadequate for Products with multiple distinct makers |
| A-04 | Shop is Product-level (not Partner-level) | Simplifies schema; Partners can re-enter shop info per Product | Inefficient if Partners reuse the same shop across Products |
| A-05 | MediaAssets are immutable (no replacement) | Simplifies lifecycle; originals are preserved | Frustrates Partners who need to correct an upload |
| A-06 | Admin cannot edit Product content directly | Enforces Partner ownership; Admin only decides | Inefficient if Admins need to fix minor typos |
| A-07 | Cascade-delete Products when Partner is deleted | Clean deletion; no orphaned data | Legal retention may require keeping records |
| A-08 | 24-hour orphan cleanup window | Allows for transient failures and retries | Orphaned objects billed for up to 24h |
| A-09 | No notification infrastructure | Not explicitly required | Partners and Admins may expect confirmation emails |
| A-10 | Postgres full-text search sufficient for v1 | Expected catalog size < 10K Products | Search performance degrades as catalog grows |

---

# FINAL VERDICT

## A — READY FOR IMPLEMENTATION

The architecture is sufficiently defined and safe to begin implementation, **subject to resolution of the 6 blockers listed in §BLOCKERS.**

**The architecture provides:**
1. **Correctness:** State machine enforced at the database level. Transaction boundaries are explicit. Data integrity is guaranteed by foreign keys, CHECK constraints, and unique constraints.
2. **Security:** Three-layer authorization (Application → RLS → Storage). Thirteen threat vectors analyzed with mitigations. No fundamental security gaps. The main residual risk is operational (service-role key exposure via human error), which is mitigated by build-time checks, lint rules, and code review.
3. **Reliability:** Sixteen failure scenarios analyzed with detection, recovery, UX, and data consistency guarantees. Idempotency for all retry-prone operations. Orphan cleanup strategy for partial failures.
4. **Maintainability:** Clear server/client boundary. Typed Supabase clients. Forward-only migrations with CI validation. No unnecessary infrastructure.
5. **Testability:** RLS test suite defined. Integration tests against real Supabase. E2E tests for critical journeys. State machine testable via the database function.
6. **Observability:** Structured logging with request IDs. Error tracking. Health checks. Audit events. Production diagnostics.
7. **Simplicity:** No microservices, no Redis, no queues, no separate backend. Single Next.js app. Supabase handles the rest.
8. **Performance:** Direct-to-Storage uploads. Database indexes for common queries. Optimistic concurrency for low-contention edits. No premature optimization.
9. **UI polish:** Deferred to Phase 7 (after the secure core is built).

**Before implementation begins:**
1. Resolve the 6 blockers (product decisions on Admin provisioning, submission preconditions, Maker/Shop fields, story format, media replacement).
2. Set up the service-role key isolation tooling (ESLint rule, build-time check, CI scan).
3. Provision Supabase dev/staging/prod projects.
4. Create the project skeleton (no pages yet).

**Do not begin implementation without explicit approval to proceed.**
