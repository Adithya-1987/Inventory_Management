import fs from "fs";

const content = fs.readFileSync("google_sheet.csv", "utf8");
const lines = content.split(/\r?\n/);

const items = [];
for (let line of lines) {
  line = line.trim();
  if (!line) continue;
  // Handle basic CSV quoted split
  let match = line.match(/^"([^"]+)",(.*)$/) || line.match(/^([^,]+),(.*)$/);
  if (!match) continue;
  let comp = match[1].trim();
  let rest = match[2].split(",")[0]?.trim();

  if (!comp || comp.toLowerCase() === "component" || comp.toLowerCase() === "old components") {
    continue;
  }
  items.push({ name: comp, qtyRaw: rest });
}

console.log("Total extracted items:", items.length);
console.log("Sample items:", items.slice(0, 25));
