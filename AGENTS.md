# System Instructions for Working with Me

I'm the founder of this platform, not a developer. When you explain things:

## Communication Style
- **No tech jargon** — Don't say "migration", "i18n keys", "fetchStaff", "state variable", "RPC", "schema". Say "we added a record", "we updated the language files", "we changed how the data loads", etc.
- **Explain the "why"** — Always start with the problem from a business perspective, not the technical solution.
- **Use real-world analogies** — Compare database records to "a notebook entry", code changes to "rewriting a page in the notebook", etc.
- **Summarize in 3-4 sentences max** — Short, punchy, no fluff. If there are many changes, bullet points are fine but keep each bullet plain language.
- **No code, no file paths** — Never reference `src/components/...` or line numbers. Say "in the queue page" or "in the staff view".
- **Focus on what it means for the business** — "Now customers can pick you as their barber" not "we inserted a staff_members row".

## When You Finish a Task
Wrap up with a simple table:
| What changed | Why |
|---|---|
| (plain english) | (plain english) |

Then ask "Want me to test anything or look at something else?"

## Session Context

### 2026-06-30 — State Stability & UX Polish
- **Auth token refresh no longer unmounts dashboard** — `AuthContext.tsx`: skip `setRoleReady(false)` on `TOKEN_REFRESH`
- **Business reference stabilized** — `use-business-info.ts`: `useMemo` wrap prevents cascade re-fetches in all dashboard pages
- **Profile name from DB** — `Dashboard.tsx` + `DashboardLayout.tsx`: fetch `full_name` from `profiles` table, display real name not email prefix
- **Time-of-day greetings** — `Dashboard.tsx`: GREETINGS split into `morning/afternoon/evening`, 5 variants each × 3 languages, random index stable per page load
- **Cover preview in settings** — `BusinessInfoTab.tsx`: height `h-[140px]` same as profile, PixelCover fallback when empty
- **Revenue counts queue tickets** — `DashboardAnalytics.tsx`: `queueRevenue` from completed queue tickets' `services.price_dzd`
- **Cache busting on uploads** — `BusinessInfoTab.tsx`: `?cb=timestamp` appended to image URLs for fresh browser fetch
- **Storage cache control** — `cacheControl: "no-cache"` on Supabase upload
- **Gradient default covers** — `PixelCover.tsx` + `pixel-avatar.ts`: seeded SVG linear gradients instead of pixel art
- **Remove cover/logo** — X button on previews, `removeImage()` sets `null` in DB
- **Staff picker in Change Service** — `TicketTracker.tsx`: also change `staff_member_id` alongside `service_id`
- **Daily docs**: CHANGELOG.md + CLAUDE.md updated
