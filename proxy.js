import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session cookie — required for SSR auth to work correctly
  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = pathname === '/login' || pathname.startsWith('/auth/')
  const isSetupRoute = pathname === '/setup'
  // Inbound webhooks are called by external services with no session cookie —
  // they must never be redirected to login.
  const isWebhookRoute = pathname.startsWith('/api/webhooks/')
  // Public docs — readable by anyone, no auth.
  const isDocsRoute = pathname === '/docs' || pathname.startsWith('/docs/')
  const isPublicRoute = pathname === '/' || isAuthRoute || isWebhookRoute || isDocsRoute
  const isProtectedRoute = !isPublicRoute && !isSetupRoute

  // Unauthenticated + protected → login
  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Unauthenticated + setup → login
  if (!user && isSetupRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated + login page → let dashboard layout decide (setup vs dashboard)
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api/webhooks|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
