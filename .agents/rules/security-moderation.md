---
trigger: always_on
---

# Futfi8 Content Moderation & Three-Strike Rules

## Overview
Futfi8 handles highly volatile, fast-paced user-generated text inputs. Content moderation security is handled strictly server-side. Client-side checks serve purely as cosmetic user experience improvements.

---

## Automated Content Screening (Perspective API)

All conversational text inputs hit Google's Perspective API before database commit operations.

```ts
// lib/perspective/check-content.ts
const PERSPECTIVE_URL = '[https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze](https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze)'

interface PerspectiveResult {
  isFlagged: boolean
  scores: {
    TOXICITY: number
    SEVERE_TOXICITY: number
    IDENTITY_ATTACK: number
    INSULT: number
    THREAT: number
  }
}

export async function checkContent(text: string): Promise<PerspectiveResult> {
  const res = await fetch(`${PERSPECTIVE_URL}?key=${process.env.PERSPECTIVE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      comment: { text },
      requestedAttributes: {
        TOXICITY: {},
        SEVERE_TOXICITY: {},
        IDENTITY_ATTACK: {},
        INSULT: {},
        THREAT: {},
      },
      languages: ['en'],
    }),
  })

  const data = await res.json()
  const scores = {
    TOXICITY: data.attributeScores.TOXICITY.summaryScore.value,
    SEVERE_TOXICITY: data.attributeScores.SEVERE_TOXICITY.summaryScore.value,
    IDENTITY_ATTACK: data.attributeScores.IDENTITY_ATTACK.summaryScore.value,
    INSULT: data.attributeScores.INSULT.summaryScore.value,
    THREAT: data.attributeScores.THREAT.summaryScore.value,
  }

  // Baseline Safety Rule: Flag only on targeted hate speech, identity threats, or extreme toxicity
  const isFlagged =
    scores.SEVERE_TOXICITY > 0.85 ||
    scores.IDENTITY_ATTACK > 0.80 ||
    scores.THREAT > 0.80

  return { isFlagged, scores }
}
Content Ingestion Rule Logic
Toxicity Exception: The baseline TOXICITY parameter is not used to block posts. Football banter naturally registers high baseline toxicity values ("You are rubbish", "absolute clown show"). Auto-blocking on basic toxicity breaks the core user experience.

Outage Fallback Shield: If the external Perspective API endpoint fails or runs out of quota tokens, do not block the user's post. Allow the post to slide to production normally while copying an asynchronous tracking row directly down into public.moderation_queue for post-match human inspection.

TypeScript
// Inside content ingestion route processing pipelines
try {
  const { isFlagged, scores } = await checkContent(content)
  if (isFlagged) {
    await supabase.from('moderation_queue').insert({
      content,
      author_id: user.id,
      scores,
      reason: 'perspective_api',
      status: 'pending',
    })
    return NextResponse.json({ error: { code: 'CONTENT_FLAGGED', message: 'Flagged for review.' } }, { status: 422 })
  }
} catch (err) {
  console.error('[Perspective API Error Fallback]', err)
  await supabase.from('moderation_queue').insert({ content, author_id: user.id, reason: 'api_outage', status: 'pending' })
}
User Disciplinary Infrastructure (Three-Strike System)
SQL
create table public.user_strikes (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.users(id) on delete cascade not null,
  reason     text not null,
  post_id    uuid references public.posts(id) on delete set null,
  issued_by  uuid references public.users(id),
  created_at timestamptz default now() not null
);
Strike Progression Metric Constraints
Strike 1: Issue a localized notification warning packet directly to the user.

Strike 2: Set an explicit 7-day restriction timeline writing a date timestamp down into users.banned_until.

Strike 3: Permanently flag users.is_banned = true and call supabase.auth.admin.deleteUser() to invalidate all active client session JWT tokens.

TypeScript
// lib/moderation/issue-strike.ts
import { createSupabaseServiceClient } from '@/lib/supabase/server'

export async function issueStrike(userId: string, reason: string, postId?: string) {
  const supabase = createSupabaseServiceClient()
  await supabase.from('user_strikes').insert({ user_id: userId, reason, post_id: postId })

  const { count } = await supabase.from('user_strikes').select('id', { count: 'exact', head: true }).eq('user_id', userId)

  if (count === 1) {
    // Fire structural warning alert notification records
  } else if (count === 2) {
    const banUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await supabase.from('users').update({ banned_until: banUntil.toISOString() }).eq('id', userId)
  } else if (count && count >= 3) {
    await supabase.from('users').update({ is_banned: true, banned_at: new Date().toISOString() }).eq('id', userId)
    await supabase.auth.admin.deleteUser(userId)
  }
}
Enforcement Verification Routine
Every transactional or write-heavy routing hook must evaluate ban state objects right after the initial session validation block:

TypeScript
// lib/auth/check-ban.ts
export async function checkUserBan(userId: string): Promise<{ banned: boolean }> {
  const { data: user } = await supabase.from('users').select('is_banned, banned_until').eq('id', userId).single()
  if (user?.is_banned) return { banned: true }
  if (user?.banned_until && new Date(user.banned_until) > new Date()) return { banned: true }
  return { banned: false }
}