---
trigger: always_on
---

# Observability — Logging, Monitoring & Alerting

## Logging Conventions

### Server-Side Logging

Every API route and cron job uses structured logging with context:

```ts
// Good — structured, traceable
console.error('[ROUTE] [POST /api/posts]', {
  userId: user?.id,
  action: 'create_post',
  errorCode: error.code,
  context: { locker_room_id, post_type: type },
})

// Bad — no context, no route identifier
console.error('Error:', error)
```

### Log Format

```
[LEVEL] [ROUTE] [ACTION] { context }
```

| Level | When | Example |
|---|---|---|
| `console.info` | Successful operations, state transitions | `[INFO] [cron/close-raid-windows] Closed { raidWindowId }` |
| `console.warn` | Expected failures, degredations | `[WARN] [Perspective API Fallback] { error }` |
| `console.error` | Unexpected failures, exceptions | `[ERROR] [POST /api/posts] { userId, errorCode, context }` |

### What to Never Log

- Raw JWT tokens or session cookies
- User passwords or email addresses
- Raw request body content (log sanitised summaries)
- `SUPABASE_SERVICE_ROLE_KEY` or any secret
- Perspective API key

### Mandatory Log Fields

Every log entry should include when available:
- Route/method identifier (e.g. `[POST /api/posts]`)
- User ID (never email or username)
- Error code (if applicable)
- Relevant entity IDs (post_id, raid_window_id, match_id)
- `startedAt` / `finishedAt` for cron jobs

## Cron Job Health Monitoring

Every cron job returns a structured result object:

```ts
interface CronResult {
  startedAt: string
  finishedAt: string
  processed?: number
  skipped?: boolean
  closed?: number
  sent?: number
  updated?: number
  failed: number
  errors: string[]
  // Per-job fields vary
}
```

### Failure Classification

| Condition | HTTP Status | Vercel Behaviour |
|---|---|---|
| `failed > 0 && processed === 0` | `500` | Vercel retries (up to 3 times) |
| `failed > 0 && processed > 0` | `200` | No retry — partial failure logged |
| `failed === 0` | `200` | Success |

### Cron Job Health Checks

Check the Vercel Dashboard > Cron Jobs tab after every deployment:
- Did all 6 jobs fire?
- Any 500 responses?
- Duration within expected range?

Each job's expected duration:
| Job | Expected | Max |
|---|---|---|
| `poll-matches` | <5s | 30s |
| `close-raid-windows` | <3s | 30s |
| `open-match-threads` | <5s | 30s |
| `sync-fixtures` | <10s | 60s |
| `recalculate-cred` | <30s | 60s |
| `weekly-digest` | <30s | 60s |

## Error Tracking

### Vercel Error Tracking (Built-in)

Vercel captures unhandled exceptions and `console.error` calls automatically:
- **Source:** Vercel Dashboard > Errors
- **Retention:** 7 days on Pro plan
- **Use:** Monitor for new errors after each deploy

### Manual Error Reporting

For critical failures that need immediate attention — log with `ERROR` level and include enough context to debug:

```ts
console.error('[CRITICAL] [cron/poll-matches] All fixtures failed', {
  startedAt: results.startedAt,
  totalFixtures: apiFixtures.length,
  errors: results.errors,
})
```

Post-MVP, replace with a service like Sentry.

## Realtime Connection Monitoring

Connection state is surfaced in the UI for debugging:

```tsx
// In RealtimeContext
const [status, setStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected')

// Subscribe handler
channel.subscribe((status) => {
  if (status === 'SUBSCRIBED') setStatus('connected')
  if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setStatus('disconnected')
})

// UI indicator (dev only — hide in production)
{process.env.NODE_ENV === 'development' && status !== 'connected' && (
  <div className="fixed top-0 left-0 right-0 bg-loss text-white text-center text-label-sm py-1 z-50">
    Realtime disconnected. Attempting to reconnect...
  </div>
)}
```

## Uptime Monitoring (Post-MVP)

Set up external monitoring for critical paths:

| Check | Frequency | Service |
|---|---|---|
| Homepage loads | 5 min | Better Uptime / Pingdom |
| Auth flow | 15 min | Playwright scheduled check |
| Cron job firing | Per Vercel check | Vercel Cron tab |
| API-Football quota | Daily manual | RapidAPI dashboard |

## Observability Rules

1. Every API route and cron job wraps its body in try/catch — no unhandled rejections
2. Logs include route identifier, user ID, and relevant entity IDs — never secrets
3. Cron jobs return structured `CronResult` on every invocation (success or failure)
4. Return 500 only when ALL items fail — partial failure returns 200 with error details
5. Duration monitoring via `startedAt` / `finishedAt` on every cron job
6. Vercel Error Tracking reviewed after every deployment
7. Realtime disconnection is surfaced in development — users see "Reconnecting" indicator
8. Post-MVP: add Sentry for error tracking, Better Uptime for external monitoring
9. Never log request bodies or auth tokens — log IDs and codes only
10. A cron job that silently fails (returns 200 with errors but no processed items) is worse than a 500
