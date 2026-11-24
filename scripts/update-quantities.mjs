import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: dbComps, error } = await supabase.from("components").select("*");
  if (error) {
    console.error("DB Error:", error);
    return;
  }

  const dbMap = new Map();
  dbComps.forEach(c => {
    dbMap.set(c.name.toLowerCase().trim(), c);
  });

  const content = fs.readFileSync("google_sheet_latest.csv", "utf8");
  const lines = content.split(/\r?\n/);
  let startIndex = lines.findIndex(l => l.toLowerCase().includes("old components"));

  console.log(`Reading from line ${startIndex + 2} (Row 30) onwards...`);

  const updates = [];

  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    let match = line.match(/^"([^"]+)",(.*)$/) || line.match(/^([^,]+),(.*)$/);
    if (!match) continue;
    let name = match[1].trim();
    let qtyRaw = match[2].split(",")[0]?.trim();

    const lower = name.toLowerCase();
    let parsedQty = parseInt(qtyRaw, 10);
    if (isNaN(parsedQty)) {
      // Map qualitative text values to sensible integer quantities
      if (qtyRaw.toLowerCase().includes("few")) parsedQty = 10;
      else if (qtyRaw.toLowerCase().includes("many")) parsedQty = 25;
      else if (qtyRaw.toLowerCase().includes("too many") || qtyRaw.toLowerCase().includes("soo many")) parsedQty = 50;
      else parsedQty = 0;
    }

    // Match in DB
    let target = dbMap.get(lower);
    if (!target) {
      for (const [k, v] of dbMap.entries()) {
        if (k.replace(/\s+/g, "") === lower.replace(/\s+/g, "")) {
          target = v;
          break;
        }
      }
    }

    // Also match known aliases
    if (!target) {
      if (lower === "nano") target = dbMap.get("arduino nano");
      else if (lower === "esp 32") target = dbMap.get("esp32 devkit");
      else if (lower === "bc547") target = dbMap.get("bc547");
    }

    if (target) {
      updates.push({
        id: target.id,
        name: target.name,
        sheetName: name,
        rowNumber: i + 1,
        qtyRaw,
        oldQty: target.quantity,
        newQty: parsedQty,
      });

      // Also if this is "nano" and "Arduino Nano" exists, update both
      if (lower === "nano" && dbMap.has("arduino nano")) {
        const nano = dbMap.get("arduino nano");
        if (nano.id !== target.id) {
          updates.push({
            id: nano.id,
            name: nano.name,
            sheetName: name,
            rowNumber: i + 1,
            qtyRaw,
            oldQty: nano.quantity,
            newQty: parsedQty,
          });
        }
      }
      if (lower === "esp 32" && dbMap.has("esp32 devkit")) {
        const esp = dbMap.get("esp32 devkit");
        if (esp.id !== target.id) {
          updates.push({
            id: esp.id,
            name: esp.name,
            sheetName: name,
            rowNumber: i + 1,
            qtyRaw,
            oldQty: esp.quantity,
            newQty: parsedQty,
          });
        }
      }
    } else {
      console.warn(`Could not match row ${i + 1}: ${name}`);
    }
  }

  // Deduplicate updates by ID (take the maximum quantity if duplicate rows exist)
  const deduped = new Map();
  for (const u of updates) {
    if (deduped.has(u.id)) {
      const existing = deduped.get(u.id);
      if (u.newQty > existing.newQty) {
        existing.newQty = u.newQty;
        existing.qtyRaw = u.qtyRaw;
      }
    } else {
      deduped.set(u.id, u);
    }
  }

  console.log(`Total unique components to update in DB: ${deduped.size}`);

  let updatedCount = 0;
  for (const u of deduped.values()) {
    const { error: updateErr } = await supabase
      .from("components")
      .update({ quantity: u.newQty })
      .eq("id", u.id);

    if (updateErr) {
      console.error(`Failed to update ${u.name}:`, updateErr);
    } else {
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} components in Supabase!`);

  // Verify by fetching all components with quantity > 0
  const { data: active } = await supabase
    .from("components")
    .select("name, quantity, unit_cost, sell_price")
    .gt("quantity", 0)
    .order("quantity", { ascending: false });

  console.log(`\nComponents currently in stock (quantity > 0): ${active?.length}`);
  console.log(active?.slice(0, 30));
}

run();
