import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

/** The signed-in user if they are in public.admins, else null. */
export async function getAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: isAdmin } = await supabase.rpc("is_admin");
  return isAdmin ? user : null;
}

/** Gate for admin pages and route handlers. */
export async function requireAdmin() {
  const user = await getAdmin();
  if (!user) redirect("/login");
  return user;
}
