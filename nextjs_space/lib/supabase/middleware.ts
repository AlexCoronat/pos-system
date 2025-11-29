
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Route configuration with role-based access control
 */
const ROUTE_CONFIG = {
  public: ['/', '/auth/login', '/auth/register', '/auth/recover-password', '/auth/reset-password', '/auth/verify-email', '/auth/callback', '/privacy', '/terms', '/test-env'],
  auth: ['/auth/login', '/auth/register', '/auth/recover-password', '/auth/reset-password'],
  protected: {
    '/dashboard': { roles: ['Admin', 'Manager', 'Seller', 'Support', 'Inventory Manager', 'Cashier'] },
    '/dashboard/pos': { roles: ['Admin', 'Manager', 'Seller', 'Cashier'] },
    '/dashboard/sales': { roles: ['Admin', 'Manager', 'Seller'], permissions: ['sales:read'] },
    '/dashboard/inventory': { roles: ['Admin', 'Manager', 'Inventory Manager'], permissions: ['inventory:read'] },
    '/dashboard/customers': { roles: ['Admin', 'Manager', 'Seller'], permissions: ['customers:read'] },
    '/dashboard/suppliers': { roles: ['Admin', 'Manager', 'Inventory Manager'], permissions: ['inventory:read'] },
    '/dashboard/reports': { roles: ['Admin', 'Manager'], permissions: ['reports:read'] },
    '/dashboard/settings': { roles: ['Admin', 'Manager'], permissions: ['settings:read'] },
    '/dashboard/settings/roles': { roles: ['Admin'], permissions: ['roles:read'] },
    '/dashboard/settings/team': { roles: ['Admin'], permissions: ['users:read'] },
    '/dashboard/settings/locations': { roles: ['Admin', 'Manager'], permissions: ['locations:read'] },
  }
}

/**
 * Check if user has required role
 */
function hasRequiredRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole)
}

/**
 * Check if user has required permission
 */
function hasRequiredPermission(userPermissions: Record<string, string[]>, requiredPermissions: string[]): boolean {
  if (!requiredPermissions || requiredPermissions.length === 0) return true

  return requiredPermissions.some(permission => {
    const [module, action] = permission.split(':')
    return userPermissions[module]?.includes(action) || false
  })
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Error getting user in middleware:', error.message)
      // On connection errors, allow the request to proceed
      // The client-side will handle auth state
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        return supabaseResponse
      }
    }
    user = data.user
  } catch (error: any) {
    console.error('Middleware auth error:', error.message || error)
    // On connection errors (ECONNRESET, etc), allow the request to proceed
    // rather than redirecting to login
    return supabaseResponse
  }

  const pathname = request.nextUrl.pathname

  // Check if route is public
  const isPublicRoute = ROUTE_CONFIG.public.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  )

  // Check if route is auth route
  const isAuthRoute = ROUTE_CONFIG.auth.some(route =>
    pathname.startsWith(route)
  )

  // Allow public routes
  if (isPublicRoute && !Object.keys(ROUTE_CONFIG.protected).some(route => pathname.startsWith(route))) {
    return supabaseResponse
  }

  // Redirect unauthenticated users to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Check role and permission based access for protected routes
  if (user) {
    const protectedRoute = Object.entries(ROUTE_CONFIG.protected).find(([route]) =>
      pathname.startsWith(route)
    )

    if (protectedRoute) {
      const [route, config] = protectedRoute

      try {
        // Fetch user profile with role and permissions
        const { data: userProfile, error } = await supabase
          .from('user_details')
          .select(`
            role_id,
            is_active,
            role:roles!role_id(name, permissions)
          `)
          .eq('id', user.id)
          .single()

        if (error || !userProfile) {
          console.error('Error fetching user profile:', error)
          console.error('User ID:', user.id)
          console.error('Full error details:', JSON.stringify(error, null, 2))
          const url = request.nextUrl.clone()
          url.pathname = '/auth/login'
          url.searchParams.set('error', 'profile_not_found')
          return NextResponse.redirect(url)
        }

        // Check if user is active
        if (!userProfile.is_active) {
          const url = request.nextUrl.clone()
          url.pathname = '/auth/login'
          url.searchParams.set('error', 'account_inactive')
          return NextResponse.redirect(url)
        }

        // Supabase returns role as an array due to the foreign key relationship
        const roleData = Array.isArray(userProfile.role) ? userProfile.role[0] : userProfile.role
        const userRole = roleData?.name || 'Seller'
        const userPermissions = typeof roleData?.permissions === 'string'
          ? JSON.parse(roleData.permissions)
          : roleData?.permissions || {}

        // Check role access
        if (config.roles && !hasRequiredRole(userRole, config.roles)) {
          console.error('Access denied - User role:', userRole, 'Required roles:', config.roles)
          const url = request.nextUrl.clone()
          url.pathname = '/dashboard'
          url.searchParams.set('error', 'access_denied')
          return NextResponse.redirect(url)
        }

        // Check permission access
        if ('permissions' in config && config.permissions && !hasRequiredPermission(userPermissions, config.permissions)) {
          const url = request.nextUrl.clone()
          url.pathname = '/dashboard'
          url.searchParams.set('error', 'insufficient_permissions')
          return NextResponse.redirect(url)
        }
      } catch (error) {
        console.error('Error checking permissions:', error)
        // Allow access if there's an error checking permissions (fail open for better UX)
        // In production, you might want to fail closed instead
      }
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
