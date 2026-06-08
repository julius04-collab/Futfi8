import { supabaseAdmin } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * Extracts and verifies the authenticated user from the request's Bearer token.
 * Returns the Supabase User object or null if unauthenticated.
 */
export async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) return null
  return user
}
