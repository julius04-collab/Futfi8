---
trigger: always_on
---

# Futfi8 Application Endpoint Map & Routing Mechanics

## Unified API Routing Manifest

### Authentication Modules
- `POST /api/auth/register` | Open public sign up routing flow.
- `POST /api/auth/login` | Open credential parsing pipeline entrypoint.
- `POST /api/auth/logout` | Session clearing command logic. `[Auth Required]`
- `GET /api/auth/callback` | Server authentication broker callback redirection route.

### Fan Profile Handlers
- `GET /api/users/me` | Fetch active user session profile specs. `[Auth Required]`
- `PATCH /api/users/me` | Mutate display name or storage link pointer keys. `[Auth Required]`
- `GET /api/users/[userId]` | Fetch public metrics sheet data.
- `DELETE /api/users/me` | Run cascading profile soft deletion routines. `[Auth Required]`

### Club Reference Tables
- `GET /api/clubs` | Enumerate static 20 Premier League profiles array data.
- `GET /api/clubs/[clubId]` | Query details for a singular target club profile.

### Locker Room Hub Channels
- `GET /api/locker-rooms/[clubId]` | Pull timeline context feed + live stats metadata.
- `POST /api/locker-rooms/[clubId]/join` | Process home loyalty assignment transactions. `[Auth Required]`
- `GET /api/locker-rooms/[clubId]/members` | Stream paginated fan leaderboards.
- `GET /api/locker-rooms/[clubId]/raid-history` | Pull historic archived lock entries lists.

### Conversation Threads & Takes
- `POST /api/posts` | Insert a conversational take row record. `[Auth Required]`
- `GET /api/posts/[postId]` | Query entry details page context.
- `DELETE /api/posts/[postId]` | Flags soft-delete modifier parameters. `[Auth Required]`
- `POST /api/posts/[postId]/report` | Feed report profiles into moderation queues. `[Auth Required]`

### Raid Interaction Gateways
- `GET /api/raids/[raidWindowId]` | Structural tracking frame details queries.
- `POST /api/raids/[raidWindowId]/post` | Inject critical banter post directly inside enemy lines. `[Auth Required]`
- `GET /api/raids/active` | Pull active countdown timers list arrays globally.

### Live Fixture Engine
- `GET /api/matches` | Enumerate active gameweek calendars matrices data.
- `GET /api/matches/[matchId]` | Target score progression detail frames.
- `GET /api/matches/live` | Scope stream arrays processing currently live matches.

### Match Threads, Hot Takes, & Social Reactions
- `GET /api/match-threads/[threadId]` | Open live active conversation panels feed data.
- `POST /api/match-threads/[threadId]/posts` | Append text commentary during a live match fixture. `[Auth Required]`
- `GET /api/hot-takes` | Pull cross-club unstructured public squares timelines.
- `POST /api/hot-takes` | Disseminate global unfiltered baseline text inputs. `[Auth Required]`
- `POST /api/reactions` | Insert interactive expressions mapping links. `[Auth Required]`
- `DELETE /api/reactions/[reactionId]` | Evaporate previously committed user reaction link data. `[Auth Required]`

### In-App Notification Center
- `GET /api/notifications` | Enumerate active unread alert queues data. `[Auth Required]`
- `PATCH /api/notifications/[id]/read` | Mark a target confirmation alert item array read. `[Auth Required]`
- `PATCH /api/notifications/read-all` | Batch flag all pending user notifications true. `[Auth Required]`

---

## Background Automated Cron Systems
Automated entry actions execute via Vercel Scheduling pipelines.

### Automated Cron Endpoint Paths
- `GET /api/cron/poll-matches` | Run 2-minute delta cycle sync calls hitting API-Football endpoint sets.
- `GET /api/cron/close-raid-windows` | Monitor and lock expired 2-hour raid window timers.
- `GET /api/cron/open-match-threads` | Spin up local thread spaces 30-minutes prior to official match kick-offs.
- `GET /api/cron/recalculate-cred` | Midnight calculation batch job rebuilding locker room user badge thresholds.
- `GET /api/cron/weekly-digest` | Sunday batch notification content distribution runner.

### Security Handshake Engine
Every cron path route must validate incoming headers against the deployment environment credential variable token before execution:
```ts
// app/api/cron/poll-matches/route.ts
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // execution path continues...
}
JSON
// vercel.json configuration manifest
{
  "crons": [
    { "path": "/api/cron/poll-matches",       "schedule": "*/2 * * * *"  },
    { "path": "/api/cron/close-raid-windows", "schedule": "*/5 * * * *"  },
    { "path": "/api/cron/open-match-threads", "schedule": "*/5 * * * *"  },
    { "path": "/api/cron/recalculate-cred",   "schedule": "0 0 * * *"    },
    { "path": "/api/cron/weekly-digest",      "schedule": "0 10 * * 0"   }
  ]
}
Transaction Rate Limiting Thresholds
Enforce precise rate limits globally using IP or Account ID reference markers:

Auth Endpoint Groups: Max 5 request actions | 15-minute sliding window per IP.

Post Creation Engines: Max 10 request actions | 1-minute sliding window per account profile.

Reaction Interactions: Max 30 request actions | 1-minute sliding window per account profile.

Raid Target Windows: Strictly 1 successful post commit maximum per explicit user window profile context.

Report Queue Inputs: Max 5 request actions | 1-hour window per account profile.

System Logging Criteria
wrap exceptions in robust local debug blocks without spilling private parameters:

TypeScript
console.error('[ROUTE_ERROR_IDENTIFIER]', {
  userId: user?.id,
  action: 'create_post',
  error: error.message,
  context: { locker_room_id, post_type }
})
Forbidden Logging Elements: Never print raw request bodies, authentication passwords, or user raw JWT header tokens into the terminal outputs.

Mandatory Logging Elements: Log Route Names, User IDs (never email metadata fields), precise database error logs, and related target context IDs.