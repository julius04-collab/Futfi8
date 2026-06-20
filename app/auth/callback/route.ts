import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    
    // Instantiate with explicit cookie-handling methods to bypass Next.js layout cache bugs
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore
    });

    try {
      // Execute the cryptographic code exchange
      await supabase.auth.exchangeCodeForSession(code);
    } catch (error) {
      console.error('CRITICAL_OAUTH_EXCHANGE_FAILURE:', error);
      // Fail gracefully back to login instead of hanging the thread
      return NextResponse.redirect(new URL('/login?error=callback_handshake_failed', request.url));
    }
  }

  // Auth successful! Pop straight into the main feed panel
  return NextResponse.redirect(new URL('/hot-takes', request.url));
}