# Futfi8 Match Polling Architecture

We switched from API-Football (RapidAPI) to **football-data.org v4** because their free plan supports the 2024 season (vs. API-Football's cap at 2022–2024 on free tier). All polling uses `lib/football-api/client.ts` instead of any RapidAPI client.

## Polling jobs

Two separate Vercel Cron jobs handle match polling. Both protect their endpoints with `CRON_SECRET` via `Authorization: Bearer` header check.

---

### 1. `poll-matches` — every 2 minutes on matchdays

**File:** `app/api/cron/poll-matches/route.ts`

This is the primary real-time poller. It makes two parallel calls to football-data.org:

```
GET /competitions/PL/matches?status=IN_PLAY,PAUSED
GET /competitions/PL/matches?status=FINISHED,AWARDED&dateFrom=today&dateTo=today
```

**Flow:**

1. Fetch live + today's finished matches from API
2. Build a `club_id → football_data_team_id` map from the `clubs` table
3. For each fixture, call `ensureMatchExists()` — upserts a row in `matches` if not present, keyed on `api_match_id`
4. Status transitions:
   - **Fixture is live + match is not yet live** → update status to `'live'`, set scores
   - **Fixture is live + match already live** → update scores only (score refresh)
   - **Fixture is finished + match not yet finished** → update to `'finished'`, create raid window if winner exists
5. Raid window creation (on a non-draw finish):
   - Inserts `raid_windows` row with `raiding_club_id`, `defending_club_id`, 2-hour window
   - Sets `locker_rooms.is_under_raid = true`, `raided_by`, `raid_expires_at` on defending club
   - Notifies all defending locker room members via `notifyLockerRoomMembers()`
   - Skips if `raid_windows` row already exists for this match (idempotent)

**Response:**
```json
{
  "polled": <number>,
  "updated": <number>,
  "raids_created": <number>,
  "duration_ms": <number>
}
```

**Error format:** `{ "error": "Match polling failed" }` with status 500.

---

### 2. `check-matches` — every 10 minutes (offset from poll-matches)

**File:** `app/api/cron/check-matches/route.ts`

Idempotent fallback poller for finished matches. Useful when `poll-matches` misses a result or the API was slow to mark a match as finished.

**Flow:**

1. Fetch today's finished matches only: `GET /competitions/PL/matches?status=FINISHED,AWARDED&dateFrom=today&dateTo=today`
2. Build club map, get-or-create each match
3. Skip if match already has `status = 'finished'`
4. Update match scores + status
5. Create raid window on non-draw (same logic as poll-matches)

**Response:**
```json
{
  "processed": <number>,
  "raids_created": <number>,
  "duration_ms": <number>
}
```

---

## Quota management

- **10 req/min** on football-data.org free plan
- Both cron jobs combined make ~2–3 API calls per invocation (live + finished, plus team lookups use the local DB)
- No polling runs when there are no active matches — the 2-minute cron always fires but the API calls are only made to fetch live/finished data. The code lets the free-tier quota handle itself; no early-exit guard is implemented yet.

## Club team ID mapping

The `clubs` table has a `football_data_team_id` column that stores football-data.org's numeric team ID. This is the join key between the `clubs` table and the fixture's `homeTeam.id` / `awayTeam.id`. Both cron jobs build an in-memory `Map<number, { id: string }>` at the start of each run.

## Migration note

When upgrading to a paid football-data.org plan:
- Change `CURRENT_SEASON` in `lib/football-api/client.ts` to `2025`
- Change `PREMIER_LEAGUE_SEASON` in `lib/constants.ts` to `2025`
- Verify the `football_data_team_id` values in the `clubs` table match the 2025/26 season team IDs
