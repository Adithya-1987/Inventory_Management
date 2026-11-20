// Shapes match the future Supabase tables.

export const TX_TYPES = ["sale", "purchase", "adjust"] as const;
export type TxType = (typeof TX_TYPES)[number];

export const REQUEST_STATUSES = ["new", "seen", "ordered", "done", "rejected"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type Component = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit_cost: number;
  sell_price: number;
  location: string;
};

export type Transaction = {
  id: string;
  type: TxType;
  component_id: string;
  qty: number;
  amount: number; // sale +, purchase −, adjust 0. Balance = sum.
  note: string;
  source: "manual" | "agent";
  created_at: string; // ISO
};

// Named ComponentRequest to avoid clashing with the global fetch `Request`.
export type ComponentRequest = {
  id: string;
  branch: string;
  section: string;
  mentor: string;
  message: string;
  file_name: string | null;
  status: RequestStatus;
  admin_note: string;
  created_at: string;
};

export type ActionState = { ok?: boolean; error?: string } | null;
