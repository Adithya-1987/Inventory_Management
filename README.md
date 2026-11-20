# Inventory Management Website

Admin-only inventory and transaction tracking, a prompt-driven agent ("sold 5 LM358 for 200"), and a public page where anyone can post component requests (text or uploaded sheet).

Built **step by step**:
1. **Website (current step)** — UI and routing with in-memory sample data.
2. **Database** — Supabase tables, atomic sale/purchase functions, row-level security, storage for uploaded sheets, real login.
3. **Agent** — free/local model with tools (search, sell, restock, adjust, list requests). Write actions need a Confirm click.
4. **Deploy.**

## Step 1: Website

Stack: **Next.js (App Router, TypeScript) + Tailwind**. No database, login system or AI model yet.

### Structure
```
app/
  layout.tsx, page.tsx          → landing, links to /request and /login
  request/page.tsx              → public form: name, contact, message, file (csv/xlsx/pdf/img, ≤5MB)
  login/page.tsx                → login form (placeholder, wired in DB step)
  admin/layout.tsx              → sidebar nav: Dashboard, Inventory, Transactions, Requests
  admin/page.tsx                → balance, today's sales, low-stock list, agent chat box (UI only, disabled)
  admin/inventory/page.tsx      → table + search, add/edit/delete, quick Sell / Restock dialogs
  admin/transactions/page.tsx   → log with filters (date, type, component), CSV export
  admin/requests/page.tsx       → list requests, view message, download file, set status/note
lib/data.ts                     → ALL data access (getComponents, recordSale, addRequest, …) backed by in-memory seed data
lib/types.ts                    → Component, Transaction, Request types (match future DB tables)
```

### Rules
- Every page calls only `lib/data.ts`. The database step rewrites that one file against Supabase; pages don't change.
- Types match future tables:
  - **Component**: id, name, category, quantity, unit_cost, sell_price, location
  - **Transaction**: id, type (sale | purchase | adjust), component_id, qty, amount, note, source (manual | agent), created_at
  - **Request**: id, name, contact, message, file_name, status (new | seen | ordered | done | rejected), admin_note, created_at
- Balance = sum of transaction amounts (computed, never stored).
- `recordSale` rejects qty greater than stock (same rule the DB will enforce).
- Agent chat box is a UI shell only (input, message list, confirm-action card) until the agent step.

> **Warning:** `/admin/*` has no auth in this step. Do not deploy publicly until the database/login step is done.

### Verification
- `npm run build` passes; `npm run dev` → click through all pages.
- Inventory: add component, sell 3 → stock drops, transaction appears, dashboard balance rises. Selling more than stock shows an error.
- Request form: submit with file → appears in `/admin/requests`; status change persists until server restart (in-memory).
