import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Supabase client bound to the request's auth cookies (server components, actions, route handlers). */
export async function createClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a server component: cookies are read-only there; middleware refreshes them instead.
        }
      },
    },
  });
}
