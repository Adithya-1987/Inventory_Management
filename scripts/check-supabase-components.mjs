import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, count, error } = await supabase.from("components").select("*", { count: "exact" }).order("name");
  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log("Total components in Supabase:", data.length);
  console.log("First 5 components:");
  data.slice(0, 5).forEach((c) => {
    console.log(`  - ${c.name} | Qty: ${c.quantity} | Cost: ${c.unit_cost} | Price: ${c.sell_price} | Cat: ${c.category}`);
  });
  console.log("Components with cost > 0:");
  data.filter((c) => c.unit_cost > 0).forEach((c) => {
    console.log(`  - ${c.name}: cost=${c.unit_cost}, price=${c.sell_price}`);
  });
}

check();
