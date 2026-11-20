// Run: npx tsx scripts/check-data.ts — asserts the lib/data.ts business rules.
import assert from "node:assert/strict";
import * as d from "../lib/data";

(async () => {
  const lm = (await d.getComponents("LM358"))[0];
  const before = (await d.getStats()).balance;
  const stock = lm.quantity;

  await d.recordSale({ componentId: lm.id, qty: 3 });
  assert.equal(lm.quantity, stock - 3);
  assert.equal((await d.getStats()).balance, before + 3 * lm.sell_price);
  assert.equal((await d.getTransactions({ componentId: lm.id }))[0].type, "sale");

  await assert.rejects(d.recordSale({ componentId: lm.id, qty: lm.quantity + 1 }), /in stock/);
  await assert.rejects(d.recordSale({ componentId: lm.id, qty: 1.5 }), /whole number/);

  await d.recordPurchase({ componentId: lm.id, qty: 10, amount: 50 });
  assert.equal((await d.getStats()).balance, before + 3 * lm.sell_price - 50);

  await assert.rejects(d.deleteComponent(lm.id), /transactions/);
  await assert.rejects(d.addRequest({ branch: "ECE", section: "A", mentor: "M", message: "", file: null }), /message or attach/);
  const big = new File([new Uint8Array(6 * 1024 * 1024)], "big.csv");
  await assert.rejects(d.addRequest({ branch: "ECE", section: "A", mentor: "M", message: "", file: big }), /5MB/);
  await assert.rejects(d.addRequest({ branch: "ECE", section: "A", mentor: "M", message: "", file: new File(["x"], "x.html") }), /not allowed/);
  await assert.rejects(d.addRequest({ branch: "", section: "A", mentor: "M", message: "x", file: null }), /Branch is required/);
  const r = await d.addRequest({ branch: "ECE", section: "A", mentor: "M", message: "", file: new File(["x,y"], "parts.csv") });
  assert.equal((await d.getRequestFile(r.id))?.name, "parts.csv");
  console.log("data checks passed");
})();
