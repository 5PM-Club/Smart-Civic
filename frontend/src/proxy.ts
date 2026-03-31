import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const authCookie = request.cookies.get('adminAuth')
    
    if (!authCookie || authCookie.value !== 'true') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}
