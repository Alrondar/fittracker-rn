import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  // Если пароль не настроен, блокируем доступ в production
  if (!adminPassword && process.env.NODE_ENV === 'production') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const sessionPassword = request.cookies.get('admin_session')?.value;

  // Если пароль не совпадает, редиректим на логин
  if (sessionPassword !== adminPassword) {
    // Разрешаем доступ к /login
    if (request.nextUrl.pathname === '/login') {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Если пытаемся зайти на /login с валидной сессией, редиректим на dashboard
  if (request.nextUrl.pathname === '/login' && sessionPassword === adminPassword) {
    return NextResponse.redirect(new URL('/exercises', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
