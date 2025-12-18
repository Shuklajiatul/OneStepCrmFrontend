import { NextResponse } from 'next/server'

// Define paths that do not require authentication
const publicPaths = [
    '/login',
    '/register',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/verify-otp',
    '/api/auth/resend-otp',
]

export function middleware(request) {
    const { pathname } = request.nextUrl

    // 1. Check if the path is strictly public
    if (publicPaths.some(path => pathname.startsWith(path))) {
        return NextResponse.next()
    }

    // 2. Exclude static files, API routes (handled separately), and public forms
    // We assume /forms/[id] is public for submissions
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.startsWith('/api') ||
        pathname.includes('.') || // Files with extensions
        pathname.startsWith('/forms') || // Public form view
        pathname.startsWith('/public')
    ) {
        return NextResponse.next()
    }

    // 3. Check for authentication tokens in cookies
    // We check for either accessToken OR refreshToken. 
    // If accessToken is missing but refreshToken exists, we allow it to proceed 
    // because the client-side API interceptor will handle the refresh.
    const accessToken = request.cookies.get('accessToken')
    const refreshToken = request.cookies.get('refreshToken')

    // Debug log (server-side only, viewable in terminal)
    // console.log(`Middleware: ${pathname} - Access: ${!!accessToken}, Refresh: ${!!refreshToken}`);

    if (!accessToken && !refreshToken) {
        // No tokens found -> Redirect to login
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'session_required')
        return NextResponse.redirect(url)
    }

    // Tokens exist, allow request
    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
