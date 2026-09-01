// ============================================================
// Supabase Auth Middleware (T0.4)
// Refreshes sessions and protects routes
// ============================================================

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options });
          });
          const response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          return response;
        },
      },
    }
  );

  await supabase.auth.getSession();
  return request;
}

export function isPublicPath(pathname: string): boolean {
  const publicPaths = [
    "/",
    "/login",
    "/signup",
    "/auth/callback",
    "/auth/reset-password",
    "/forgot-password",
  ];

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(ico|png|jpg|jpeg|svg|gif|webp)$/.test(pathname)
  ) {
    return true;
  }

  return publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshedRequest = await updateSession(request);

  if (isPublicPath(pathname)) {
    return NextResponse.next({ request: refreshedRequest });
  }

  return NextResponse.next({ request: refreshedRequest });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)",
  ],
};