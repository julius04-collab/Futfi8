import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const publicPaths: string[] = ['/login', '/register', '/auth']

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isRoot = pathname === '/'
  const isPublic = publicPaths.some(p => pathname.startsWith(p))
  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/Images') || pathname === '/favicon.ico'
  const isApi = pathname.startsWith('/api')

  if (isRoot || isPublic || isStatic || isApi) {
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

  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw error || new Error('No session')
  } catch {
    await supabase.auth.signOut().catch(() => {})
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
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - crests (local asset paths)
     * - public landing root (the '/' exception string entry)
     */
    '/((?!_next/static|_next/image|favicon.ico|crests|^/$).*)',
  ],
}
