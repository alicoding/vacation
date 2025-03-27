import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/* (image files stored in the public folder)
     * - public/* (public files)
     * - /auth/* (auth routes)
     * - /api/* (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|images|public|auth|api).*)',
  ],
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name) => {
          return req.cookies.get(name)?.value
        },
        set: async (name, value, options) => {
          res.cookies.set({ name, value, ...options })
        },
        remove: async (name, options) => {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  try {
    // Get the current path - we'll use this to prevent unnecessary redirects
    const path = req.nextUrl.pathname
    
    // Check if this is a post-authentication redirect from the callback
    const isAuthSuccess = req.nextUrl.searchParams.get('auth_success') === 'true'
    if (isAuthSuccess) {
      // Coming directly from authentication, remove the query param and proceed
      const cleanUrl = new URL(req.url)
      cleanUrl.searchParams.delete('auth_success')
      
      // Just clean up the URL without doing auth checks
      console.log('Post-authentication redirect detected, cleaning URL')
      return NextResponse.redirect(cleanUrl)
    }
    
    // Check for potential redirect loop by detecting repeated redirects
    const redirectCount = parseInt(req.nextUrl.searchParams.get('redirectCount') || '0')
    if (redirectCount > 2) {
      console.warn('Detected potential redirect loop, allowing request to proceed', { path })
      return res
    }
    
    // Get auth state and session
    const { data: { session } } = await supabase.auth.getSession()
    
    // If there's no session and the user is trying to access a protected route,
    // redirect to the sign-in page
    if (!session && !path.startsWith('/auth/')) {
      console.log('No session detected, redirecting to sign-in', { path })
      const redirectUrl = new URL('/auth/signin', req.url)
      redirectUrl.searchParams.set('callbackUrl', path)
      redirectUrl.searchParams.set('redirectCount', (redirectCount + 1).toString())
      return NextResponse.redirect(redirectUrl)
    }
    
    // If the user is authenticated and trying to access the auth route,
    // redirect to the dashboard
    if (session && path.startsWith('/auth/signin')) {
      console.log('Session detected, redirecting to dashboard', { path })
      const dashboardUrl = new URL('/dashboard', req.url)
      dashboardUrl.searchParams.set('redirectCount', (redirectCount + 1).toString())
      return NextResponse.redirect(dashboardUrl)
    }
    
    return res
  } catch (error) {
    console.error('Middleware error:', error)
    // In case of an error, proceed without redirecting
    return res
  }
}