import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const publicPaths: string[] = ['/login', '/register', '/auth', '/pick-team']

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isRoot = pathname === '/'
  const isPublic = publicPaths.some(p => pathname.startsWith(p))
  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/images') || pathname.startsWith('/Images') || pathname === '/favicon.ico'
  const isApi = pathname.startsWith('/api')

  if (isRoot) {
    const res = NextResponse.next()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll() },
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
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return res
  }

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

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - images (static image assets)
     * - crests (local club badge graphics)
     * - favicon.ico (favicon file)
     * - Root path: end-of-string anchor after leading /
     */
    '/((?!api|_next/static|_next/image|images|Images|crests|favicon.ico|$).*)',
  ],
}
