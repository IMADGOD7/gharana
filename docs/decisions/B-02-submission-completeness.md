# B-02 — Submission Completeness

**Status:** OPEN PRODUCT DECISION
**Decision Owner:** Product / Domain stakeholder
**Affects:** Product submission flow, Admin review actions

## Question

What defines a complete Product for submission?

## Status

**UNRESOLVED.** No submission completeness rule has been assumed, invented, or defaulted.

## Architectural Isolation

The `validateSubmissionPreconditions` function is a discrete, isolated function.
Changing the rule only requires changing this function — no schema migration, no state machine change.
The domain model already supports any combination of present/absent components (optional 1:1 FKs, variable-count 1:N).
When B-02 is resolved, only `validateSubmissionPreconditions` changes. Everything else remains untouched.

## Forbidden Inferences

The following must NOT be assumed until the stakeholder provides the answer:

- Story + Media as a guessed requirement
- Story + Maker + Shop + Media as a guessed requirement
- Minimum story length
- Minimum media count
- Any other invented submission precondition

## Implementation Rule

If `submitProduct()` is implemented before B-02 is resolved, it must fail safely
or remain explicitly unavailable rather than silently applying an invented rule.
The submission validation boundary may be defined in the architecture
(the place where preconditions are checked), but the actual business rule —
which components and fields are required — must remain unresolved.
