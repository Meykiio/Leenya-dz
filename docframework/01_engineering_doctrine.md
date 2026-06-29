# Leenya SaaS — Due-Diligence Audit Framework
## Part 1: Engineering Doctrine

---

## 1. What "Production-Ready" Means

A system is production-ready when ALL of the following conditions are simultaneously true and independently verified:

1. **Correctness** — Every business rule is implemented exactly as intended and verified against requirements, not documentation alone.
2. **Security** — No known exploitable vulnerability exists at the surface area accessible to unauthenticated users, authenticated users, or privileged roles. Row-level security is active, tested, and proven to block cross-tenant data access.
3. **Data integrity** — The database cannot enter an inconsistent state through any user action, API call, concurrent request, or partial failure. Constraints, foreign keys, and transactions enforce this at the schema level, not only at the application level.
4. **Reliability** — The system degrades gracefully under failure. Partial outages do not corrupt data. Retries are idempotent. Timeouts are defined.
5. **Observability** — Every critical user-facing action and every failure mode emits a queryable signal. Errors are not silently swallowed. On-call engineers can diagnose production incidents without reading source code.
6. **Recoverability** — Backups exist, are tested, and have a verified restore time. The system can be rebuilt from zero with documented runbooks.
7. **Deployability** — Releases can be performed safely, rolled back deterministically, and do not require manual database surgery.
8. **Compliance** — The system handles personal data according to applicable regulation (GDPR, local law). Consent, data retention, and deletion paths are implemented.
9. **Performance** — Response times under realistic concurrent load meet acceptable thresholds. No unbounded queries exist.
10. **Maintainability** — Any competent engineer unfamiliar with the codebase can identify the entry point of a bug within 30 minutes and fix it within 2 hours for non-novel issues.

A system that meets 9 of 10 is **not** production-ready. All 10 must be verified.

---

## 2. Evidence Requirements Before Making Claims

No claim may be made in any audit report without one of the following evidence levels attached:

| Evidence Level | Definition |
|---|---|
| **VERIFIED** | Claim is supported by direct code inspection, test output, or runtime observation. File paths, line numbers, or query results cited. |
| **INFERRED** | Claim is supported by structural evidence (e.g., no rate-limit middleware found in router scan), but the absence of evidence is stated explicitly. |
| **ASSUMED** | No direct evidence. Assumption is labeled as such. Must not appear in severity findings. |
| **MISSING** | Information required to make a claim does not exist or was not accessible. Must be explicitly flagged. |

All findings must carry exactly one evidence level. If the evidence level is ASSUMED, the finding is invalid and must be rewritten or escalated.

---

## 3. Distinguishing Observation, Inference, and Assumption

| Type | Definition | Permitted in Finding? | Required Notation |
|---|---|---|---|
| **Observation** | Directly seen in source, schema, config, or runtime output | Yes | None required |
| **Inference** | Logically derived from observed evidence | Yes | "Inferred from [source]" |
| **Assumption** | Believed to be true without supporting evidence | No | Must be escalated or discarded |

If a reviewer cannot determine whether a claim is observation or inference, they must not publish the claim. They must instead file it as a MISSING INFORMATION item.

---

## 4. Documentation Verification Protocol

Documentation must never be trusted at face value. Every documented claim must be verified against one of:

- Source code (file + line number)
- Database schema (table + column + constraint)
- Runtime behavior (network log, test output, actual response)
- Deployment config (environment variable, platform setting)

**Verification procedure:**
1. Read the documentation claim.
2. Locate the corresponding implementation.
3. Confirm the implementation matches the claim.
4. If no implementation is found: mark as **UNDOCUMENTED BEHAVIOR** or **MISSING IMPLEMENTATION**.
5. If implementation contradicts documentation: mark as **DOCUMENTATION MISMATCH** (severity determined by impact).
6. If documentation makes claims about security, RLS, auth, or data isolation: these require active code path tracing, not passive reading.

---

## 5. Acceptable Risk Thresholds

| Risk Category | Acceptable for Production | Notes |
|---|---|---|
| Cross-tenant data leak | **Never** | Zero tolerance. Blocks release. |
| Authentication bypass | **Never** | Zero tolerance. Blocks release. |
| RLS disabled on any table | **Never** | Zero tolerance. Blocks release. |
| Unauthenticated data write | **Never** | Zero tolerance. Blocks release. |
| Data loss on delete (no soft delete or audit log) | Only if intentional and documented | Must be explicit business decision |
| Missing input validation | Not acceptable for critical fields | Acceptable for non-critical display fields with explicit waiver |
| Missing rate limiting | Not acceptable on auth endpoints | Acceptable on internal read endpoints with documented rationale |
| No automated tests | Acceptable with compensating controls | Manual test evidence required |
| Missing monitoring | Not acceptable | At minimum: error alerting must exist |
| No rollback procedure | Not acceptable | Must have documented rollback path |
| Outdated dependencies with CVEs | Not acceptable for CRITICAL/HIGH CVEs | Medium and below: risk-accepted with tracking |

---

## 6. Severity Classification

| Level | Code | Criteria |
|---|---|---|
| **CRITICAL** | SEV-1 | Exploitable now with no prerequisites. Data loss, auth bypass, cross-tenant leak, RCE. Blocks release unconditionally. |
| **HIGH** | SEV-2 | Exploitable with low effort or minimal privilege. Privacy violation, privilege escalation, data corruption. Blocks release unless explicitly waived by founder with written justification. |
| **MEDIUM** | SEV-3 | Exploitable under specific conditions. Degraded reliability, partial data exposure, missing controls that create compounding risk. Must be remediated before scale. |
| **LOW** | SEV-4 | Non-exploitable but creates technical debt or compliance friction. Should be remediated within 30 days. |
| **INFO** | SEV-5 | Observation worth noting. No immediate risk. Backlog candidate. |

---

## 7. Confidence Measurement

Every finding must carry a confidence score from 1–5:

| Score | Label | Meaning |
|---|---|---|
| 5 | **CONFIRMED** | Verified by direct code + runtime evidence. Reproducible. |
| 4 | **HIGH** | Verified by code evidence. Runtime not tested but path is clear. |
| 3 | **MEDIUM** | Inferred from structural evidence. Code path partially traced. |
| 2 | **LOW** | Circumstantial. Based on absence of expected patterns. |
| 1 | **SPECULATIVE** | Hypothesis only. No supporting evidence. Must not appear in final report without escalation. |

A finding with Confidence < 3 must be escalated to a second reviewer before publishing.

---

## 8. Uncertainty Reporting

All uncertainty must be reported explicitly using the following markers:

- `[UNVERIFIED]` — Claim has not been validated against source evidence.
- `[MISSING INFO]` — Required evidence was not found or not accessible.
- `[DOC MISMATCH]` — Documentation contradicts source code or runtime behavior.
- `[CANNOT CONFIRM]` — Reviewer was unable to reach a conclusion with available evidence.
- `[ESCALATE]` — Finding requires review by a second specialist before inclusion.

Suppressing uncertainty to appear more confident is a reportable audit failure.

---

## 9. Handling Contradictions Between Docs, Code, and Behavior

When a contradiction exists between documentation, source code, and/or runtime behavior:

1. **Runtime behavior always takes precedence** over documentation and code comments when determining actual system behavior.
2. **Source code takes precedence** over documentation for determining intended behavior.
3. **Documentation takes precedence** only for determining stated intent, never for actual behavior.
4. Every contradiction must be filed as a **DOC MISMATCH** finding with severity based on its security or reliability impact.
5. A contradiction in a security-relevant claim (RLS, auth, access control) is automatically **SEV-2 or higher** until the contradiction is resolved.

---

## 10. Business Impact Priority Order

When findings compete for attention, prioritize in this order:

1. Data loss or corruption (any customer data at risk)
2. Security / access control failures (any unauthorized access possible)
3. System availability failures (service cannot function for customers)
4. Compliance violations (legal exposure)
5. Performance degradation under load (experience degrades at scale)
6. Missing observability (cannot detect failures in production)
7. Developer experience and maintainability (slows future work)
8. Code style and minor technical debt (lowest priority)

Style preferences and architectural opinions must never displace higher-priority items.

---

## 11. Anti-Hallucination Rules

The following are strictly prohibited:

- Inventing function names, table names, or configuration values not found in the actual codebase.
- Asserting that a security control exists without citing the file and line where it was verified.
- Treating absence of a finding as proof of correctness.
- Describing behavior based on framework defaults without verifying that defaults have not been overridden.
- Summarizing documentation as if it reflects actual behavior.
- Copying findings from similar codebases without verifying they apply to this one.
- Producing a "clean" finding on any security item without explicit code-level evidence.

If a reviewer cannot locate evidence, the correct response is: `MISSING INFORMATION: [describe what was expected and where it was not found]`.
