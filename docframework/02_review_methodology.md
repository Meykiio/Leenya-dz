# Leenya SaaS — Due-Diligence Audit Framework
## Part 2: Review Methodology

---

## Review Philosophy

This audit operates as an **adversarial verification**, not a code review. The default posture is:

> "The system is broken, insecure, or incorrect until proven otherwise by direct evidence."

Every reviewer must approach the codebase as a hostile auditor, not as a colleague looking for what is good. The goal is not to find and report all bugs — it is to determine whether the system is safe enough to accept real customer data and real money.

---

## Audit Phases

### Phase 0 — Triage and Scoping (All Reviewers)

Before any specialist begins their domain review, a triage pass must be completed:

- Map every entry point: HTTP routes, Supabase edge functions, realtime channels, webhooks, cron jobs.
- Map every data model: tables, relationships, constraints, RLS policies.
- Map every authentication surface: login, signup, password reset, session management, OAuth if any.
- Map every authorization boundary: role definitions, permission checks, tenant isolation points.
- Identify all third-party dependencies and flag those with known CVEs.
- Identify all environment variables and confirm which are secrets.
- Identify the gap between what documentation claims and what files exist.

Output: **Triage Map** — a structured inventory used by all specialists as shared ground truth.

### Phase 1 — Independent Domain Reviews

Each specialist conducts their review independently, without coordinating findings with other reviewers. This prevents anchoring bias. Reviews must be completed against actual source code, not summaries.

### Phase 2 — Cross-Domain Validation

After all independent reviews are complete:

- Security Engineer + RLS Verifier compare attack surfaces against access control findings.
- Business Logic Verifier + Domain Modeler compare schema against rule implementations.
- Performance Engineer + SRE cross-check load assumptions against deployment configuration.
- Documentation Verifier compiles all DOC MISMATCH flags from all reviewers.

### Phase 3 — Severity Panel

A severity panel reviews all SEV-1 and SEV-2 findings to confirm severity classification before the final report. No SEV-1 or SEV-2 finding may be downgraded without two reviewers agreeing with documented rationale.

### Phase 4 — Final Report Assembly

The Technical Director assembles findings from all specialists into the unified report. No finding is omitted. Disagreements between reviewers are noted explicitly.

---

## Evidence Standards by Domain

| Domain | Minimum Acceptable Evidence |
|---|---|
| RLS / Access Control | Policy definition + attempted bypass test result |
| Authentication | Token validation code path traced end-to-end |
| Data integrity | Constraint definitions + missing constraint locations |
| Business logic | Rule location in code + what happens when rule is violated |
| Performance | Actual query plan or evidence of unindexed query |
| Observability | Specific error paths that produce no log output |
| Documentation | Side-by-side comparison of claim vs. implementation |

---

## Review Artifacts Required

Each specialist must produce:

1. **Findings List** — Structured table of issues with severity, confidence, evidence, and remediation.
2. **Evidence Log** — File paths, line numbers, schema objects, or test outputs supporting each claim.
3. **MISSING INFORMATION Log** — All areas where evidence was sought but not found.
4. **Remediation Roadmap** — Prioritized list of fixes with estimated effort.
5. **Escalation List** — Any finding that requires second-opinion review before publication.

---

## Prohibited Audit Behaviors

The following behaviors invalidate a specialist's review:

- Publishing a security finding without a code-level citation.
- Marking a finding as VERIFIED without providing a file path or schema reference.
- Lowering severity because a fix "seems easy."
- Adding positive observations to soften negative findings.
- Skipping a section because "the framework handles it."
- Assuming that because a feature is common (e.g., Supabase Auth), it is correctly configured.
- Accepting the README as evidence of anything.

---

## Conflict Resolution

When two specialists disagree on a finding:

1. Both findings are published with their respective evidence.
2. The severity defaults to the **higher** of the two until resolved.
3. The Technical Director makes the final severity call with documented rationale.
4. Unresolved disagreements are disclosed in the final report.

---

## Definition of "Done" for Each Specialist

A specialist's review is complete when:

- All required questions in their role definition are answered (or marked MISSING INFORMATION).
- All findings have evidence level, severity, and confidence score.
- All escalations have been filed.
- The deliverables have been produced in the required format.
- A second reviewer has confirmed all SEV-1 findings.
