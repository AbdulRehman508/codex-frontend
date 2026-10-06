# Codex — Multi-Branch Inventory & POS

Angular 20 front end for the Codex inventory and point-of-sale system.
Pairs with the NestJS API in `codex-backend`.

## Requirements

- Node 20+
- The API running (default `http://localhost:3000/api`)

## Setup

```bash
npm install
npm start
```

Open `http://localhost:4200` and sign in with the seeded admin
(`admin@codex.com` / `Admin@123456`).

> **Pick an office in the top bar first.** Products, sales, customers, racks and
> reports are all scoped to the selected branch, so every list stays empty until
> an office is chosen.

## Builds

```bash
npm run build                      # production bundle -> dist/
npm run build -- --configuration development
```

The production build swaps `environment.ts` for `environment.prod.ts`, which
points the API at the relative path `/api`. Serve the bundle behind a host that
proxies `/api` to the backend (nginx, IIS, Apache, or the Node server), and the
same build works on any domain.

## What it does

| Module | Notes |
|---|---|
| **Dashboard** | KPIs vs the previous period, sales trend, payment mix, top products, low stock |
| **Products** | Catalogue, stock levels, bin assignment |
| **Location** | A rack generates every row/column/bin as its own record with a unique code |
| **Sales (POS)** | Multi-tab orders, barcode scanning, credit sales, 80mm receipts with scan-to-pay QR |
| **Customers** | Customer book, running borrow balances, recorded repayments |
| **Reports** | Sales, item-wise sales, stock on hand, receivables — with CSV export and print |
| **User Management** | Offices (admin only), staff, customers |
| **Settings** | Roles and the per-role permission matrix |

### At the counter

The POS quick-add row is built for speed and never needs the mouse:

- **Scan a barcode** → the item lands on the bill immediately.
- Or type a name → `↑`/`↓` to choose → `Enter` → quantity → `Enter`.
- Scanning the same product again tops up its line instead of repeating it.
- Stock is checked as the item is added, not after the bill is finished.

## Architecture

```
src/app/
  core/
    guards/        route gating (auth + permission matrix)
    interceptors/  bearer token, 401 sign-out, 403 notice
    services/      ApiService, office context, permissions, token, QR, confirm
  layout/          shell: header, sidebar
  pages/           one folder per feature (component + .api.ts + .model.ts)
```

### Conventions

- **All HTTP goes through `ApiService`.** Feature API clients delegate to it and
  unwrap the `{ success, message, data }` envelope; components never inject
  `HttpClient` directly.
- **Standalone components, signals, zoneless change detection.** Lists keep
  their state in signals; reloads triggered from an `effect` run inside
  `untracked()` so a response writing `page`/`limit` cannot re-trigger the
  effect that fetched it.
- **Office scoping.** `OfficeContextService` holds the selected branch and
  remembers it on the user record, so the same office returns after a new login.
- **Permissions.** `PermissionService` drives menus and route guards, and the
  API enforces the same matrix independently — the UI is convenience, not
  security.

## Theme

Brand colours live in `public/assets/scss/_colors.scss` (Tailwind teal, matched
to the logo). `--primary` and its tints, plus the chart colours, are defined
once there; the PrimeNG preset in `app.config.ts` points at the same scale.
