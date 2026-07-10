# Futfi8 — Project Overview

A mobile-first, real-time football community platform. Fans join locker rooms for their Premier League club, post takes, participate in live match threads, and raid rival locker rooms after wins.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, RSC) |
| Database | PostgreSQL via Supabase (RLS on every table) |
| Auth | Supabase Auth (email + password, Google OAuth) |
| Realtime | Supabase Realtime (WebSocket, narrow subscriptions) |
| UI | Tailwind CSS 4, custom dark-first design tokens |
| External APIs | API-Football (match data), Perspective API (toxicity), Nodemailer (email SMTP) |

---

## `.agent` File Map

### `rules/` — Always-on conventions & constraints (20 files)
| File | Covers |
|---|---|
| `auth.rules.md` | Supabase SSR setup, OAuth flow, middleware, onboarding guard, age gate, rate limits |
| `api-conventions.rules.md` | Response envelopes, error codes, Zod validation, pipeline template |
| `database-schema.rules.md` | All table definitions, relations, indexes, RLS |
| `database-mechanics.rules.md` | Triggers, realtime subscription matrix, denormalization |
| `design-system.rules.md` | Color tokens, typography scale, motion, component patterns, layout breakpoints |
| `security.rules.md` | NDPR/GDPR, Perspective API config, three-strike system, ban enforcement |
| `error-handling.rules.md` | Client fetch wrapper, error message mapping, server logging |
| `performance.rules.md` | RSC-first, dynamic imports, virtual scrolling, font optimization |
| `realtime.rules.md` | Channel naming, subscription lifecycle, optimistic mutations, connection recovery |
| `football-api.rules.md` | API-Football wrapper, retry/backoff, status mapping, polling cron |
| `notifications.rules.md` | Notification registry, copy lexicon, preference schema, email via Nodemailer |
| `access-control.rules.md` | Post access matrix, raid eligibility, moderation permissions |
| `testing.md` | Vitest + RTL, mock patterns, coverage targets, per-route test requirements |
| `deployment.md` | Vercel config, CI pipeline, production deploy workflow, rollback |
| `local-development.md` | Supabase local vs cloud, seed data, ethereal email, troubleshooting |
| `component-architecture.md` | Server vs Client decision tree, split pattern, hooks conventions |
| `middleware.md` | Auth guard, onboarding guard, ban check, cron security, route classification |
| `state-management.md` | useState, URL state, Context boundaries, optimistic update pattern |
| `observability.md` | Structured logging, cron health checks, Vercel error tracking |
| `migrations.md` | Supabase migration workflow, types regeneration, rollback strategy |
| `seo.md` | Metadata template, OG images, sitemap, JSON-LD, canonical URLs |
| `a11y.md` | WCAG 2.1 AA, keyboard nav, ARIA, contrast compliance, touch targets |

### `Skills/` — Feature implementation guides (12 files)
| File | Covers |
|---|---|
| `raid-mechanic.skill.md` | Full raid lifecycle, RPC, eligibility snapshot, Fan Cred outcomes |
| `background-jobs.skill.md` | All 6 cron jobs with schedules, auth, idempotency rules |
| `edge-cases.skill.md` | 21 catalogued edge cases with handling logic |
| `fan-cred-score.skill.md` | Scoring formula, badges, recalculation, streak bonus |
| `moderation.skill.md` | 3-layer moderation, strike system, ban enforcement |
| `onboarding.skill.md` | 4-step flow (sign-up → club → username → welcome) |
| `hot-take-board.skill.md` | Global feed, sort/club filter, realtime, digest integration |
| `match-thread.skill.md` | Thread lifecycle, phases, auto-creation, closing logic |
| `locker-room.skill.md` | Core feed, tabs, data fetching, raid banner, composer |
| `navigation.skill.md` | Route map, bottom nav, deep links, app shell layout |
| `club-profiles.skill.md` | Club data, seed SQL, API routes, crest assets, UI components |
| `user-profile.skill.md` | Public/own profile, avatar upload, club switch, post history |

---

## Key Concepts

| Concept | Summary |
|---|---|
| Locker Room | One per club. Members-only posting. Core social unit. |
| Raid | After a decisive win, raiders (pre-kickoff members) get 2hrs × 1 post in the loser's room. |
| Fan Cred | Per-club reputation. Upvotes + streaks + raid wins = score. Badges at 100/500/1000/2000. |
| Match Thread | Auto-opens at kickoff, closed at full-time. One thread per club per match. |
| Hot Take Board | Global, all auth'd users. Sorted by upvotes. |

---

## Design Constraints

- **Mobile-first:** Primary target is 390px viewport (iPhone 14). Desktop is secondary.
- **Dark-first:** Base `#0D0D0F`, elevation via lightness, not shadows.
- **Fonts:** Barlow Condensed (display), Plus Jakarta Sans (body), Space Mono (label).
- **Accent:** Purple `#9B6EFF` — raid indicators, CTAs, active states.
- **Voice:** Direct, tribal, never corporate.
