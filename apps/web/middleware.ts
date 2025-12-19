import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Permitir acceso a login y rutas públicas
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Verificar token en cookies
  const token = request.cookies.get('accessToken')?.value;
  
  // Si no hay token en cookies pero hay token en localStorage, el cliente lo manejará
  // Por ahora permitimos el acceso si hay token o si es la ruta de login
  if (!token && request.nextUrl.pathname !== '/login') {
    // Redirigir a login solo si no hay token
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
