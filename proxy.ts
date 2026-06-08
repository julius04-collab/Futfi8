import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const publicPaths = ['/login', '/register', '/auth']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublic = publicPaths.some(p => pathname.startsWith(p))
  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/Images') || pathname === '/favicon.ico'
  const isApi = pathname.startsWith('/api')

  if (isPublic || isStatic || isApi) {
    return NextResponse.next()
  }

  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|Images|favicon.ico|login|register|auth).*)'],
}
