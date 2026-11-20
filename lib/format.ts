const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export const money = (n: number) => inr.format(n);
/** Local calendar day as YYYY-MM-DD. */
export const day = (iso: string) => new Date(iso).toLocaleDateString("en-CA");
export const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
