import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session cookie and keeps signed-out visitors out of /admin.
// The admin check itself (public.admins) happens in lib/auth.ts on every admin page, route and action.
export async function middleware(req: NextRequest) {
  const isAdminPath = req.nextUrl.pathname.startsWith("/admin");
  const isLoginPath = req.nextUrl.pathname === "/login";

  // Fast check: look for Supabase auth cookie locally without remote network call
  const allCookies = req.cookies.getAll();
  const hasAuthToken = allCookies.some(
    (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token") && c.value && c.value !== '""'
  );

  // If no auth cookie at all and trying to access /admin, redirect immediately (0ms delay)
  if (!hasAuthToken && isAdminPath) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Fast path for client-side navigation (Next.js RSC requests):
  // AdminLayout (requireAdmin) already verifies auth and admin permissions securely on the server.
  // Skipping the duplicate remote getUser() call in middleware saves ~300ms on every click!
  const isRSC = req.headers.get("rsc") === "1" || req.headers.has("next-router-prefetch");
  if (isRSC && hasAuthToken) {
    return NextResponse.next({ request: req });
  }

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isAdminPath) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPath) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = { matcher: ["/admin/:path*", "/login"] };
