---
trigger: always_on
---

# Futfi8 API Conventions & Core Templates

## Overview

Futfi8 uses Next.js App Router API routes for all server-side logic. Every API route follows the same structure, response shape, validation pattern, and error handling convention. Consistency across all routes is non-negotiable — the agent must never invent new patterns mid-build.

All routes live under `app/api/` and are written in TypeScript. All request bodies are validated with Zod before any database processing happens.

---

## Response Shapes

### Success Envelope
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-06-03T10:00:00.000Z"
  }
}
```

### Error Envelope
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You must be logged in to post.",
    "details": {}
  },
  "meta": {
    "timestamp": "2026-06-03T10:00:00.000Z"
  }
}
```

### Paginated Envelope
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 143,
    "hasMore": true
  },
  "meta": {
    "timestamp": "2026-06-03T10:00:00.000Z"
  }
}
```

> **Constraint:** Always include `meta.timestamp` in every single response.
> **Constraint:** Never return raw Supabase database errors to the client — map them directly to approved error codes.

---

## Status & Error Mapping Reference

### HTTP Status Codes Matrix
| Code | Description |
|---|---|
| 200 | Successful GET, PATCH, DELETE |
| 201 | Successful POST (resource created) |
| 400 | Bad request — validation failed, malformed body |
| 401 | Unauthenticated — no valid session |
| 403 | Unauthorized — authenticated but not permitted |
| 404 | Resource not found |
| 409 | Conflict — duplicate resource, constraint violation |
| 422 | Unprocessable — business logic rejection (e.g. raid already used) |
| 429 | Rate limit exceeded |
| 500 | Internal server error — unexpected failure |

### Standard App Error Codes

Use these exact string codes in `error.code` — never freeform strings:

| Code | Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Not permitted to perform this action |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 400 | Zod validation failed |
| `DUPLICATE` | 409 | Resource already exists |
| `RAID_ALREADY_USED` | 422 | User already posted in this raid window |
| `RAID_WINDOW_CLOSED` | 422 | Raid window has expired |
| `RAID_NOT_ELIGIBLE` | 403 | User not in raid eligibility list |
| `CLUB_SWITCH_COOLDOWN` | 422 | 30-day cooldown has not expired |
| `MATCH_THREAD_CLOSED` | 422 | Match thread is no longer accepting posts |
| `POST_TOO_LONG` | 400 | Post content exceeds 500 character limit |
| `CONTENT_FLAGGED` | 422 | Post failed toxicity check |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Core Execution Pipeline Template

Every API route handler must execute code tasks in this exact sequential order:

1. Auth validation check (`getUser()`)
2. Request payload parsing & body validation (Zod)
3. Logical business rule checks
4. Database interaction / transaction execution
5. Envelope wrapper serialization & return

```ts
// app/api/{resource}/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const createPostSchema = z.object({
  content: z.string().min(1).max(500),
  locker_room_id: z.string().uuid(),
  type: z.enum(['standard', 'match_thread', 'hot_take']),
})

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be logged in.' } },
        { status: 401 }
      )
    }

    // 2. Parse and validate body
    const body = await request.json()
    const parsed = createPostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request.', details: parsed.error.flatten() } },
        { status: 400 }
      )
    }

    // 3 & 4. Database operation
    const { data, error } = await supabase
      .from('posts')
      .insert({ ...parsed.data, author_id: user.id })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/posts]', error)
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Failed to create post.' } },
        { status: 500 }
      )
    }

    // 5. Return success
    return NextResponse.json(
      { data, meta: { timestamp: new Date().toISOString() } },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/posts] Unexpected error', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } },
      { status: 500 }
    )
  }
}
```

---

## Shared Zod Validation Library

Define schemas inside `lib/validations/`. Import them directly into API routes.

```ts
// lib/validations/post.ts
import { z } from 'zod'

export const createPostSchema = z.object({
  content: z.string().min(1, 'Post cannot be empty').max(500, 'Post cannot exceed 500 characters').trim(),
  locker_room_id: z.string().uuid().optional(),
  type: z.enum(['standard', 'match_thread', 'hot_take', 'raid']),
  match_thread_id: z.string().uuid().optional(),
  raid_window_id: z.string().uuid().optional(),
})

export const createReactionSchema = z.object({
  post_id: z.string().uuid(),
  type: z.enum(['upvote', 'fire', 'laugh', 'rage']),
})

export const updateUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username cannot exceed 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  avatar_url: z.string().url().optional(),
})
```

---

## Data Pagination Systems

### Feed Cursor Mechanics (Chronological Lists)

```ts
// GET /api/locker-rooms/{clubId}?cursor={postId}&limit=20
const query = supabase
  .from('posts')
  .select('*')
  .eq('locker_room_id', clubId)
  .eq('is_removed', false)
  .order('created_at', { ascending: false })
  .limit(limit)

if (cursor) {
  query.lt('created_at', cursorTimestamp)
}
```

### Leaderboard Offset Mechanics (Members Metrics)

Default Limit: 20 | Max Limit Boundary: 50

Format parameters require traditional page, limit, and total counters tracking.
