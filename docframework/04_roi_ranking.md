# Leenya SaaS — Due-Diligence Audit Framework
## Part 4: Specialist Role Ranking by ROI

---

## Ranking Criteria

ROI is calculated based on three factors weighted for a **solo founder, limited budget, vibe-coded SaaS, pre-launch**:

1. **Blast radius** — How bad is the worst-case failure if this area is broken?
2. **Probability of defect** — How likely is this area to have real issues in a vibe-coded codebase?
3. **Remediation cost** — How expensive is it to fix issues found in this area post-launch vs. pre-launch?

The ranking answers: *If you only had time to run N reviews before shipping, which N would you run?*

---

## ROI Ranking Table

| Rank | Role | Blast Radius | Defect Probability | Fix Cost if Found Post-Launch | ROI Score |
|---|---|---|---|---|---|
| 1 | Multi-Tenancy Isolation Auditor | CRITICAL — data breach, legal liability | Very High (common vibe-code failure) | Extreme — architecture may need redesign | **★★★★★** |
| 2 | Row Level Security Verifier | CRITICAL — all customer data exposed | Very High (RLS misconfiguration is endemic) | High — each policy must be rewritten and tested | **★★★★★** |
| 3 | Offensive Security / Red Team Lead | CRITICAL — real exploits found | High (ID enumeration, privilege escalation common) | High — fixes depend on findings | **★★★★★** |
| 4 | Auth & Authorization Specialist | CRITICAL — unauthorized access | High (JWT misuse, client-only checks common) | High — auth refactors are high-risk | **★★★★★** |
| 5 | Business Logic Verifier | HIGH — core product broken | Very High (vibe-coded logic rarely covers edge cases) | Medium — usually fixable in code without schema changes | **★★★★☆** |
| 6 | Data Integrity Verifier | HIGH — corrupted or inconsistent data | High (missing constraints are invisible until prod) | High — some fixes require migrations on live data | **★★★★☆** |
| 7 | Security Engineer | HIGH — broad attack surface | High (input validation, error leakage, CORS) | Medium — most fixes are incremental | **★★★★☆** |
| 8 | PostgreSQL Schema & Query Auditor | HIGH — data model errors are expensive to fix | High (wrong types, missing constraints very common) | Very High — schema migrations on live data are risky | **★★★★☆** |
| 9 | Production Readiness Inspector | HIGH — single gate for all blockers | N/A (synthesizes other reviews) | N/A | **★★★★☆** |
| 10 | Reliability Engineer (SRE) | HIGH — data loss under partial failure | Medium (depends on how async ops are handled) | Medium | **★★★★☆** |
| 11 | Queue & Appointment Domain Specialist | HIGH — core product doesn't work correctly | High (domain logic in vibe-coded systems is often wrong) | Medium — usually code-level fixes | **★★★★☆** |
| 12 | Supabase Platform Architect | HIGH — platform misconfiguration affects everything | High (service key exposure, Realtime misconfiguration) | Low-Medium — config changes are fast | **★★★★☆** |
| 13 | Domain Modeler | HIGH — wrong schema is expensive to fix | Medium-High | Very High | **★★★☆☆** |
| 14 | Observability & Monitoring Auditor | MEDIUM — can't detect or diagnose prod issues | Very High (logging is almost always missing) | Low — adding monitoring is cheap | **★★★☆☆** |
| 15 | Fault Tolerance Engineer | MEDIUM-HIGH — silent data loss under failure | Medium | Medium | **★★★☆☆** |
| 16 | Edge Case & Abuse Case Analyst | MEDIUM — product behaves wrong in real use | High | Low-Medium | **★★★☆☆** |
| 17 | API Contract Validator | MEDIUM — inconsistent API causes bugs | Medium | Low | **★★★☆☆** |
| 18 | Privacy & Compliance Auditor | MEDIUM-HIGH — legal exposure | Medium (privacy policy often missing) | Low — mostly policy/config | **★★★☆☆** |
| 19 | Deployment & Rollback Engineer | MEDIUM — bad deploy with no rollback | Medium | Low | **★★★☆☆** |
| 20 | Performance Engineer | MEDIUM — degrades at scale not at launch | Low-Medium (only matters at real load) | Low-Medium | **★★★☆☆** |
| 21 | Principal Software Architect | MEDIUM — structural issues compound over time | Medium | Very High (architectural changes are expensive) | **★★☆☆☆** |
| 22 | React Architecture Reviewer | LOW-MEDIUM — maintainability, not correctness | Medium | Medium | **★★☆☆☆** |
| 23 | TypeScript Correctness Auditor | LOW-MEDIUM — type safety is not runtime safety | High (any usage is common) | Low | **★★☆☆☆** |
| 24 | Testing Strategy Auditor | LOW-MEDIUM — no tests = no regression safety | Very High (tests often minimal) | Low (adding tests is cheap) | **★★☆☆☆** |
| 25 | Backup & Disaster Recovery Auditor | HIGH in worst case — usually low probability | Medium | Low (Supabase config change) | **★★☆☆☆** |
| 26 | Documentation Verifier | LOW — confusion, not breakage | Very High | Very Low | **★★☆☆☆** |
| 27 | Technical Debt & Maintainability Auditor | LOW — long-term, not launch-blocking | High | Medium (ongoing effort) | **★★☆☆☆** |
| 28 | Cost Efficiency Auditor | LOW at launch — matters at scale | Low | Low | **★★☆☆☆** |
| 29 | Accessibility & UX Quality Auditor | LOW — rarely launch-blocking | Medium | Low | **★☆☆☆☆** |
| 30 | Developer Experience Auditor | LOW — affects founder only | High | Very Low | **★☆☆☆☆** |

---

## Minimum Viable Audit (Budget-Constrained)

If resources allow only a partial audit before launch, run these in order and stop only when all are complete:

**PHASE A — Non-negotiable (block launch if any finding is SEV-1):**
1. Row Level Security Verifier
2. Multi-Tenancy Isolation Auditor
3. Auth & Authorization Specialist
4. Offensive Security / Red Team Lead
5. Security Engineer

**PHASE B — Required before taking real money:**
6. Business Logic Verifier
7. Data Integrity Verifier
8. Queue & Appointment Domain Specialist
9. Production Readiness Inspector
10. Observability & Monitoring Auditor

**PHASE C — Complete within 30 days of launch:**
11. PostgreSQL Schema & Query Auditor
12. Supabase Platform Architect
13. Reliability Engineer (SRE)
14. Fault Tolerance Engineer
15. Deployment & Rollback Engineer
16. Backup & Disaster Recovery Auditor
17. Privacy & Compliance Auditor

**PHASE D — Complete within 90 days of launch:**
18. All remaining roles.

---

## Why Multi-Tenancy and RLS Rank #1

In a vibe-coded SaaS on Supabase, the single most common catastrophic failure pattern is:

> Business A can read Business B's customer data because RLS is missing or incorrect on one or more tables.

This is not hypothetical. It is the default failure mode when:
- RLS is enabled on some tables but not all
- RLS policies check `auth.uid()` but not the tenant/business relationship
- Service role key is used in Edge Functions as a shortcut, bypassing RLS entirely
- INSERT policies are missing, allowing a user to insert records owned by another tenant

This failure mode is invisible in development, invisible in testing, and catastrophic in production. It is the first thing to verify and the last thing that should be left uncertain.
