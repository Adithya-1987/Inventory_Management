import { getComponents } from "@/lib/data";
import { InventoryTable } from "./InventoryTable";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const components = await getComponents(q);

  return <InventoryTable initialComponents={components} initialQuery={q} />;
}
