import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { FAN_CRED } from '@/lib/constants'
import { createNotification } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

// ── SCHEMA ────────────────────────────────────────────────────────────────────
const reactSchema = z.object({
  type: z.enum(['upvote', 'fire', 'laugh', 'rage'], {
    errorMap: () => ({ message: 'type must be one of: upvote, fire, laugh, rage' }),
  }),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // ── ZOD VALIDATION ──────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' } },
      { status: 400 }
    )
  }

  const parsed = reactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    )
  }

  const { type } = parsed.data

  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('id, upvote_count, author_id, locker_room_id')
    .eq('id', id)
    .single()

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const { data: existing } = await supabaseAdmin
    .from('reactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('post_id', id)
    .eq('type', type)
    .single()

  if (existing) {
    await supabaseAdmin.from('reactions').delete().eq('id', existing.id)

    if (type === 'upvote') {
      await supabaseAdmin
        .from('posts')
        .update({ upvote_count: Math.max(0, (post.upvote_count || 0) - 1) })
        .eq('id', id)
    }

    return NextResponse.json({ reacted: false, type: null })
  }

  const { error: insertError } = await supabaseAdmin
    .from('reactions')
    .insert({ user_id: user.id, post_id: id, type })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  if (type === 'upvote') {
    await supabaseAdmin
      .from('posts')
      .update({ upvote_count: (post.upvote_count || 0) + 1 })
      .eq('id', id)

    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('fan_cred_score')
      .eq('user_id', post.author_id)
      .eq('locker_room_id', post.locker_room_id)
      .single()

    if (membership) {
      await supabaseAdmin
        .from('memberships')
        .update({ fan_cred_score: (membership.fan_cred_score || 0) + FAN_CRED.UPVOTE_RECEIVED })
        .eq('user_id', post.author_id)
        .eq('locker_room_id', post.locker_room_id)
    }

    // Notify post author of upvote (skip self-upvote)
    if (post.author_id !== user.id) {
      await createNotification(post.author_id, 'upvote', id)
    }
  }

  return NextResponse.json({ reacted: true, type })
}
