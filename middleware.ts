import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Public routes that don't require auth
  const isPublicRoute =
    path === "/" ||
    path === "/auth" ||
    path.startsWith("/auth/") ||
    path === "/watch-demo" ||
    path === "/about";

  // Redirect unauthenticated users to auth page
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    const redirectResponse = NextResponse.redirect(url);
    // Carry over any refreshed auth cookies from the Supabase response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  // Domain enforcement: only @cdssvic.com.au emails can access protected routes
  if (user && !user.email?.endsWith("@cdssvic.com.au") && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("error", "unauthorized");
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  // Redirect authenticated users away from auth page to dashboard
  // Only redirect if the user has an authorised domain — otherwise they need
  // to stay on /auth so the client-side code can sign them out and show an error.
  if (
    user &&
    user.email?.endsWith("@cdssvic.com.au") &&
    path === "/auth" &&
    !request.nextUrl.searchParams.has("error")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirectResponse = NextResponse.redirect(url);
    // Carry over any refreshed auth cookies from the Supabase response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
