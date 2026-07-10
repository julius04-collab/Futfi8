---
trigger: always_on
---

# Futfi8 Client Fetch Catchers, Error Translation, & Server Logging

## Unified Client Network Client Wrapper

```ts
// lib/utils/api-fetch.ts
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<{ data: T | null; error: { code: string; message: string; status: number } | null }> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    })
    const json = await res.json()

    if (!res.ok) {
      return {
        data: null,
        error: {
          code: json.error?.code ?? 'INTERNAL_ERROR',
          message: json.error?.message ?? 'Something went wrong.',
          status: res.status,
        },
      }
    }
    return { data: json.data as T, error: null }
  } catch {
    return {
      data: null,
      error: { code: 'NETWORK_ERROR', message: 'Check your connection and try again.', status: 0 },
    }
  }
}
Core Translation Mapping Dictionary
Intercept backend codes and present clean, sanitized conversational banter strings. Raw infrastructure error trace strings must never surface inside viewports.

TypeScript
// lib/utils/error-messages.ts
export const USER_FACING_ERRORS: Record<string, string> = {
  UNAUTHORIZED:          'You need to be logged in to do that.',
  FORBIDDEN:             "You don't have permission to do that.",
  NOT_FOUND:             "We couldn't find what you were looking for.",
  RAID_ALREADY_USED:     "You've already posted in this raid window.",
  RAID_WINDOW_CLOSED:    'The raid window has closed.',
  RAID_NOT_ELIGIBLE:     'You need to be a member before kick-off to raid.',
  MATCH_THREAD_CLOSED:    'This match thread is no longer active.',
  POST_TOO_LONG:         'Your take is too long. Keep it under 500 characters.',
  CONTENT_FLAGGED:        'Your post was flagged. Keep it to football banter.',
  CLUB_SWITCH_COOLDOWN:  'You can only switch clubs once every 30 days.',
  RATE_LIMITED:          "Slow down — you're posting too fast.",
  NETWORK_ERROR:         'Check your connection and try again.',
  INTERNAL_ERROR:        'Something went wrong on our end. Try again.',
}

export function getUserFacingError(code: string): string {
  return USER_FACING_ERRORS[code] ?? USER_FACING_ERRORS.INTERNAL_ERROR
}
Server Logs Tracing Protocols
Format exceptions via console.error attaching explicit context telemetry packages.

Banned Log Signatures: Never include raw client JWT tokens, password hashes, email targets, or raw un-moderated text scripts inside logs blocks.

Mandatory Log Signatures: Always trace system route methods, targeted User IDs, programmatic app error codes, and associated database entity rows.

TypeScript
console.error('[ROUTE_EXCEPTION] [POST /api/posts]', {
  userId: user?.id,
  action: 'create_post',
  errorCode: error.code,
  context: { locker_room_id, post_type: type }
})
Programmatic Cron Job Error Routing
Automated endpoints must fail explicitly. Capture errors inside robust try/catch blocks and send non-200 payloads back to invoke structural retry actions inside the system host orchestration layers.

TypeScript
// app/api/cron/poll-matches/route.ts
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = { processed: 0, failed: 0, errors: [] as string[], startedAt: new Date().toISOString() }

  try {
    // Process integration updates
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown exception'
    results.errors.push(message)
    results.failed++
    console.error('[CRON POLL ERROR]', { error: message })
  }

  const status = results.failed > 0 && results.processed === 0 ? 500 : 200
  return NextResponse.json(results, { status })
}
Mobile Carrier Timeout Interceptors
To secure data retrieval routines operating across volatile cellular networks, enforce strict timeout parameters via an AbortController wrapper.

TypeScript
// lib/utils/fetch-timeout.ts
export async function fetchWithTimeout(url: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 8000, ...fetchOptions } = options
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection.')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}
Platform Bounds: Apply an 8-second limit across all standard external API integrations, lowering the threshold to a crisp 5-second fail-open limit for Perspective API content scans.