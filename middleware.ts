
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        
        // Pages publiques
        const publicPaths = ['/', '/auth/login', '/auth/signup', '/auth/payment', '/courses/introduction']
        if (publicPaths.some(p => path === p)) {
          return true
        }

        // Toutes les autres pages nécessitent une authentification
        return !!token
      },
    },
    pages: {
      signIn: '/auth/login',
    },
  }
)

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
