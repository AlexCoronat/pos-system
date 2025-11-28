import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './lib/supabase/middleware'
import { defaultLocale } from './lib/i18n/config'

export async function middleware(request: NextRequest) {
  // Get locale from cookies or use default
  const locale = request.cookies.get('NEXT_LOCALE')?.value || defaultLocale

  // Handle Supabase session
  const response = await updateSession(request)

  // If no response from Supabase (user is authenticated or public route), create a response
  const finalResponse = response || NextResponse.next()

  // Set locale in cookie if not present
  if (!request.cookies.get('NEXT_LOCALE')) {
    finalResponse.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      sameSite: 'lax'
    })
  }

  // Add locale to response headers for i18n.ts to read
  finalResponse.headers.set('x-next-intl-locale', locale)

  // Route protection: Check if accessing protected admin routes
  const path = request.nextUrl.pathname

  // If accessing dashboard routes, check permissions
  if (path.startsWith('/dashboard')) {
    // The ViewProvider will handle the actual redirect
    // Middleware just ensures proper headers are set
    // We rely on client-side navigation protection
  }

  return finalResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - API routes
     * - Static files (images, fonts, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
}
