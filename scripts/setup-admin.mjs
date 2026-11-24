// Setup admin user on new Supabase project
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rxkkyshpcsnkmasvboth.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.ADMIN_EMAIL || "agasthyagouda907@gmail.com";
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!SERVICE_KEY || !PASSWORD) {
  console.error("Please supply SUPABASE_SERVICE_ROLE_KEY and ADMIN_PASSWORD in environment.");
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log("1. Creating/updating auth user…");

  // Try to create; if email exists, look it up and update instead
  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });

  let userId;

  if (createErr) {
    if (createErr.message.includes("already been registered") || createErr.code === "email_exists") {
      console.log("   User already exists — fetching to update password…");
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === EMAIL);
      if (!existing) throw new Error("Could not find existing user");
      userId = existing.id;
      const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, { password: PASSWORD });
      if (updateErr) throw updateErr;
      console.log("   Password updated ✓");
    } else {
      throw createErr;
    }
  } else {
    userId = created.user.id;
    console.log("   User created ✓  id:", userId);
  }

  console.log("2. Adding to public.admins table…");
  const { error: adminErr } = await supabase
    .from("admins")
    .upsert({ user_id: userId }, { onConflict: "user_id" });

  if (adminErr) {
    console.error("   Failed to insert into admins:", adminErr.message);
    console.log("   → You may need to run migrations first. See README.");
  } else {
    console.log("   Admin row upserted ✓");
  }

  console.log("\n✅ Done! Login with:");
  console.log("   Email:   ", EMAIL);
  console.log("   Password:", PASSWORD);
}

run().catch((e) => { console.error("❌", e.message); process.exit(1); });
