# Leenya SaaS — Due-Diligence Audit Framework
## Part 6: How to Use This Framework

---

## What You Now Have

| File | Contents |
|---|---|
| `01_engineering_doctrine.md` | The rules every auditor must follow. What counts as evidence. How severity and confidence work. |
| `02_review_methodology.md` | The 4-phase audit process. What each phase produces. What behaviors are prohibited. |
| `03_specialist_roles.md` | All 30 specialist roles defined with missions, questions, failure patterns, and deliverable formats. |
| `04_roi_ranking.md` | Roles ranked by ROI for a solo founder pre-launch. Includes the Minimum Viable Audit. |
| `05a_system_prompts_01_08.md` | Paste-ready system prompts for Roles 01–08. |
| `05b_system_prompts_09_16.md` | Paste-ready system prompts for Roles 09–16. |
| `05c_system_prompts_17_24.md` | Paste-ready system prompts for Roles 17–24. |
| `05d_system_prompts_25_30.md` | Paste-ready system prompts for Roles 25–30. |
| `06_usage_guide.md` | This file. |

---

## How to Run an Audit Session

### Step 1 — Pick Your Role by Priority

Go to `04_roi_ranking.md`. Find the role you want to run.

If pre-launch and time-constrained: start with Phase A roles in order:
1. Row Level Security Verifier (Role 08)
2. Multi-Tenancy Isolation Auditor (Role 29)
3. Auth & Authorization Specialist (Role 06)
4. Offensive Security / Red Team Lead (Role 05)
5. Security Engineer (Role 04)

### Step 2 — Open a New Claude Conversation

Each specialist role runs in its own separate conversation. Do not mix roles in one conversation. Contamination between roles destroys the independence requirement from the review methodology.

### Step 3 — Set the System Prompt

Copy the full system prompt from the relevant `05x_system_prompts_XX_XX.md` file. Paste it as the first message (or set it as the system prompt if you are using the API).

### Step 4 — Provide Your Codebase Context

Immediately after the system prompt, provide the relevant codebase artifacts. Structure your input like this:

```
Here is the codebase context for your review.

DATABASE SCHEMA:
[paste your full Supabase schema SQL, or the output of: supabase db dump --schema public]

DIRECTORY STRUCTURE:
[paste the output of: find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*']

RELEVANT SOURCE FILES:
[paste the contents of files most relevant to this reviewer's domain]

DOCUMENTATION:
[paste README.md and any other docs]

ENVIRONMENT VARIABLES (names only, never values):
[paste your .env.example or list of variable names]
```

### Step 5 — Add Domain-Specific Context

After the codebase, add:

```
ADDITIONAL CONTEXT:
- Product: Leenya — queue and appointment management SaaS for Algerian businesses
- Stack: React + TypeScript + Tailwind + Supabase + Vercel
- Stage: Pre-launch, first paying customers expected soon
- Team: Solo founder
- Primary market: Algeria
- This is a vibe-coded codebase — assume no review has been done before this audit
```

### Step 6 — Trigger the Review

End your message with:

```
Begin your review now. Follow the system prompt exactly. Do not assume anything is correct until you verify it. Answer every required question or mark it MISSING INFORMATION. Produce your full output in the required format.
```

### Step 7 — Handle MISSING INFORMATION Items

For every `MISSING INFORMATION` item the reviewer returns:
1. Go find that information in your codebase.
2. Paste it back into the conversation.
3. Ask the reviewer to re-assess that item with the new evidence.

Do not skip MISSING INFORMATION items. They often hide the most critical issues.

### Step 8 — Collect and Log All Findings

After each specialist review, copy all findings into the Master Findings Log (see below).

### Step 9 — Run the Production Readiness Inspector Last

Role 17 (Production Readiness Inspector) must always run last. It synthesizes all other findings. Feed it the complete findings from all previous reviews.

---

## What to Paste Per Role (Quick Reference)

| Role | Must Provide | Also Useful |
|---|---|---|
| 01 Principal Architect | Directory structure, main entry files, 3 user flow code paths | package.json, tsconfig.json |
| 02 Domain Modeler | Full database schema SQL | ERD if available, any domain documentation |
| 03 Business Logic Verifier | Schema + all files containing booking/queue logic | RLS policies, edge functions |
| 04 Security Engineer | All routes/edge functions, middleware, .env.example, package.json | CORS config, error handlers |
| 05 Red Team | All API routes, auth flow, schema | RLS policies, edge function implementations |
| 06 Auth Specialist | Auth configuration, middleware, session management code, JWT usage | Supabase auth settings |
| 07 Supabase Architect | All supabase client initializations, edge functions, storage config | Realtime subscriptions, migration files |
| 08 RLS Verifier | Full schema with RLS policies (output of pg_policies query) | Any service role usage in functions |
| 09 Schema & Query Auditor | Full schema SQL + all Supabase query patterns in application code | Index definitions, stored functions |
| 10 API Contract Validator | All route/function definitions + TypeScript API types | Request validation code, error handlers |
| 11 React Architecture | Full component tree, main page files, hooks, context providers | Data fetching patterns, state management |
| 12 TypeScript Auditor | tsconfig.json + all TS files (or representative sample) | Generated Supabase types file |
| 13 Performance Engineer | All Supabase queries + list/dashboard views + Realtime subscriptions | package.json (bundle deps), pagination code |
| 14 Reliability Engineer | All external API calls, async operations, error handlers | Edge functions, queue booking flow |
| 15 Observability Auditor | All catch blocks, logging calls, package.json (error tracking deps) | Edge function error handling |
| 16 Testing Auditor | All test files + CI config | package.json scripts, coverage reports |
| 17 Production Readiness | ALL findings from ALL previous reviews | Nothing new — synthesis only |
| 18 Deployment Engineer | CI/CD config, migration files, deployment scripts | .gitignore, environment config |
| 19 Backup & DR Auditor | Supabase project config (plan, backup settings) | Recovery documentation if any |
| 20 Documentation Verifier | All .md files, inline comments in critical files, setup instructions | README comparison vs. actual structure |
| 21 Maintainability Auditor | Directory structure + representative files from each layer | TODO/FIXME grep output, dependency list |
| 22 Accessibility Auditor | All form components, main page HTML structure, CSS | Color palette, component library used |
| 23 Privacy Auditor | Data collection locations, analytics integrations, notification code | Privacy policy if exists, third-party list |
| 24 Cost Auditor | Supabase plan info, Realtime subscription patterns, Edge function usage | Storage configuration, Vercel plan |
| 25 DX Auditor | package.json scripts, .env.example, README setup instructions | ESLint config, CI config, pre-commit hooks |
| 26 Fault Tolerance | External API call sites, async operations, notification code | Database transaction usage |
| 27 Data Integrity | Full schema with constraints, concurrent write operations, transaction usage | Multi-step booking flow code |
| 28 Edge Case Analyst | Full booking flow, queue flow, all form validation code | Time zone handling, state machine logic |
| 29 Multi-Tenancy Auditor | Schema + RLS policies + all API routes + Realtime subscriptions | Edge functions, any caching layer |
| 30 Domain Specialist | Complete booking flow end-to-end + queue management + notification triggers | Localization setup, UI flow screenshots |

---

## Extracting Your Codebase for Context

Run these commands in your project root to generate the context you need:

```bash
# 1. Directory structure (exclude noise)
find . -type f \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/.next/*' \
  -not -path '*/dist/*' \
  -not -path '*/build/*' \
  | sort

# 2. Database schema (requires Supabase CLI)
supabase db dump --schema public > schema.sql

# 3. RLS policies specifically
supabase db dump --schema public | grep -A 20 "CREATE POLICY"

# 4. All TypeScript files (for smaller codebases)
find . -name "*.ts" -o -name "*.tsx" \
  | grep -v node_modules \
  | xargs cat

# 5. Grep for potential issues before the audit
grep -rn "service_role" --include="*.ts" --include="*.tsx" --include="*.js" .
grep -rn "catch.*{}" --include="*.ts" --include="*.tsx" .
grep -rn ": any" --include="*.ts" --include="*.tsx" . | wc -l
grep -rn "TODO\|FIXME\|HACK" --include="*.ts" --include="*.tsx" .
grep -rn "console\.log" --include="*.ts" --include="*.tsx" . | wc -l
grep -rn "@ts-ignore" --include="*.ts" --include="*.tsx" .

# 6. Package list (without versions for privacy)
cat package.json | grep -A 100 '"dependencies"'

# 7. Environment variables (names only)
cat .env.example
# or if no .env.example:
grep -rn "process\.env\." --include="*.ts" --include="*.tsx" . | grep -oP 'process\.env\.\K[A-Z_]+' | sort -u
```

---

## Master Findings Log Template

After each review session, record findings here. Use this as your single source of truth for the SHIP / DO NOT SHIP decision.

```markdown
# Leenya — Master Findings Log

Last Updated: [date]
Reviews Completed: [list]
Reviews Remaining: [list]

## SEV-1 Findings (Release Blockers)
| ID | Role | Title | Status | Resolution |
|---|---|---|---|---|

## SEV-2 Findings (Pre-Launch Required)
| ID | Role | Title | Status | Risk Acceptance? | Deadline |
|---|---|---|---|---|---|

## SEV-3 Findings (Fix Within 30 Days)
| ID | Role | Title | Status | Owner | Deadline |
|---|---|---|---|---|---|

## SEV-4 Findings (Backlog)
| ID | Role | Title | Status |
|---|---|---|---|

## SEV-5 Findings (Informational)
| ID | Role | Title | Notes |
|---|---|---|---|

## MISSING INFORMATION Items
| Role | Item | Action Required | Status |
|---|---|---|---|
```

---

## Recommended Session Schedule

If running the full audit across multiple sessions:

| Session | Roles | Focus | Duration Estimate |
|---|---|---|---|
| Session 1 | 08, 29 | RLS + Multi-Tenancy | 2–3 hours |
| Session 2 | 06, 05 | Auth + Red Team | 2–3 hours |
| Session 3 | 04, 07 | Security + Supabase Config | 2 hours |
| Session 4 | 03, 27 | Business Logic + Data Integrity | 2 hours |
| Session 5 | 30, 02 | Domain Correctness + Data Model | 2 hours |
| Session 6 | 14, 15 | Reliability + Observability | 1.5 hours |
| Session 7 | 09, 13 | Schema + Performance | 2 hours |
| Session 8 | 10, 11, 12 | API + React + TypeScript | 2 hours |
| Session 9 | 16, 18, 19 | Testing + Deployment + Backup | 2 hours |
| Session 10 | 20, 21, 28 | Docs + Debt + Edge Cases | 2 hours |
| Session 11 | 22, 23, 24, 25, 26 | UX + Privacy + Cost + DX + Fault | 2 hours |
| Session 12 | 01 | Architecture (synthesizes everything) | 1.5 hours |
| Session 13 | 17 | Production Readiness (final gate) | 1 hour |

Total estimated audit time: **25–30 hours of focused work** across 1–3 weeks.

Minimum viable audit (Phase A only): **6–8 hours**.

---

## Rules for Running Audits Correctly

1. **One role per conversation.** Never ask a reviewer to "also check" something outside their domain.

2. **Never skip the evidence requirement.** If the reviewer makes a claim without citing a file or line, push back: "Cite the file and line number where you verified this."

3. **MISSING INFORMATION is not a failure.** It means you need to provide more context. Go find it and follow up.

4. **Treat every clean finding with suspicion.** If a reviewer says something is fine without citing specific evidence, ask: "What specific evidence did you find that confirms this is correctly implemented?"

5. **Do not fix issues between reviews.** Run all reviews against the same codebase version. Fixing issues mid-audit invalidates comparisons between reviewers.

6. **Log every finding immediately.** Do not rely on memory or conversation history. Paste findings into the Master Findings Log after each session.

7. **Run Production Readiness Inspector last, always.** It requires all other findings as input.

8. **A SEV-1 finding never gets a risk waiver.** It must be fixed, verified, and re-reviewed before shipping.

9. **Re-run high-priority roles after major fixes.** If you fix a SEV-1 finding, re-run the role that found it to verify the fix is correct.

10. **Do not use the same conversation for the re-review.** Open a fresh conversation with the same system prompt and the updated code.
