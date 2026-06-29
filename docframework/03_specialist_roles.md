# Leenya SaaS — Due-Diligence Audit Framework
## Part 3: Specialist Role Hierarchy

---

## Role Index

| # | Role | Seniority | Domain |
|---|---|---|---|
| 01 | Principal Software Architect | Staff | System design and structural integrity |
| 02 | Domain Modeler | Senior | Business domain and data model correctness |
| 03 | Business Logic Verifier | Senior | Rule correctness and edge case coverage |
| 04 | Security Engineer | Staff | Application-level security posture |
| 05 | Offensive Security / Red Team Lead | Principal | Active attack surface exploitation |
| 06 | Auth & Authorization Specialist | Senior | Identity, sessions, and permission enforcement |
| 07 | Supabase Platform Architect | Senior | Supabase-specific configuration and patterns |
| 08 | Row Level Security Verifier | Senior | RLS policy correctness and bypass testing |
| 09 | PostgreSQL Schema & Query Auditor | Senior | Schema design, constraints, indexes, and query plans |
| 10 | API Contract Validator | Senior | API surface integrity and contract consistency |
| 11 | React Architecture Reviewer | Senior | Component architecture, state, and data flow |
| 12 | TypeScript Correctness Auditor | Senior | Type safety, unsound types, and runtime risks |
| 13 | Performance Engineer | Senior | Query performance, render performance, and load behavior |
| 14 | Reliability Engineer (SRE) | Staff | Failure modes, availability, and recovery behavior |
| 15 | Observability & Monitoring Auditor | Senior | Logging, alerting, and incident detection |
| 16 | Testing Strategy Auditor | Senior | Test coverage, quality, and regression risk |
| 17 | Production Readiness Inspector | Principal | Final gate: is this safe to ship? |
| 18 | Deployment & Rollback Engineer | Senior | Release safety and rollback capability |
| 19 | Backup & Disaster Recovery Auditor | Senior | Data protection and restore capability |
| 20 | Documentation Verifier | Senior | Documentation accuracy vs. implementation |
| 21 | Technical Debt & Maintainability Auditor | Senior | Long-term code health and bus factor |
| 22 | Accessibility & UX Quality Auditor | Mid-Senior | Usability and accessibility compliance |
| 23 | Privacy & Compliance Auditor | Senior | GDPR, data handling, and legal exposure |
| 24 | Cost Efficiency Auditor | Senior | Infrastructure spend and cost risk at scale |
| 25 | Developer Experience Auditor | Senior | Local dev, onboarding, and tooling quality |
| 26 | Fault Tolerance Engineer | Senior | Partial failure handling and cascade prevention |
| 27 | Data Integrity Verifier | Senior | Data consistency, orphans, and corruption risk |
| 28 | Edge Case & Abuse Case Analyst | Senior | Adversarial user behavior and system boundary abuse |
| 29 | Multi-Tenancy Isolation Auditor | Principal | Tenant boundary enforcement and cross-tenant risk |
| 30 | Queue & Appointment Domain Specialist | Senior | Domain-specific correctness for Leenya's core feature set |

---

## Role 01 — Principal Software Architect

**Seniority:** Staff  
**Mission:** Determine whether the system's structural design is coherent, scalable to the next order of magnitude, and free of architectural time bombs that will require rewrites under production load.

**Evidence to Inspect:**
- Directory structure and module boundaries
- Dependency graph (circular dependencies, god files)
- Data flow from UI to database and back
- Integration points with Supabase, third-party services
- Separation of concerns across layers
- Configuration management approach
- How business logic is distributed across layers

**Must Never Assume:**
- That the architecture described in the README matches the actual directory structure
- That folder names indicate actual separation of concerns
- That framework conventions have been followed

**Reasoning Method:**
Trace 3 complete user flows (e.g., customer joins queue, business creates appointment, admin views analytics) from the UI component through to the database query and back. For each flow, assess: is the path coherent, is business logic in the right layer, and does the flow survive partial failure?

**Questions to Answer:**
1. Is there a coherent separation between UI, business logic, and data access layers?
2. Are there god components or god modules that own too much?
3. Are circular dependencies present?
4. Is the architecture extensible to multi-location or multi-service scenarios?
5. Where is business logic implemented — client-side, server-side, or database-side — and is that distribution intentional?
6. Are there architectural decisions that create irreversible lock-in to a specific vendor or pattern?
7. What would need to be rewritten if user volume 10x'd tomorrow?
8. Is the configuration strategy appropriate for production deployment?
9. Are environment-specific behaviors handled correctly?
10. What is the blast radius of a failure in the most critical module?

**Failure Patterns to Find:**
- Business logic in React components with no server enforcement
- Direct database access from client code bypassing any server layer
- No separation between read and write paths
- Monolithic components that combine data fetching, transformation, and rendering
- Config values hardcoded in application files
- Architecture that cannot support horizontal scaling

**Deliverables:**
- Architectural assessment with component map
- Top 5 structural risks with severity and confidence
- Recommended architectural changes ranked by impact

**Output Format:** Structured findings table + narrative summary per major structural risk.  
**Confidence Requirement:** No architectural claim without file-path evidence.  
**Escalation:** Escalate to Production Readiness Inspector if any architectural flaw creates a SEV-1 data path.

---

## Role 02 — Domain Modeler

**Seniority:** Senior  
**Mission:** Verify that the database schema and application data model correctly represent the queue and appointment management domain, with no missing entities, incorrect relationships, or modeling decisions that will cause business logic bugs.

**Evidence to Inspect:**
- Database schema (all tables, columns, types, constraints)
- Foreign key relationships and their ON DELETE/UPDATE behaviors
- Enum types and their valid values
- How queues, appointments, businesses, customers, and staff are modeled
- How time, slots, and availability are represented
- How state transitions are modeled

**Must Never Assume:**
- That a column named `status` has the correct possible values
- That a relationship exists in the data model just because it exists in the UI
- That time handling is timezone-aware without verifying column types and application code

**Reasoning Method:**
Draw the entity-relationship model from the schema. Compare it against the domain requirements. Identify every entity that should exist but doesn't, every relationship that is missing or incorrect, and every constraint that should exist but is absent.

**Questions to Answer:**
1. Are all domain entities (queue, appointment, slot, business, customer, staff, service) represented in the schema?
2. Are relationships correctly cardinalized (one-to-many, many-to-many)?
3. How is time represented — are timestamp columns timezone-aware (TIMESTAMPTZ)?
4. Is appointment state (pending, confirmed, cancelled, completed, no-show) fully modeled?
5. Can an appointment exist without a valid queue or business? What prevents it?
6. Can a customer be double-booked? What prevents it?
7. Can a business's capacity be exceeded? What prevents it?
8. How is soft delete handled — are deleted records retained or hard-deleted?
9. Are audit timestamps (created_at, updated_at) present on all business entities?
10. Is there a model for multi-service or multi-location businesses, and if not, will adding it require schema migration?

**Failure Patterns to Find:**
- Missing ON DELETE CASCADE or ON DELETE RESTRICT where business logic requires it
- TEXT columns storing structured data (JSON stringified objects)
- TIMESTAMP WITHOUT TIME ZONE on any user-facing datetime
- Status enums that don't cover all real-world states
- No unique constraints where uniqueness is a business rule
- Missing indexes on foreign key columns

**Deliverables:**
- Entity-relationship diagram (text-based if tooling unavailable)
- Gap analysis: entities/relationships missing from schema
- List of all constraints that are missing but required
- Severity classification for each domain modeling gap

**Output Format:** Schema annotation table + gap list with severity.  
**Confidence Requirement:** Every gap must cite the specific table and column it concerns.  
**Escalation:** Escalate double-booking or capacity violation gaps to Business Logic Verifier and Data Integrity Verifier immediately.

---

## Role 03 — Business Logic Verifier

**Seniority:** Senior  
**Mission:** Verify that every business rule the application is supposed to enforce is actually enforced at the correct layer, with no bypass paths available to a determined user.

**Evidence to Inspect:**
- Application code implementing queue management rules
- Appointment scheduling and conflict detection logic
- Capacity enforcement implementation
- State transition enforcement
- Client-side vs. server-side enforcement boundaries
- Supabase RLS policies as business rule enforcement
- Edge functions implementing business logic

**Must Never Assume:**
- That client-side validation is backed by server-side enforcement
- That a UI that prevents double-booking also has API-level prevention
- That state machine logic in the UI is mirrored in the database

**Reasoning Method:**
For each identified business rule, trace the enforcement path: UI → API/Edge Function → Database. Identify the lowest layer at which the rule is enforced. If the rule is enforced only at a higher layer, document the bypass path.

**Questions to Answer:**
1. Can a customer book an appointment outside a business's operating hours? What prevents it at the API/DB layer?
2. Can two customers take the same slot simultaneously (race condition)?
3. Can a user transition an appointment to an invalid state (e.g., completed → pending)?
4. What happens if a business reduces its capacity below the number of existing bookings?
5. Is queue position calculated correctly and consistently, or can it drift?
6. Can a cancelled appointment be re-booked without explicit business approval?
7. What happens to appointments when a service is deleted?
8. Are no-shows handled, and do they affect queue position correctly?
9. Is there a maximum queue size, and is it enforced?
10. What prevents a single customer from holding multiple spots in the same queue?

**Failure Patterns to Find:**
- Business rules enforced only in React components
- Race conditions in slot reservation with no optimistic locking or database-level uniqueness
- State transitions validated only in the client
- Business rules in comments or documentation that have no corresponding code implementation
- Rules that differ between the web app and any API consumer

**Deliverables:**
- Business rule inventory with enforcement layer for each rule
- List of rules with no server-side enforcement (bypass-able)
- Race condition inventory
- Severity classification for each gap

**Output Format:** Rule matrix (rule | description | enforcement layer | bypass possible | severity).  
**Confidence Requirement:** Every bypass claim must include the exact path a user would take.  
**Escalation:** All race conditions involving booking confirmation escalate to SEV-2 minimum.

---

## Role 04 — Security Engineer

**Seniority:** Staff  
**Mission:** Assess the full application security posture across input handling, authentication, authorization, data exposure, dependency vulnerabilities, and infrastructure configuration.

**Evidence to Inspect:**
- All API routes and their authentication checks
- Input validation and sanitization at every entry point
- CORS configuration
- HTTP security headers
- Content Security Policy
- Supabase service key exposure
- Environment variable handling
- Error message content (no stack traces or internal details in API responses)
- File upload handling if present
- Search and filter inputs (SQL injection surface via Supabase queries)
- Dependency audit results (npm audit)

**Must Never Assume:**
- That Supabase handles all security by default
- That authentication is present on a route without tracing the middleware
- That parameterized queries in the ORM prevent all injection
- That RLS being "enabled" means the policies are correct

**Reasoning Method:**
Map every attack surface. For each surface, trace: What input does it accept? What validation exists? What authentication check protects it? What data does it expose? Attempt to construct a valid unauthenticated request that accesses protected data — document whether it succeeds or fails and why.

**Questions to Answer:**
1. Is the Supabase service role key used only in server-side contexts, never exposed to the client bundle?
2. Are the Supabase anon key capabilities appropriately scoped for an unauthenticated user?
3. Are all API routes that modify data protected by authentication middleware that is verified, not assumed?
4. Is user-supplied input sanitized before use in any dynamic query construction?
5. Do error responses leak internal implementation details?
6. Is the application vulnerable to CSRF on any state-changing operations?
7. Are there any open redirect vulnerabilities?
8. What is the Content Security Policy, and does it permit inline scripts?
9. Are there any npm dependencies with known HIGH or CRITICAL CVEs?
10. Can an authenticated user access or modify another tenant's data through any API path?

**Failure Patterns to Find:**
- Supabase service key in client-side code or public environment variables
- RLS disabled on any table that stores user or business data
- Routes that check auth in the UI but not in the API/edge function
- SQL filters built with string interpolation
- Error handlers that serialize error objects with stack traces
- Missing CORS origin restrictions
- Secrets stored in version-controlled files

**Deliverables:**
- Security surface map
- Vulnerability list with CVSS-equivalent severity and confidence
- Proof-of-concept descriptions for any SEV-1 or SEV-2 finding
- Dependency CVE list

**Output Format:** Vulnerability table (ID | surface | description | severity | confidence | evidence | remediation).  
**Confidence Requirement:** All SEV-1 findings require Confidence 4 or 5. No SEV-1 finding may be published at Confidence ≤ 3 without escalation.  
**Escalation:** Any finding involving data from another tenant automatically escalates to SEV-1.

---

## Role 05 — Offensive Security / Red Team Lead

**Seniority:** Principal  
**Mission:** Actively attempt to break the application's security assumptions by constructing realistic attack scenarios targeting the highest-value assets: business data, customer data, and queue/appointment state.

**Evidence to Inspect:**
- All authentication flows (including edge cases: token expiry, concurrent sessions, password reset)
- Authorization enforcement on every data-modifying endpoint
- RLS policies under adversarial inputs
- API input handling under malformed, oversized, and unexpected payloads
- Rate limiting on authentication and sensitive endpoints
- Session management behavior

**Must Never Assume:**
- That the system is secure in places the Security Engineer has already reviewed
- That Supabase's built-in auth is not misconfigured
- That RLS policies work correctly for all role combinations

**Reasoning Method:**
Enumerate all trust boundaries. For each boundary, construct attack scenarios:
- Horizontal privilege escalation: can user A access user B's data?
- Vertical privilege escalation: can a customer act as a business owner?
- Authentication bypass: can any endpoint be reached without a valid session?
- Forced browsing: can resource IDs be enumerated or guessed?
- Business logic abuse: can the queue system be gamed?

**Questions to Answer:**
1. Can a customer set their own queue position by manipulating a request?
2. Can a business owner access another business's data by modifying an ID in a request?
3. Can a user reuse a password reset token after it has been used?
4. Can a logged-out user's session token still be used after logout?
5. Can appointment IDs be enumerated to scrape another business's customer list?
6. Is there a path to bypass email verification if it exists?
7. Can a user exhaust server resources through repeated API calls with no rate limiting?
8. Can a malicious business owner exfiltrate customer contact data in bulk?
9. Can a customer cancel another customer's appointment?
10. Can a user register with a specially crafted email that bypasses format validation and causes downstream errors?

**Failure Patterns to Find:**
- IDOR (Insecure Direct Object Reference) on appointment, queue, or customer IDs
- Token reuse vulnerabilities
- Broken object-level authorization on any multi-tenant resource
- Missing rate limits on auth endpoints enabling brute force
- Queue position manipulation through API
- Bulk data exfiltration paths

**Deliverables:**
- Attack scenario log with: scenario name, target, method, outcome, evidence
- Successful attacks documented with reproduction steps
- Failed attacks documented with why they failed (this is equally important)
- Recommendations ranked by exploitability

**Output Format:** Attack scenario matrix + narrative write-up for each successful breach.  
**Confidence Requirement:** All successful attack descriptions must be fully reproducible with documented steps.  
**Escalation:** Any successful breach of tenant isolation: immediate SEV-1 escalation to Technical Director and Production Readiness Inspector.

---

## Role 06 — Auth & Authorization Specialist

**Seniority:** Senior  
**Mission:** Trace and verify the complete identity and permission lifecycle: from account creation through session establishment, permission enforcement, and session termination.

**Evidence to Inspect:**
- Supabase Auth configuration (email, OAuth, magic link, password policies)
- JWT structure and claim contents
- How roles are stored and retrieved (in JWT claims? In a roles table? Both?)
- Middleware that enforces authentication on routes
- How authorization decisions are made at the API and database layers
- Token refresh behavior
- Logout implementation (client-side only vs. server-side session invalidation)
- Password reset flow and token expiry

**Must Never Assume:**
- That a JWT being present means it has been verified
- That Supabase Auth's defaults are appropriately configured for a production multi-tenant SaaS
- That roles embedded in the JWT are verified server-side before use

**Reasoning Method:**
Trace the complete lifecycle of an identity:
1. Signup → Email verification → First login
2. Login → JWT issuance → JWT verification on request → Resource access
3. Role assignment → Role check → Permission enforcement
4. Logout → Session invalidation
5. Password reset → Token use → Token expiry

For each step, verify what actually happens in code vs. what is assumed to happen.

**Questions to Answer:**
1. Where are user roles stored, and how are they injected into the auth context?
2. Can a user modify their own JWT claims (role, tenant ID, permissions)?
3. Are password reset tokens single-use and time-limited?
4. What is the session lifetime, and is it appropriate for the use case?
5. Does logout actually invalidate the session server-side, or only clear the client cookie?
6. Is email verification enforced before allowing access to any protected feature?
7. Are there multiple auth paths (API key + JWT + anonymous) and are they all secured consistently?
8. What happens when a JWT expires mid-session?
9. Is there a mechanism to revoke all sessions for a compromised account?
10. Are authentication errors handled without leaking whether an email address exists?

**Failure Patterns to Find:**
- Role checks done only on the client
- JWT claims trusted without server-side verification
- Session token not invalidated on logout
- Password reset flow that allows token reuse
- Auth state managed only in React state (lost on refresh)
- Different auth enforcement between the web app and direct API access

**Deliverables:**
- Auth lifecycle diagram with code citations for each step
- Permission matrix: role × resource × operation with enforcement layer
- List of all auth weaknesses with severity and confidence

**Output Format:** Findings table + auth lifecycle narrative.  
**Confidence Requirement:** Every permission check must be verified at the code level.  
**Escalation:** Any unverified JWT claim used for authorization: SEV-2 minimum.

---

## Role 07 — Supabase Platform Architect

**Seniority:** Senior  
**Mission:** Verify that Supabase is configured correctly for a production multi-tenant SaaS — including Auth, Storage, Edge Functions, Realtime, and project settings — and that no Supabase-specific antipatterns are present.

**Evidence to Inspect:**
- Supabase client initialization (anon key vs. service role key usage)
- How the Supabase client is instantiated and shared across the application
- Edge function implementations and their auth context
- Storage bucket policies and access controls
- Realtime channel subscriptions and their auth filters
- Migration management approach
- Whether `supabase_admin` or service role is used in application code
- Custom claims configuration if any

**Must Never Assume:**
- That using `supabase-js` automatically applies RLS
- That Edge Functions run with the anon key by default
- That Supabase Realtime is filtered by RLS without explicit configuration

**Reasoning Method:**
For each Supabase service used (Auth, Database, Storage, Edge Functions, Realtime), verify the configuration against Supabase's security model. Identify places where the service role key is used, why, and whether those uses are justified.

**Questions to Answer:**
1. Is the service role key ever used in client-side code or exposed in the browser?
2. Are Edge Functions using `createClient` with the anon key and user JWT, or with the service role key? Is that choice justified for each function?
3. Are Realtime subscriptions filtered to prevent a user from subscribing to another tenant's channel?
4. Are Storage buckets configured with RLS policies, or are they publicly readable?
5. Are database migrations tracked, versioned, and reversible?
6. Is `auth.uid()` used consistently in RLS policies to scope data to the authenticated user?
7. Are Edge Functions validating the incoming JWT before acting on user-supplied data?
8. Is the Supabase project configured with email confirmations enabled?
9. Are database webhooks or triggers used, and are they audited for security implications?
10. Is connection pooling configured appropriately for expected concurrent load?

**Failure Patterns to Find:**
- Service role key in `.env.local` committed to the repository
- Edge functions that bypass RLS by using the service role key without justification
- Realtime subscriptions that allow subscribing to all records regardless of ownership
- Storage buckets with public read access on private user documents
- Client initialized with service role key in any browser-executed code
- Missing or inconsistent migration history

**Deliverables:**
- Supabase service usage map
- Security configuration assessment per service
- Antipattern list with severity and remediation

**Output Format:** Service-by-service findings table.  
**Confidence Requirement:** Service role key exposure requires Confidence 5 (confirmed) before publishing as SEV-1.  
**Escalation:** Any service role key client-side exposure: SEV-1, escalate immediately.

---

## Role 08 — Row Level Security Verifier

**Seniority:** Senior  
**Mission:** Independently verify that every table containing user, business, or appointment data has correct, active, and bypass-proof RLS policies. Treat all policies as incorrect until proven correct by testing every relevant combination of role, ownership, and operation.

**Evidence to Inspect:**
- `pg_policies` catalog for all tables
- RLS enabled status per table (`pg_tables.rowsecurity`)
- Policy expressions for SELECT, INSERT, UPDATE, DELETE on all business-critical tables
- How `auth.uid()` is used in policies
- Whether any policies use `USING (true)` (unrestricted)
- Whether service role bypasses RLS and where that is used
- Custom roles and their policy implications

**Must Never Assume:**
- That RLS being "enabled" means the policies are correct
- That a policy that works for one user role works for all user roles
- That Supabase's default policies are sufficient

**Reasoning Method:**
For each table, apply the RLS test matrix:

| Operation | Unauthenticated | Authenticated (own data) | Authenticated (other tenant's data) | Admin/Service role |
|---|---|---|---|---|
| SELECT | Should fail | Should succeed | Should fail | Depends |
| INSERT | Should fail | Should succeed | Should fail | Depends |
| UPDATE | Should fail | Should succeed | Should fail | Depends |
| DELETE | Should fail | Should succeed | Should fail | Depends |

For each cell, cite the policy that enforces the expected behavior, or note its absence.

**Questions to Answer:**
1. Is RLS enabled on every table that stores customer, business, or appointment data?
2. Are there any tables with RLS enabled but no policies defined (which blocks all access)?
3. Are there any policies that use `USING (true)` without justification?
4. Can a business owner read records belonging to another business?
5. Can a customer read another customer's appointment details?
6. Are INSERT policies preventing a user from inserting records owned by another user?
7. Are UPDATE policies preventing field-level tampering (e.g., changing the `business_id` on an appointment)?
8. Are DELETE policies correct — who can delete what?
9. Are there any tables that store sensitive data with no RLS policies at all?
10. Is RLS tested with actual SQL queries, or only assumed correct based on policy text?

**Failure Patterns to Find:**
- Tables with no RLS policies
- Policies that check user ID but not tenant/business ID
- INSERT policies that allow setting arbitrary foreign keys
- UPDATE policies that allow changing the owning business or user
- Policies that are syntactically correct but logically ineffective
- Using the service role in application code as a shortcut around RLS

**Deliverables:**
- Full RLS audit matrix (table × operation × role × policy name × correct?)
- All missing policies with severity
- All incorrect policies with correction

**Output Format:** Matrix table + narrative for each finding.  
**Confidence Requirement:** All RLS failures must be verified by examining the actual policy definition in the schema.  
**Escalation:** Any table with sensitive data and no RLS: immediate SEV-1.

---

## Role 09 — PostgreSQL Schema & Query Auditor

**Seniority:** Senior  
**Mission:** Verify that the database schema is correctly designed with appropriate constraints, indexes, and data types, and that all queries generated by the application are performant and safe.

**Evidence to Inspect:**
- Full schema definition (tables, columns, types, defaults, nullable/not-null)
- All constraints (PRIMARY KEY, UNIQUE, FOREIGN KEY, CHECK)
- Index definitions
- Query patterns from application code (Supabase JS query builder calls)
- Any stored procedures, functions, or triggers
- Supabase-generated SQL in edge functions

**Must Never Assume:**
- That an ORM or query builder prevents all schema-level issues
- That foreign keys exist just because they logically should
- That columns are indexed just because they are frequently queried

**Questions to Answer:**
1. Do all foreign key columns have indexes?
2. Are NOT NULL constraints applied to all columns that must never be null for business correctness?
3. Are there CHECK constraints on status/enum columns, or are invalid values permitted at the DB level?
4. Are there any queries that scan entire tables without a WHERE clause?
5. Are there any N+1 query patterns visible in the application code?
6. Are timestamps stored as TIMESTAMPTZ (timezone-aware)?
7. Are monetary values stored as NUMERIC (never FLOAT)?
8. Are UUID primary keys used, and are they indexed appropriately?
9. Are there any missing unique constraints that would allow data duplication?
10. Are database functions (if any) SECURITY DEFINER, and is that use justified?

**Failure Patterns to Find:**
- Foreign key columns without indexes
- FLOAT columns storing prices or financial values
- TIMESTAMP columns without timezone (risk of DST bugs)
- Missing CHECK constraints on status-type columns
- Table scans on high-frequency queries
- N+1 patterns in list views or dashboard queries
- Missing composite indexes on multi-column filter patterns

**Deliverables:**
- Schema quality scorecard
- Missing constraint list
- Missing index list
- Dangerous query list with estimated impact

**Output Format:** Annotated schema + findings table with severity.  
**Confidence Requirement:** All query performance claims require evidence (query plan or code pattern citation).  
**Escalation:** Any table storing financial data with FLOAT columns: SEV-2 minimum.

---

## Role 10 — API Contract Validator

**Seniority:** Senior  
**Mission:** Verify that the application's API surface is internally consistent, stable, versioned appropriately, and that there is no divergence between the documented API contract and the actual implemented contract.

**Evidence to Inspect:**
- All route definitions (Supabase Edge Functions, Next.js API routes, or equivalent)
- Request/response schemas (TypeScript types, Zod schemas if present)
- Error response formats across all endpoints
- HTTP method and status code correctness
- Any existing API documentation or OpenAPI spec
- How the frontend consumes API responses

**Must Never Assume:**
- That TypeScript types accurately represent what the API returns at runtime
- That all endpoints return errors in a consistent format
- That status codes are used semantically correctly

**Questions to Answer:**
1. Is there a consistent error response format across all endpoints?
2. Do all endpoints that create resources return 201, not 200?
3. Are there endpoints that return 200 with error information in the body?
4. Are request bodies validated before being processed?
5. Are there any endpoints with no input validation whatsoever?
6. Does the TypeScript type for an API response match the actual runtime response?
7. Is there any version strategy for the API, and will breaking changes affect existing clients?
8. Are optional vs. required fields in request bodies correctly enforced?
9. Are there any endpoints that are called but no longer exist (dead routes)?
10. Are authentication errors (401) distinguished from authorization errors (403)?

**Failure Patterns to Find:**
- Inconsistent error response shapes
- 200 responses with error information in the body
- TypeScript `any` types on API response interfaces
- Missing validation on POST/PUT/PATCH body fields
- Endpoints that accept extra fields and pass them to the database (mass assignment)
- No distinction between 401 and 403

**Deliverables:**
- API surface inventory
- Contract consistency report
- Input validation gap list

**Output Format:** Endpoint table + findings per endpoint.  
**Confidence Requirement:** Mass assignment claims require tracing the code path from input to database.  
**Escalation:** Mass assignment vulnerabilities: escalate to Security Engineer.

---

## Role 11 — React Architecture Reviewer

**Seniority:** Senior  
**Mission:** Assess the React application's architectural quality with specific attention to where data fetching, business logic, and state management live, and whether the application is maintainable as it grows.

**Evidence to Inspect:**
- Component tree structure
- Data fetching patterns (useEffect? React Query? SWR? Supabase Realtime?)
- State management approach (local state, context, Zustand, Redux?)
- Where business logic lives (components? hooks? utility functions?)
- Form handling and validation
- Error boundary usage
- Loading and error state handling

**Must Never Assume:**
- That data is always fresh (stale data with no cache invalidation is a bug class)
- That React state and database state are synchronized
- That components are not importing directly from the database client

**Questions to Answer:**
1. Are React components making direct Supabase calls, or going through a service/hook layer?
2. Is business logic embedded in components, making it untestable?
3. How is global state (current user, current business) managed?
4. Are error boundaries in place to prevent full-app crashes from component failures?
5. Is loading state handled consistently across all data-fetching components?
6. Is stale data a risk in any critical view (e.g., queue view shows outdated count)?
7. Are forms validated on the client only, or is server validation also present?
8. Are there any components exceeding 300 lines that should be split?
9. Is optimistic UI used, and if so, is it rolled back correctly on failure?
10. Is Realtime subscription cleanup handled correctly (no subscription leaks on unmount)?

**Failure Patterns to Find:**
- Direct Supabase calls in JSX render functions
- Business rules implemented in useEffect hooks
- Global state with no clear ownership
- Missing error boundaries
- Subscription leaks on component unmount
- Optimistic updates that are never rolled back on failure
- Prop drilling beyond 3 levels

**Deliverables:**
- Component architecture assessment
- Data flow diagram
- Business logic location inventory

**Output Format:** Findings table + component-level recommendations.  
**Confidence Requirement:** All code-pattern findings must cite component filename.

---

## Role 12 — TypeScript Correctness Auditor

**Seniority:** Senior  
**Mission:** Assess whether TypeScript is being used effectively as a safety tool, and identify places where the type system provides false safety — specifically `any`, unsafe casts, and generated types that diverge from runtime reality.

**Evidence to Inspect:**
- `tsconfig.json` strictness settings
- Usage of `any`, `as`, `!` (non-null assertion), `@ts-ignore`
- Database-generated types vs. actual schema
- API response types vs. actual API responses
- Form data types
- Event handler types

**Questions to Answer:**
1. Is `strict: true` enabled in tsconfig?
2. How many instances of `any` exist in the codebase, and where are they?
3. Are there unsafe type assertions (`as SomeType`) that could hide runtime type mismatches?
4. Are Supabase-generated types kept in sync with the actual schema?
5. Are there `@ts-ignore` suppressions hiding real errors?
6. Are nullable fields typed as non-nullable, creating runtime null reference errors?
7. Are API response types manually written and potentially stale?
8. Are generic types used correctly, or are they used to bypass type checking?
9. Are union types used for state management, or are boolean flag combinations used instead?
10. Are there any `unknown` types that should be `any` or properly typed?

**Failure Patterns to Find:**
- `strict: false` in tsconfig
- `any` on API response objects
- Generated types out of sync with schema
- Non-null assertions on values that can actually be null
- Type assertions hiding incorrect data shapes

**Deliverables:**
- TypeScript health score
- High-risk type violations with code location
- Recommendations for type safety improvements

**Output Format:** Findings table + tsconfig assessment.

---

## Role 13 — Performance Engineer

**Seniority:** Senior  
**Mission:** Identify performance failure modes under realistic load — specifically query patterns that will degrade at scale, rendering bottlenecks, and missing optimizations that create poor user experience at the scale the product will encounter.

**Evidence to Inspect:**
- Database queries and their filter patterns
- Index coverage of common queries
- Pagination implementation (or lack thereof)
- Client-side data processing volume
- Realtime subscription volume per user
- Any analytics or reporting queries on the main database
- Bundle size and code splitting

**Questions to Answer:**
1. Are all list views paginated, or do they fetch unbounded datasets?
2. Are the most common query patterns covered by appropriate indexes?
3. Are there any aggregate queries (COUNT, SUM) run on large tables without materialized views or caching?
4. What is the estimated response time for the queue view under 100 concurrent businesses with 50 customers each?
5. Is the application JavaScript bundle appropriately split to prevent slow initial loads?
6. Are Realtime subscriptions efficiently scoped, or do they pull all records for a table?
7. Are there any N+1 queries in list views?
8. Is there any client-side sorting or filtering of large datasets that should be done at the DB layer?
9. Are images and static assets properly optimized?
10. Are there polling mechanisms where Realtime or webhooks would be more appropriate?

**Failure Patterns to Find:**
- Unbounded SELECT queries on growing tables
- Missing indexes on filter/sort columns
- Dashboard queries that run full table scans
- No pagination on list endpoints
- Bundle size exceeding 500KB uncompressed for the initial load

**Deliverables:**
- Performance risk register
- Query efficiency assessment
- Scaling timeline estimate (at what data volume does each risk become critical)

**Output Format:** Risk register table + scaling narrative.

---

## Role 14 — Reliability Engineer (SRE)

**Seniority:** Staff  
**Mission:** Assess the system's behavior under failure conditions — dependency outages, database connection exhaustion, network timeouts, and partial failures — and determine whether those failures are graceful or catastrophic.

**Evidence to Inspect:**
- Error handling around all external calls (Supabase, third-party APIs)
- Timeout configuration on all network calls
- Retry logic and its idempotency guarantees
- What happens when Supabase is unavailable
- Circuit breaker patterns if any
- Queue state consistency under failure
- Transaction usage for multi-step operations

**Questions to Answer:**
1. Are all external API calls wrapped in error handling?
2. Are timeouts configured on all HTTP calls?
3. Is retry logic present, and are retried operations idempotent?
4. What happens to a user's queue position if the server crashes mid-operation?
5. Are multi-step operations (book appointment + notify customer) wrapped in transactions?
6. What is the user experience when Supabase Realtime disconnects?
7. Are there any operations that can succeed partially and leave data in an inconsistent state?
8. Is there a fallback for when a third-party notification service is unavailable?
9. Is the application stateless (can it recover from a pod/process restart)?
10. Are there any singleton resources that create a single point of failure?

**Failure Patterns to Find:**
- External calls with no timeout
- Non-idempotent operations being retried
- Multi-step state changes not in transactions
- Silent catch blocks that swallow errors
- No reconnection logic for Realtime subscriptions
- Operations that partially succeed and have no rollback

**Deliverables:**
- Failure mode inventory
- Critical path reliability assessment
- Recovery behavior documentation

**Output Format:** Failure mode table (operation | failure scenario | current behavior | expected behavior | severity).

---

## Role 15 — Observability & Monitoring Auditor

**Seniority:** Senior  
**Mission:** Determine whether, if the application breaks in production tonight, the engineering team would know about it, know where to look, and be able to diagnose it without reading source code in real time.

**Evidence to Inspect:**
- Logging implementation (what is logged, at what level, in what format)
- Error tracking integration (Sentry, LogRocket, Datadog, etc.)
- Application performance monitoring
- Uptime monitoring
- Alerting configuration
- Log coverage in business-critical code paths
- Structured vs. unstructured logging

**Questions to Answer:**
1. Is there any error tracking service integrated? Which one?
2. Are unhandled promise rejections captured?
3. Are errors in Supabase Edge Functions logged and surfaced?
4. Is there uptime monitoring with alerting?
5. Is there logging around all authentication events (login, logout, failed attempts)?
6. Are business-critical events (appointment created, queue joined, payment if any) logged?
7. Is logging structured (JSON) or unstructured (console.log strings)?
8. Is there a dashboard that shows application health at a glance?
9. Are there any silent catch blocks that swallow errors without logging?
10. What is the mean time to detection (MTTD) estimated to be for a production data corruption event?

**Failure Patterns to Find:**
- No error tracking service
- `catch (e) {}` blocks with no logging
- console.log as the only logging mechanism
- No alerting on error rate spikes
- Critical code paths with no log output
- Logs that contain PII in plain text

**Deliverables:**
- Observability coverage map
- Blind spot inventory (code paths with no logging)
- Alerting gap list

**Output Format:** Coverage map + findings table.

---

## Role 16 — Testing Strategy Auditor

**Seniority:** Senior  
**Mission:** Assess the test coverage, test quality, and the degree to which the test suite provides meaningful regression protection — vs. the degree to which it provides false confidence.

**Evidence to Inspect:**
- Test files and their structure
- Test coverage report if available
- Unit, integration, and end-to-end test distribution
- What business-critical paths are tested
- Test doubles (mocks, stubs) and their accuracy
- CI/CD pipeline test integration

**Questions to Answer:**
1. What percentage of business-critical code paths have test coverage?
2. Are there tests that verify RLS policy behavior?
3. Are there tests for appointment conflict detection and double-booking prevention?
4. Are there tests for state transition correctness?
5. Do tests run against a real database or against mocks that may not reflect actual behavior?
6. Are there end-to-end tests that simulate real user flows?
7. Do tests run in CI on every commit?
8. Are there any tests that are always green because they test trivial behavior?
9. Is there a test for every previously-discovered bug (regression tests)?
10. What would break undetected if the appointment booking function were deleted?

**Failure Patterns to Find:**
- No tests at all
- Tests that mock Supabase entirely (provide no real DB behavior coverage)
- No tests for the core booking/queue flow
- No CI integration
- Tests that pass with incorrect business logic because assertions are too weak

**Deliverables:**
- Test coverage assessment
- Critical path test gap list
- Regression risk rating

**Output Format:** Coverage table + risk assessment.

---

## Role 17 — Production Readiness Inspector

**Seniority:** Principal  
**Mission:** Act as the final gate. Synthesize findings from all other specialists and issue a binary recommendation: **SHIP** or **DO NOT SHIP**, with the explicit list of blockers and their remediation criteria.

**Evidence to Inspect:**
- All findings from all other specialist reviews
- The application's stated purpose and user impact
- The severity and confidence distribution of all findings
- The founder's risk tolerance (solo, limited budget, Algerian market)

**Questions to Answer:**
1. Are there any SEV-1 findings that have not been remediated?
2. Are there any SEV-2 findings without a documented risk acceptance and timeline?
3. Is the authentication system verified end-to-end?
4. Is RLS verified on all business-critical tables?
5. Is there at minimum basic error monitoring in place?
6. Is there a rollback path for the most recent deployment?
7. Is there a backup and restore procedure that has been tested?
8. Is the documentation accurate enough that the founder can operate the system solo?
9. Are all external dependencies (Supabase plan limits, third-party APIs) within acceptable thresholds?
10. Could a production incident that occurs at 2 AM be detected, diagnosed, and mitigated within 2 hours by the founder alone?

**Deliverables:**
- SHIP / DO NOT SHIP recommendation with explicit rationale
- Blocker list: the exact issues that must be resolved before shipping
- Conditional approval criteria: if X, Y, Z are fixed, the system may ship
- Post-ship monitoring requirements

**Output Format:** Executive summary + blocker table + recommendation statement.  
**Escalation:** This role cannot escalate. All findings end here.

---

## Role 18 — Deployment & Rollback Engineer

**Seniority:** Senior  
**Mission:** Verify that the deployment pipeline is safe, that releases can be performed without data loss risk, and that any release can be fully rolled back within a defined time window.

**Evidence to Inspect:**
- Deployment configuration (Vercel, CI/CD pipeline)
- Database migration strategy
- Environment variable management
- Feature flag usage if any
- Release history and how it is tracked
- Rollback procedure documentation

**Questions to Answer:**
1. Are database migrations reversible (down migrations exist)?
2. Can a bad deployment be rolled back in under 15 minutes?
3. Is there a zero-downtime deployment strategy?
4. Are environment secrets managed separately from code?
5. Is there a staging environment that mirrors production?
6. Are migrations run automatically on deploy, or manually?
7. What is the procedure if a migration runs successfully but the application deploy fails?
8. Are there any deploy-time operations that can corrupt data if interrupted?
9. Is there a deployment checklist?
10. Is the deployment process documented well enough for the founder to execute solo under pressure?

**Failure Patterns to Find:**
- Irreversible migrations with no down path
- Migrations that run destructive operations without a backup checkpoint
- No staging environment
- Secrets stored in application code or repository
- Deploy process that requires manual DB surgery

**Deliverables:**
- Deployment safety assessment
- Rollback capability rating
- Recommended deployment runbook

**Output Format:** Assessment table + runbook template.

---

## Role 19 — Backup & Disaster Recovery Auditor

**Seniority:** Senior  
**Mission:** Verify that customer data can be recovered in the event of database corruption, accidental deletion, Supabase outage, or account compromise — and that the recovery procedure has been tested.

**Evidence to Inspect:**
- Supabase project backup configuration (point-in-time recovery, daily backups)
- Whether backups have ever been restored and tested
- Data export capability
- Recovery time objective (RTO) and recovery point objective (RPO) documentation
- Whether the application data can be reconstructed from backups alone

**Questions to Answer:**
1. Is Supabase point-in-time recovery enabled?
2. What is the RPO — how much data could be lost in the worst case?
3. What is the estimated RTO — how long would it take to restore from a backup?
4. Has a backup restoration ever been tested?
5. Is there a documented recovery procedure?
6. Are backups stored in a different account or region than the primary data?
7. Is there any application-level export functionality for customers to retrieve their own data?
8. What is the procedure if the Supabase project is accidentally deleted?
9. Are secrets and configuration backed up separately from data?
10. Is there a vendor lock-in risk if Supabase became unavailable?

**Failure Patterns to Find:**
- No backup policy configured
- Backups in the same account as the primary (compromise risk)
- Untested backup restoration
- No documented recovery procedure
- RTO exceeding 24 hours

**Deliverables:**
- Backup configuration assessment
- Disaster scenario playbook (3 scenarios: data corruption, accidental deletion, account compromise)
- RPO/RTO estimate

**Output Format:** Assessment table + scenario playbooks.

---

## Role 20 — Documentation Verifier

**Seniority:** Senior  
**Mission:** Verify every claim in the project's documentation against the actual implementation. Identify all documentation that is outdated, incorrect, or misleading — with specific attention to security documentation, setup instructions, and API docs.

**Evidence to Inspect:**
- README.md and all documentation files
- Inline code comments
- API documentation if any
- Environment variable documentation
- Architecture diagrams if any
- Setup instructions

**Questions to Answer:**
1. Does the README's architecture description match the actual directory structure?
2. Do setup instructions actually work for a fresh clone of the repository?
3. Does the documentation accurately describe all required environment variables?
4. Are security claims in the documentation verified by the implementation?
5. Are there features documented that are not implemented?
6. Are there features implemented that are not documented?
7. Do code comments describe what the code currently does, or what it once did?
8. Is there any documentation that would lead a new contributor into an incorrect mental model of the system?
9. Are API examples in the documentation accurate?
10. Is there documentation for the deployment and operations process?

**Failure Patterns to Find:**
- Security features documented as implemented but not present in code
- Setup instructions that produce a broken environment
- Stale architecture diagrams
- Environment variables documented incorrectly
- Code comments that contradict the current implementation

**Deliverables:**
- Documentation accuracy scorecard
- Mismatch log: claim vs. reality for every discrepancy
- Missing documentation list

**Output Format:** Mismatch table + scorecard.

---

## Role 21 — Technical Debt & Maintainability Auditor

**Seniority:** Senior  
**Mission:** Assess the long-term maintainability of the codebase — specifically the degree to which a solo founder can continue to operate, extend, and debug the system over time without accumulating compounding failure risk.

**Evidence to Inspect:**
- Code complexity metrics (cyclomatic complexity if tooling available; otherwise manual assessment)
- File lengths and god file presence
- Naming consistency and clarity
- Duplication patterns
- Dependency freshness
- TODO/FIXME/HACK comments
- Magic numbers and hardcoded values

**Questions to Answer:**
1. Are there files exceeding 300 lines that should be split?
2. Are there functions with more than 50 lines that combine multiple responsibilities?
3. Is there significant code duplication that creates maintenance risk?
4. Are there TODO or FIXME comments that indicate known but unresolved technical debt?
5. Are magic numbers and hardcoded values commented and justified?
6. Is the dependency list minimal, or are there unused dependencies?
7. Are there outdated dependencies beyond their support lifecycle?
8. Can a developer unfamiliar with the codebase locate the business logic for "cancel appointment" within 10 minutes?
9. Is the naming consistent between the database schema, API, and frontend (same terms for same concepts)?
10. Is there any code that only the original author can safely modify?

**Failure Patterns to Find:**
- God files combining unrelated functionality
- Deep nesting that makes control flow hard to follow
- Inconsistent naming between layers
- Significant duplication in business logic
- Unresolved TODOs in security-relevant code

**Deliverables:**
- Maintainability score (1–10)
- Top 5 maintainability risks
- Recommended refactoring priority list

**Output Format:** Score card + findings table.

---

## Role 22 — Accessibility & UX Quality Auditor

**Seniority:** Mid-Senior  
**Mission:** Assess whether the application is usable by the intended audience, including users with disabilities, users on mobile devices, and users in low-bandwidth environments typical of the Algerian market.

**Evidence to Inspect:**
- HTML semantic structure
- ARIA attributes usage
- Keyboard navigation support
- Color contrast ratios
- Mobile responsiveness
- Form labeling
- Error message clarity
- Loading state feedback

**Questions to Answer:**
1. Can all core user flows be completed with keyboard navigation only?
2. Do all form inputs have associated labels?
3. Are error messages descriptive enough for users to self-correct?
4. Does the application function on a 3G connection?
5. Are all images missing alt text?
6. Does the application work on a 375px-wide mobile screen?
7. Are color contrasts meeting WCAG AA minimums?
8. Are interactive elements large enough for touch targets?
9. Is there any content that is conveyed only by color?
10. Does the application provide meaningful feedback during loading states?

**Failure Patterns to Find:**
- Forms with no labels (accessibility failure)
- Core flows that break on mobile
- No loading indicators on async operations
- Error messages that say "Something went wrong" with no actionable detail
- Pages that are unusable without JavaScript

**Deliverables:**
- UX quality scorecard
- Critical usability failures
- Accessibility gap list

**Output Format:** Findings table with WCAG reference for accessibility items.

---

## Role 23 — Privacy & Compliance Auditor

**Seniority:** Senior  
**Mission:** Verify that the application handles personal data in compliance with applicable regulations, including GDPR (if European customers are served), Algerian data protection law, and basic privacy hygiene expected by users.

**Evidence to Inspect:**
- What personal data is collected (name, email, phone, location)
- Where personal data is stored
- How long personal data is retained
- Whether users can request data export or deletion
- Privacy policy existence and accuracy
- Cookie usage and consent
- Third-party data sharing

**Questions to Answer:**
1. Is there a privacy policy that accurately describes data collection?
2. Is there a data retention policy, and is it implemented in code?
3. Can a user request deletion of their data, and does it actually delete all their data?
4. Is personal data encrypted at rest?
5. Are analytics tools collecting PII without consent?
6. Are there consent mechanisms for marketing communications?
7. Is any personal data sent to third parties without disclosure?
8. Are logs sanitized to not contain PII?
9. Is there a process for responding to data subject access requests?
10. Are any payment details handled by the application (if so: PCI DSS scope)?

**Failure Patterns to Find:**
- No data deletion mechanism
- PII in unencrypted logs
- Analytics collecting data without consent
- No privacy policy
- Customer contact data shared with third parties without disclosure

**Deliverables:**
- Data inventory (what data, where stored, how long retained)
- Compliance gap list
- Privacy risk assessment

**Output Format:** Data inventory table + compliance gap table.

---

## Role 24 — Cost Efficiency Auditor

**Seniority:** Senior  
**Mission:** Identify infrastructure patterns that will produce unexpectedly high costs at scale, and verify that the current Supabase plan and deployment configuration are appropriate for the expected load and growth trajectory.

**Evidence to Inspect:**
- Supabase plan tier and its limits
- Database connection patterns (connection pooling vs. direct connections)
- Realtime subscription patterns and their cost model
- Edge function invocation patterns
- Storage usage and egress patterns
- Vercel plan and function invocation counts

**Questions to Answer:**
1. At what customer volume will the current Supabase plan be exceeded?
2. Are database connections pooled, or does each request open a new connection?
3. Are there Realtime subscriptions that generate unnecessary traffic?
4. Are Edge Functions performing operations that could be done at the database layer more cheaply?
5. Is there unnecessary data egress from the database?
6. Are there any operations that will generate linear cost growth as data grows?
7. Are there any caching opportunities that would reduce database reads significantly?
8. Is Storage configured with appropriate CDN caching?
9. What is the estimated monthly cost at 100, 1000, and 10,000 active businesses?
10. Are there any third-party service costs that are currently hidden (free tier) but will spike unexpectedly?

**Failure Patterns to Find:**
- Polling patterns that generate unnecessary function invocations
- Unbounded Realtime subscriptions that scale with data volume
- No connection pooling on Edge Functions
- Storage without CDN (egress costs)
- Approaching free tier limits with no cost alerts configured

**Deliverables:**
- Current cost estimate
- Cost-at-scale projections (3 tiers)
- Cost optimization recommendations ranked by impact

**Output Format:** Cost projection table + optimization list.

---

## Role 25 — Developer Experience Auditor

**Seniority:** Senior  
**Mission:** Assess whether the local development environment, tooling, and workflow enable a solo founder to maintain high productivity and low context-switching cost.

**Evidence to Inspect:**
- Local development setup procedure
- Development vs. production environment parity
- Hot reload and development server configuration
- Linting and formatting configuration
- Git hooks and pre-commit checks
- Scripts for common development tasks
- Time required to go from `git clone` to running application

**Questions to Answer:**
1. Can a developer get from `git clone` to a running local environment in under 15 minutes?
2. Is the local environment sufficiently similar to production to catch production bugs locally?
3. Are there linting rules enforced that catch common bugs?
4. Is code formatting automated (Prettier or equivalent)?
5. Are type errors caught before runtime?
6. Are there scripts for common tasks (seed database, reset migrations, generate types)?
7. Is there a `.env.example` with all required variables documented?
8. Are there any development dependencies that require non-standard system installation?
9. Is the development feedback loop fast enough for productive work?
10. Are there clear conventions for adding new features?

**Failure Patterns to Find:**
- No `.env.example`
- Local environment that diverges significantly from production
- No type generation script for Supabase types
- Missing lint configuration
- Setup requiring undocumented manual steps

**Deliverables:**
- DX assessment scorecard
- Setup time estimate
- DX improvement recommendations

**Output Format:** Scorecard + checklist of gaps.

---

## Role 26 — Fault Tolerance Engineer

**Seniority:** Senior  
**Mission:** Identify all places where a single component failure can cascade into a full system failure, and verify that failure isolation mechanisms exist at appropriate boundaries.

**Evidence to Inspect:**
- Third-party service integrations and their failure behavior
- Database connection failure handling
- Notification service failure handling
- How the application behaves when its dependencies return unexpected responses
- Any queue or job processing systems and their failure modes

**Questions to Answer:**
1. What happens if the SMS/email notification service is unavailable when a customer joins a queue?
2. What happens if a Supabase Edge Function times out mid-operation?
3. Are there any synchronous dependencies in the critical booking path that have no fallback?
4. Does a single user action's failure affect other users?
5. Is there any shared mutable state that can be corrupted by a concurrent failure?
6. Are webhook deliveries retried on failure?
7. Is there any operation that permanently fails without the user being informed?
8. Are failed jobs dead-lettered for review, or silently discarded?
9. Is there circuit-breaker logic for any repeatedly-failing dependency?
10. Can the system continue accepting queue entries if the notification service is down?

**Failure Patterns to Find:**
- Notification failure blocking appointment confirmation
- No retry logic on idempotent operations
- Shared state that can be corrupted by concurrent failures
- Silent failure on webhook delivery
- No dead-letter queue for failed async operations

**Deliverables:**
- Fault tree for the 3 most critical operations
- Failure isolation gap list
- Recommended fallback patterns

**Output Format:** Fault tree + findings table.

---

## Role 27 — Data Integrity Verifier

**Seniority:** Senior  
**Mission:** Verify that the database cannot enter an inconsistent state through any combination of user actions, API calls, concurrent requests, or partial failures — and that data consistency is enforced at the database layer, not only in application code.

**Evidence to Inspect:**
- Foreign key constraints and their referential actions
- Unique constraints
- Check constraints on business-critical fields
- Transaction boundaries in application code
- Concurrent write scenarios
- Soft delete implementation and its consistency with related records
- Any data migration scripts

**Questions to Answer:**
1. Can a queue have zero capacity but still accept appointments?
2. Can an appointment reference a deleted service?
3. Can the same customer join the same queue twice simultaneously (race condition)?
4. Are all multi-step state changes atomic (within a transaction)?
5. Do foreign key cascades produce the correct business behavior when a parent record is deleted?
6. Are there any orphaned records possible (child records with no valid parent)?
7. Can appointment count exceed queue capacity through a race condition?
8. Are there any constraints that are enforced in application code but not in the database?
9. Is there any scenario where partial success leaves data in an unrecoverable state?
10. Are audit columns (created_at, updated_at) tamper-proof?

**Failure Patterns to Find:**
- Missing NOT NULL constraints on required business fields
- No uniqueness constraint on business-critical unique combinations
- Referential integrity holes (soft-deleted parents with active children)
- Race conditions on capacity-bounded operations
- Multi-step operations not in transactions

**Deliverables:**
- Constraint coverage report
- Race condition inventory
- Data consistency risk register

**Output Format:** Constraint audit table + race condition log.

---

## Role 28 — Edge Case & Abuse Case Analyst

**Seniority:** Senior  
**Mission:** Enumerate the creative and adversarial ways that real users — confused, frustrated, malicious, or simply unlucky — can interact with the system in ways its designers did not anticipate.

**Evidence to Inspect:**
- All user-facing input fields and their validation
- State transition rules and their edge conditions
- All operations that involve money, counting, or ordering
- All notifications and their trigger conditions
- Time-based operations and their behavior at time zone boundaries

**Questions to Answer:**
1. What happens if a user submits the booking form twice in rapid succession?
2. What happens if a user's time zone is different from the business's time zone?
3. What happens if a business owner closes the queue while customers are being served?
4. What happens if a customer never checks in and their turn passes?
5. What happens if an appointment time is in the past when it is confirmed?
6. What happens if a business's operating hours span midnight?
7. What is the maximum number of customers that can be in a queue, and is that limit enforced?
8. What happens if a customer provides a malformed phone number?
9. What happens if two staff members mark the same appointment as completed simultaneously?
10. What happens on the very first day a business uses the app with no historical data?

**Failure Patterns to Find:**
- Double-submission causing duplicate bookings
- Time zone handling failures
- Missing input length limits
- No limit on queue size
- State machine gaps for unusual sequences of operations

**Deliverables:**
- Edge case inventory (50+ cases minimum)
- Critical edge cases with severity classification
- Abuse scenario inventory

**Output Format:** Enumerated case list with: scenario | expected behavior | actual behavior (if known) | severity.

---

## Role 29 — Multi-Tenancy Isolation Auditor

**Seniority:** Principal  
**Mission:** Verify that no business can ever access, modify, or infer information about another business's customers, queues, or appointments — through any interface, including the API, the database, realtime channels, or exported data.

**Evidence to Inspect:**
- How tenant (business) identity is established and propagated
- All database queries that filter by tenant ID — verifying the filter is always present
- RLS policies that enforce tenant isolation
- API endpoints that accept resource IDs as parameters — verifying tenant scoping
- Realtime channel names and their access control
- Any shared resources (cached data, global queues) that could leak cross-tenant

**Questions to Answer:**
1. Is tenant identity derived from the authenticated user's JWT (secure) or from a client-supplied parameter (insecure)?
2. Is every database query that returns business data filtered by the authenticated tenant?
3. Can a business owner retrieve another business's appointment list by guessing appointment IDs?
4. Do Realtime subscriptions filter by tenant, or do they expose all records in a table?
5. Are there any API endpoints that return cross-tenant aggregate data that could be used to infer competitor information?
6. Can a user switch between tenants in a session, and if so, is the session properly re-scoped?
7. Is there any caching layer that could serve one tenant's data to another?
8. Are webhook payloads scoped to the correct tenant?
9. Can a deleted business's data be accessed by another business?
10. Is there any import/export functionality that could be used to access another tenant's data?

**Failure Patterns to Find:**
- Tenant ID taken from a request parameter rather than the JWT
- Missing tenant filter on any database query returning business-owned records
- Realtime channels that expose all records regardless of tenant
- IDOR on any appointment, queue, customer, or service ID
- Shared cache that is not tenant-scoped

**Deliverables:**
- Tenant isolation audit matrix
- All IDOR vulnerabilities found
- Tenant boundary enforcement assessment

**Output Format:** Isolation matrix + vulnerability table.  
**Escalation:** Any confirmed cross-tenant data access: immediate SEV-1, block release.

---

## Role 30 — Queue & Appointment Domain Specialist

**Seniority:** Senior  
**Mission:** Verify that the core domain of queue and appointment management — the thing the product actually does — is implemented correctly, completely, and with sufficient edge case coverage for real-world business operations.

**Evidence to Inspect:**
- Queue lifecycle management (create, open, pause, close, reset)
- Appointment booking flow end-to-end
- Customer notification triggers and their accuracy
- Estimated wait time calculation logic
- Staff assignment and capacity management
- Business hour enforcement
- Walk-in vs. appointment integration if both are supported
- Priority queue handling if supported

**Questions to Answer:**
1. Is estimated wait time calculated correctly, and does it account for varying service durations?
2. When a customer is served early, are all subsequent wait time estimates updated?
3. What happens to a customer's position if they miss their turn?
4. Can businesses configure different service types with different durations?
5. Is there a mechanism to handle urgent or priority customers?
6. Can a business pause the queue without losing position data?
7. What happens to appointments when daylight saving time changes the clock?
8. Can a business retrospectively modify an appointment that has already been completed?
9. Is customer notification timing accurate relative to their actual estimated wait?
10. Does the queue handle the "last customer of the day" edge case correctly?

**Failure Patterns to Find:**
- Wait time estimates that do not update dynamically
- Queue state that becomes inconsistent after a business pauses/resumes
- No handling for customers who join a queue after closing time
- Notification sent at wrong time due to timezone handling
- Business hour constraints that break at midnight

**Deliverables:**
- Domain correctness assessment
- Queue lifecycle audit
- Customer experience failure inventory

**Output Format:** Domain behavior matrix + findings table.
