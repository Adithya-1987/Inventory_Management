import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Please supply NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// Old existing components list and their prices
const OLD_COMPONENTS = [
  { name: "LM358", category: "IC", quantity: 42, unit_cost: 6, sell_price: 12, location: "Drawer A1" },
  { name: "NE555", category: "IC", quantity: 7, unit_cost: 5, sell_price: 10, location: "Drawer A1" },
  { name: "1N4007", category: "Diode", quantity: 300, unit_cost: 0.5, sell_price: 1, location: "Drawer B2" },
  { name: "BC547", category: "Transistor", quantity: 150, unit_cost: 1, sell_price: 2, location: "Drawer B3" },
  { name: "10k Resistor", category: "Resistor", quantity: 900, unit_cost: 0.2, sell_price: 0.5, location: "Drawer C1" },
  { name: "100uF 25V Capacitor", category: "Capacitor", quantity: 60, unit_cost: 2, sell_price: 4, location: "Drawer C2" },
  { name: "7805 Regulator", category: "IC", quantity: 4, unit_cost: 8, sell_price: 15, location: "Drawer A2" },
  { name: "Arduino Nano", category: "Board", quantity: 12, unit_cost: 220, sell_price: 320, location: "Shelf 1" },
  { name: "ESP32 DevKit", category: "Board", quantity: 3, unit_cost: 380, sell_price: 520, location: "Shelf 1" },
  { name: "HC-05 Bluetooth", category: "Module", quantity: 9, unit_cost: 210, sell_price: 300, location: "Shelf 2" },
];

function matchOldComponent(name) {
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const old of OLD_COMPONENTS) {
    const o = old.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (n === o || n.includes(o) || o.includes(n)) return old;
  }
  // Specific aliases
  if (n.includes("nano")) return OLD_COMPONENTS.find(c => c.name === "Arduino Nano");
  if (n.includes("esp32") && !n.includes("cam") && !n.includes("cable")) return OLD_COMPONENTS.find(c => c.name === "ESP32 DevKit");
  if (n.includes("555")) return OLD_COMPONENTS.find(c => c.name === "NE555");
  if (n.includes("7805") || n.includes("l7805")) return OLD_COMPONENTS.find(c => c.name === "7805 Regulator");
  if (n.includes("bc547")) return OLD_COMPONENTS.find(c => c.name === "BC547");
  if (n.includes("in4007") || n.includes("1n4007")) return OLD_COMPONENTS.find(c => c.name === "1N4007");
  if (n.includes("lm358")) return OLD_COMPONENTS.find(c => c.name === "LM358");
  if (n.includes("hc05")) return OLD_COMPONENTS.find(c => c.name === "HC-05 Bluetooth");
  if (n === "resistor" || n === "resistors") return OLD_COMPONENTS.find(c => c.name === "10k Resistor");
  if (n === "capacitor" || n === "capacitors" || n.includes("ceramiccapicitor")) return OLD_COMPONENTS.find(c => c.name === "100uF 25V Capacitor");

  return null;
}

function detectCategory(name) {
  const n = name.toLowerCase();
  if (n.includes("sensor") || n.includes("ldr") || n.includes("mpu") || n.includes("oximeter") || n.includes("dth11") || n.includes("tds") || n.includes("lidar")) return "Sensor";
  if (n.includes("motor") || n.includes("servo") || n.includes("pump")) return "Motor";
  if (n.includes("board") || n.includes("uno") || n.includes("nano") || n.includes("esp") || n.includes("rasberry") || n.includes("pi")) return "Board";
  if (n.includes("module") || n.includes("bluetooth") || n.includes("driver") || n.includes("relay") || n.includes("conventor") || n.includes("converter") || n.includes("bridge") || n.includes("boost") || n.includes("shifter") || n.includes("amplifier") || n.includes("rtc")) return "Module";
  if (n.includes("display") || n.includes("oled") || n.includes("lcd") || n.includes("matrix")) return "Display";
  if (n.includes("ic") || n.includes("regulator")) return "IC";
  if (n.includes("diode") || n.includes("transistor") || n.includes("resistor") || n.includes("capacitor") || n.includes("led")) return "Passive";
  if (n.includes("battery") || n.includes("cell") || n.includes("power") || n.includes("solar") || n.includes("connector") || n.includes("transformer")) return "Power";
  return "General";
}

function formatComponentName(raw) {
  let name = raw.trim().replace(/^"|"$/g, "").trim();
  // Standardize common names
  return name;
}

async function run() {
  const content = fs.readFileSync("google_sheet.csv", "utf8");
  const lines = content.split(/\r?\n/);

  const map = new Map(); // lowercase name -> object

  // Add the old existing components first so they are present
  for (const old of OLD_COMPONENTS) {
    map.set(old.name.toLowerCase(), {
      name: old.name,
      category: old.category,
      quantity: old.quantity,
      unit_cost: old.unit_cost,
      sell_price: old.sell_price,
      location: old.location,
    });
  }

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    let match = line.match(/^"([^"]+)",(.*)$/) || line.match(/^([^,]+),(.*)$/);
    if (!match) continue;
    let rawName = match[1].trim();
    let qtyRaw = match[2].split(",")[0]?.trim();

    if (!rawName || rawName.toLowerCase() === "component" || rawName.toLowerCase() === "old components") {
      continue;
    }

    const key = rawName.toLowerCase();
    const parsedQty = parseInt(qtyRaw, 10);
    const qty = !isNaN(parsedQty) && parsedQty >= 0 ? parsedQty : 0;

    const matchedOld = matchOldComponent(rawName);

    if (map.has(key)) {
      const existing = map.get(key);
      // Combine quantities if both have stock
      if (qty > 0 && existing.quantity === 0) existing.quantity = qty;
    } else {
      map.set(key, {
        name: rawName,
        category: matchedOld ? matchedOld.category : detectCategory(rawName),
        quantity: matchedOld && qty === 0 ? matchedOld.quantity : qty,
        unit_cost: matchedOld ? matchedOld.unit_cost : 0, // 0 for "-"
        sell_price: matchedOld ? matchedOld.sell_price : 0, // 0 for "-"
        location: matchedOld ? matchedOld.location : "General Store",
      });
    }
  }

  const componentsToInsert = Array.from(map.values());
  console.log(`Prepared ${componentsToInsert.length} unique components.`);

  const withPrice = componentsToInsert.filter(c => c.unit_cost > 0 || c.sell_price > 0);
  console.log(`Components with old price/cost (${withPrice.length}):`);
  withPrice.forEach(c => console.log(`  - ${c.name} [${c.category}]: Cost ₹${c.unit_cost}, Price ₹${c.sell_price}, Qty: ${c.quantity}`));

  const withoutPrice = componentsToInsert.filter(c => c.unit_cost === 0 && c.sell_price === 0);
  console.log(`Components without price (will show as "-"): ${withoutPrice.length}`);

  // Fetch existing components from Supabase
  const { data: existingDb } = await supabase.from("components").select("id, name");
  const existingMap = new Map((existingDb || []).map(c => [c.name.toLowerCase(), c.id]));

  console.log(`Found ${existingMap.size} existing items in DB.`);

  let inserted = 0;
  let updated = 0;

  for (const c of componentsToInsert) {
    const key = c.name.toLowerCase();
    if (existingMap.has(key)) {
      const id = existingMap.get(key);
      const { error } = await supabase.from("components").update({
        category: c.category,
        quantity: c.quantity,
        unit_cost: c.unit_cost,
        sell_price: c.sell_price,
        location: c.location,
      }).eq("id", id);
      if (error) console.error(`Error updating ${c.name}:`, error);
      else updated++;
    } else {
      const { error } = await supabase.from("components").insert(c);
      if (error) console.error(`Error inserting ${c.name}:`, error);
      else inserted++;
    }
  }

  console.log(`Finished: ${inserted} inserted, ${updated} updated!`);
}

run().catch(console.error);
