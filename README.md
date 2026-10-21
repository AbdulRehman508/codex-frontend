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
| **Dashboard** | KPIs vs the previous period, sales trend, payment mix, top products, low stock, purchases and supplier payable |
| **Products** | Catalogue, stock levels, bin assignment, per-product reorder level, unit + pack size, printable barcode labels |
| **Location** | A rack generates every row/column/bin as its own record with a unique code |
| **Sales (POS)** | Multi-tab orders, barcode scanning, credit sales, per-branch sales tax, 80mm receipts with scan-to-pay QR |
| **Purchase** | Supplier bills that raise stock, buy-by-carton conversion, landed cost, batch & expiry, supplier book with payments |
| **Stock** | Adjustments (damage, loss, expiry, recount) as a permanent audit trail, and branch-to-branch transfers |
| **Customers** | Customer book, running borrow balances, recorded repayments |
| **Reports** | Sales, item-wise with cost/profit/margin, stock on hand valued at cost, receivables, payables, expiry — CSV export and print |
| **Profit** | What the shop earned today / this week / this month: revenue less the cost of what sold, against the window before it, hour-by-hour or day-by-day, with the products that earned it. Says so when a product has no cost price, because that reads as pure profit. |
| **Day Close** | One day's takings, credit given, money paid out and the cash that should be in the drawer, printable |
| **User Management** | Offices (admin only), staff, customers |
| **Settings** | Roles, the per-role permission matrix, the activity log and the trash (both admin only) |

### At the counter

The POS quick-add row is built for speed and never needs the mouse:

- **Scan a barcode** → the item lands on the bill immediately.
- Or type a name → `↑`/`↓` to choose → `Enter` → quantity → `Enter`.
- Scanning the same product again tops up its line instead of repeating it.
- Stock is checked as the item is added, not after the bill is finished.

The same row works on the purchase side, with one extra step: a product that
comes in packs (a carton of 24) is entered as cartons and priced per carton —
the bill stores units and the per-unit cost, so stock and margin stay right.

## Architecture

```
src/app/
  core/
    guards/        route gating (auth + permission matrix)
    interceptors/  bearer token, 401 sign-out, 403 notice
    services/      ApiService, office context, permissions, token, QR,
                   barcode, confirm
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
  The picker itself reads `GET profile/offices` — the offices module is
  admin-only, so a manager has no access to the list endpoint, but still needs
  the names of the branches they work in. That call answers every live office
  for an admin and the assigned ones for anyone else.
- **Permissions.** `PermissionService` drives menus and route guards, and the
  API enforces the same matrix independently — the UI is convenience, not
  security.
- **The session is a cookie, not a variable.** Login leaves an httpOnly cookie
  the browser attaches to every call (`withCredentials`); nothing here can read
  the token, so an injected script cannot steal it. localStorage keeps only the
  user object the UI renders from.

## Languages

English and Urdu, switched from the header. Urdu flips the page to
right-to-left (`dir="rtl"` on `<html>`) and sets the text in **Noto Nastaliq
Urdu** — the sloping script Urdu is actually written in, not a Naskh sans. The
font stack puts Inter first: it carries no Arabic, so Latin and digits keep
their own face and every Urdu letter falls through to Nastaliq. Nastaliq needs
the room (line-height 1.95, a point larger, taller table rows), and money,
dates and codes stay left-to-right, so "1,250.00" never renders backwards. The
choice is remembered per browser.

Strings live in `core/i18n/translations.ts` as flat keys, used through the `t`
pipe: `{{ 'nav.sales' | t }}`. A key missing from Urdu falls back to English,
so a screen that has not been translated yet still reads properly.

Covered: every screen — navigation, header, login, the dashboard, the lists,
the POS panel, the add/edit forms, reports, day close, the activity log and the
trash. Dropdown options and stat tiles are built in TypeScript, so those lists
are `computed()` over the translation service rather than plain arrays; that is
what makes them re-render on the language switch. Toast text that comes back
from the API is still English.

**Layout mirrors itself from `dir`.** Components spend logical properties
(`padding-inline-start`, `inset-inline-end`, `border-inline-start`) instead of
left/right, so Urdu moves the rail, the drawers and the icons without a second
stylesheet. A physical `left`/`right` in a component is a bug unless it is a
centring `left: 50%`.

## Theme

Every visual decision is a token in `public/assets/scss/_colors.scss`. Components
spend tokens, they do not invent values, so changing a token moves the whole app.

| Group | Tokens | What they are for |
|---|---|---|
| Brand | `--primary`, `--primary-hover/active/soft`, `--secondary` | Tailwind teal, matched to the logo. The PrimeNG preset in `app.config.ts` points at the same scale, with `darkModeSelector: false` — the app has one theme, and PrimeNG otherwise follows the OS and turns its widgets black on a dark machine. |
| Chart | `--chart-1`, `--chart-2` | data marks only — the UI teal is too muted for bars |
| Surfaces | `--surface`, `--surface-2`, `--surface-3`, `--border-soft` | three layers, so a card on the page and a panel inside it do not dissolve into one white rectangle |
| Elevation | `--shadow-xs/sm/md/lg`, `--shadow-primary` | two-part shadows: a tight contact shadow plus a wider ambient one. A single 4% blur reads as nothing. |
| Shape | `--r-xs/sm/md/lg/pill` | one radius vocabulary |
| Motion | `--ease`, `--ring` | one duration for every hover and press; one keyboard focus ring |

House rules the screens follow:

- **Controls are 36–38px tall with 12–13px labels.** The old 11px text on a 31px
  box read as a link rather than a control, which is most of why the UI felt thin.
- **Table heads are a tinted uppercase band**; rows divide on `--border-soft` and
  wash teal on hover.
- **Charts follow fixed mark specs** — bars capped at 24px with a 4px rounded
  data-end, a 2px surface gap between neighbours, a hairline grid, and a hover
  band wider than the mark.
- **Everything focusable answers the keyboard with `--ring`.**
- **Every control is the same height, including ng-select in "multiple" mode.**
  The stock theme pads a multi-select for chips even when it holds none, which
  made the office picker 49px tall beside a 38px single select with its
  placeholder pinned to the top. `_form.scss` flattens that and lets the box
  grow only once chips are in it.
- **Toasts and the confirm dialog share one card language** (`_toast.scss`): white
  surface, severity on an edge accent and an icon chip, words in ink. A toast
  draws its remaining life as a bar along the bottom — the 4s animation matches
  the `life` set on `<p-toast>` in `app.html`, so change both together.
