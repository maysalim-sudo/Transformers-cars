# CRM v1 — Design Spec

**Date:** 2026-10-20
**Status:** Approved in brainstorming, awaiting written-spec review
**Scope:** Stock (cars + photos), rental bookings, sales, customers, payments — on Supabase, administered from the existing Next.js 15 app.

---

## 1. Goal

Let the owner and staff of Transformer Tuning Cars manage real stock, rentals and customers from a phone or laptop without touching code, and have the public showroom reflect changes within seconds.

**Success criteria**

- Owner and staff can add a car with photos, publish it, and see it on `/[locale]/showroom` on the next page visit.
- A car can never be double-booked; the database refuses overlapping bookings.
- Staff cannot change prices, publish/feature cars, delete anything, or manage staff — enforced by the database, not only the UI.
- Customer ID data and document scans are never readable by the public.
- Switching the public site from static example data to the CRM changes only `src/lib/listings.ts` (plus the two small one-time changes in §8.5).

**Out of scope for v1:** leads/inquiries (stay on WhatsApp), online payments, customer accounts, PDF contracts/invoices, automatic car status from bookings, reports/analytics.

## 2. Decisions taken

| Question | Decision |
|---|---|
| Who uses the admin | Owner + staff with different permissions (§5) |
| Sale vs rental | A car can be for sale, for rent, or both at once |
| Rental pricing | Optional daily rate; owner decides whether it is shown publicly. Each booking stores its own agreed total (pre-filled days × rate, editable) |
| Sale pricing | Optional sale price; owner decides whether it is shown |
| Car status | Set manually by staff/owner (`available` / `reserved` / `sold` / `rented`). Bookings block dates only; they never change status |
| Deposit / return / payments | Deposit amount, return check (mileage, fuel, damage, amount kept + reason) and a payment log with many entries per booking. The same log is used for sales |
| Customer identity data | All optional: ID/licence numbers, licence expiry, and document scans in a private bucket |
| Admin language | fr / ar / en at `/[locale]/admin`, reusing the site's locale routing and RTL |
| Featured on home page | Owner controls which cars appear in the home "featured" teaser and in what order |
| Architecture | Server-first: Server Components + Server Actions using the signed-in user's session; Postgres RLS enforces permissions (approach 1 of 3; rejected: browser-direct client admin, service-role key with app-level checks) |

## 3. Supabase project & environment

- Target project: `https://ftzqxwgcngeruibjdnhl.supabase.co`
- Env vars (in `.env.local`, git-ignored, and in Vercel project settings):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- **No service-role / secret key is used by the app.** Key values are never written into the repo or docs.
- Auth settings: email + password provider on; **public sign-ups disabled**; password reset email enabled.
- Extensions: `btree_gist` (booking overlap constraint).
- Schema changes only through SQL migrations in `supabase/migrations/`, applied with the Supabase CLI (`supabase db push`). No manual schema edits in the dashboard.

## 4. Data model

Conventions: `id uuid primary key default gen_random_uuid()`, `created_at` / `updated_at timestamptz` (trigger-maintained), `created_by uuid references staff(user_id)` on business tables. Money is `numeric(12,3)` in TND (millimes), displayed rounded via `formatPrice`. Dates are calendar dates in `Africa/Tunis`.

### 4.1 Enums

```
staff_role      : owner | staff
car_status      : available | reserved | sold | rented
booking_status  : booked | out | returned | cancelled
sale_status     : pending | completed | cancelled
payment_kind    : payment | deposit_in | deposit_out
payment_method  : cash | card | transfer | cheque | other
id_type         : cin | passport
document_kind   : id | licence | other
```

### 4.2 Tables

**`staff`** — who may sign in to the admin.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid PK → `auth.users(id)` on delete cascade | |
| `role` | staff_role | |
| `display_name` | text not null | |
| `active` | boolean default true | false = access revoked immediately |

**`cars`** — stock.

| Column | Type | Notes |
|---|---|---|
| `slug` | text unique not null | public `Listing.id`. Check: `^[a-z0-9]+(-[a-z0-9]+)*$` and not ending in `-location` (reserved, §8.1). Generated from name + year on create; owner-only edit afterwards (changing it changes the public URL) |
| `name` | text not null | make + model, e.g. "Ford Mustang GT" |
| `year` | int null | |
| `status` | car_status default `available` | manual |
| `published` | boolean default false | shown on the public site at all — **owner-only** |
| `featured_rank` | int null, > 0, unique **deferrable initially deferred** (so two ranks can be swapped in one transaction) | home teaser order; null = not featured — **owner-only** |
| `for_sale` | boolean default false | |
| `sale_price` | numeric null | **owner-only** |
| `show_sale_price` | boolean default false | **owner-only** |
| `for_rent` | boolean default false | |
| `daily_rate` | numeric null | **owner-only** |
| `show_daily_rate` | boolean default false | **owner-only** |
| `render_model` | text not null default `'sedan'` | must be a `CarModelId` from `src/car/models` (`modelIds`; checked in zod, list mirrored in a DB check — adding a model means a migration) |
| `render_paint` | text not null default `'graphite'` | a `paints[].id` |
| `render_wheel` | text not null default `'split'` | a `WheelStyle['id']` |
| `is_example` | boolean default false | illustrative car, shown with the example note |
| `plate`, `vin` | text null | internal only |
| `mileage` | int null | internal only |
| `notes` | text null | internal only |

Check: `for_sale or for_rent`.

**`car_photos`**

| Column | Type | Notes |
|---|---|---|
| `car_id` | uuid → cars on delete cascade | |
| `path` | text not null | object path in `car-photos` bucket: `{car_id}/{uuid}.{ext}` |
| `position` | int not null | 0 = cover; unique (`car_id`, `position`) deferrable |

**`customers`**

| Column | Type | Notes |
|---|---|---|
| `full_name` | text not null | |
| `phone`, `whatsapp`, `email` | text null | check: at least one not null |
| `address` | text null | |
| `id_type` | id_type null | |
| `id_number` | text null | |
| `licence_number` | text null | |
| `licence_expiry` | date null | admin warns when a booking's dates go past it |
| `notes` | text null | |

**`customer_documents`**

| Column | Type | Notes |
|---|---|---|
| `customer_id` | uuid → customers on delete cascade | |
| `kind` | document_kind | |
| `path` | text not null | object path in private `customer-docs` bucket: `{customer_id}/{uuid}.{ext}` |

**`bookings`**

| Column | Type | Notes |
|---|---|---|
| `car_id` | uuid → cars on delete restrict | |
| `customer_id` | uuid → customers on delete restrict | |
| `starts_on` | date not null | pickup day |
| `ends_on` | date not null | return day; check `ends_on > starts_on` |
| `period` | daterange generated always as `daterange(starts_on, ends_on, '[)')` stored | return day is free for the next renter (same-day turnover) |
| `status` | booking_status default `booked` | |
| `daily_rate` | numeric null | copied from the car at creation |
| `total` | numeric not null | pre-filled `days × daily_rate`, editable |
| `deposit_amount` | numeric default 0 | deposit required |
| `deposit_kept` | numeric default 0 | kept at return |
| `deposit_kept_reason` | text null | required when `deposit_kept > 0` (check) |
| `mileage_out`, `mileage_in` | int null | |
| `fuel_out`, `fuel_in` | smallint null, 0–8 | eighths of a tank |
| `damage_notes` | text null | |
| `returned_at` | timestamptz null | set when status → `returned` |
| `notes` | text null | |

Constraints:
- `exclude using gist (car_id with =, period with &&) where (status <> 'cancelled')` — **no overlapping bookings per car**.
- Trigger `bookings_require_rentable` (before insert, and before update of `car_id`): rejects if the car has `for_rent = false`.

**`sales`**

| Column | Type | Notes |
|---|---|---|
| `car_id` | uuid → cars on delete restrict | |
| `customer_id` | uuid → customers on delete restrict | |
| `sold_on` | date not null | |
| `agreed_price` | numeric not null | |
| `status` | sale_status default `pending` | |
| `notes` | text null | |

Constraint: unique partial index on `(car_id) where status <> 'cancelled'` — one live sale per car.

**`payments`** — append-only log for bookings and sales.

| Column | Type | Notes |
|---|---|---|
| `booking_id` | uuid null → bookings on delete restrict | |
| `sale_id` | uuid null → sales on delete restrict | check `num_nonnulls(booking_id, sale_id) = 1` |
| `kind` | payment_kind | `deposit_in` / `deposit_out` only allowed with `booking_id` (check) |
| `amount` | numeric not null, > 0 | |
| `method` | payment_method | |
| `paid_on` | date not null default today | |
| `received_by` | uuid → staff(user_id) | defaults to `auth.uid()` |
| `note` | text null | |

### 4.3 Derived values (never stored)

Computed in a view `booking_balances` / `sale_balances` (security invoker) or in `src/lib/crm/`:

- Booking amount due = `total − Σ payment`
- Deposit held = `Σ deposit_in − Σ deposit_out − deposit_kept`
- Sale amount due = `agreed_price − Σ payment`
- Overdue booking = `status = 'out' and ends_on < today (Africa/Tunis)`

## 5. Auth, roles and RLS

### 5.1 Sign-in and staff management

- Email + password via Supabase Auth; sign-ups disabled.
- **Bootstrap (one time):** owner account is created in the Supabase dashboard (Auth → Add user), then one SQL insert gives it `role = 'owner'` (documented in the rollout steps).
- **Adding staff:** owner invites the person by email in the Supabase dashboard (Auth → Invite), then on `/admin/staff` adds them by email and picks a role. This calls `staff_add(email text, role staff_role, display_name text)` — a `security definer` function that checks `is_owner()`, looks the user up in `auth.users` by email, and inserts the `staff` row.
- **Deactivating:** owner sets `active = false`; all policies check `active`, so access ends on the next request.

### 5.2 Helper functions

`is_staff()` and `is_owner()` — `security definer`, `stable`, `set search_path = ''`, returning whether `auth.uid()` has an **active** `staff` row (with role `owner` for `is_owner`).

### 5.3 Permission matrix

| Action | Owner | Staff | Public (anon) |
|---|---|---|---|
| Read all CRM tables | ✅ | ✅ | ❌ (no table grants) |
| Insert/update cars (non-guarded columns), car_photos | ✅ | ✅ | ❌ |
| Change `sale_price`, `show_sale_price`, `daily_rate`, `show_daily_rate`, `published`, `featured_rank`, `slug` (after insert) | ✅ | ❌ | ❌ |
| Insert/update customers, customer_documents, bookings, sales | ✅ | ✅ | ❌ |
| Insert payments | ✅ | ✅ | ❌ |
| Update payments | ✅ | ❌ | ❌ |
| Delete any row / storage object | ✅ | ❌ | ❌ |
| Manage staff | ✅ | ❌ (read only, to show names) | ❌ |
| Read published, unsold cars via `public_cars()` / `public_car()` | ✅ | ✅ | ✅ |

### 5.4 Policies

- RLS enabled on every table. No policies for `anon` on tables.
- `select`: `is_staff()` on all CRM tables.
- `insert` / `update`: `is_staff()` on cars, car_photos, customers, customer_documents, bookings, sales; `insert` only for payments; `update` on payments `is_owner()`.
- `delete`: `is_owner()` on every table. FKs with `restrict` mean a car or customer with history cannot be deleted; the UI offers "unpublish" / keeps the record instead.
- `staff`: `select` `is_staff()`; `insert`/`update`/`delete` `is_owner()`.
- **Column guard trigger `cars_owner_fields`** (before insert or update on cars): if not `is_owner()`, then on insert the guarded columns must be at their defaults (`published = false`, `featured_rank is null`, prices/visibility null/false) — so staff-created cars are drafts; on update any change to a guarded column raises `insufficient_privilege` with a message key `owner_only_field`.

### 5.5 Public read functions

`public_cars()` returns setof a composite with only safe columns, and `public_car(p_slug text)` returns one row:

```
slug, name, year, status, for_sale, for_rent,
sale_price  -- = case when show_sale_price then sale_price end
daily_rate  -- = case when show_daily_rate then daily_rate end
render_model, render_paint, render_wheel,
featured_rank, is_example, created_at,
photos text[]  -- car_photos.path ordered by position
```

Filtered to `published and status <> 'sold'`. Both are `security definer`, `stable`, `set search_path = ''`, `grant execute to anon, authenticated`. Plate, VIN, mileage, notes, customers and bookings are unreachable through them.

## 6. Storage

| Bucket | Visibility | Path | Policies | Limits |
|---|---|---|---|---|
| `car-photos` | **public** (read by URL) | `{car_id}/{uuid}.{ext}` | insert/update: `is_staff()`; delete: `is_owner()` | 10 MB; `image/jpeg`, `image/png`, `image/webp` |
| `customer-docs` | **private** | `{customer_id}/{uuid}.{ext}` | select/insert: `is_staff()`; delete: `is_owner()` | 10 MB; jpeg/png/webp/`application/pdf` |

- Car photos are served through Next `<Image>` from `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/car-photos/<path>`.
- Customer documents are only opened through signed URLs valid for 60 s, created server-side for a signed-in staff member.
- Deleting a `car_photos` / `customer_documents` row (owner) removes the storage object in the same Server Action.
- Photos of unpublished cars are technically readable by anyone who knows the random path; accepted for v1 (nothing sensitive in car photos).

## 7. Admin app (`/[locale]/admin`)

### 7.1 Layout restructure (one-time, URLs unchanged)

The current `src/app/[locale]/layout.tsx` wraps every page with `Nav`, `Footer` and `WhatsAppFloat`. To give the admin its own shell:

- `src/app/[locale]/layout.tsx` keeps only `<html lang dir>`, `<body>`, fonts, metadata.
- Existing public pages (`page.tsx`, `diagnose/`, `showroom/`) move into `src/app/[locale]/(site)/` with a `layout.tsx` holding `Nav`, `Footer`, `WhatsAppFloat` and the skip link.
- `src/app/[locale]/admin/layout.tsx` is the admin shell: sidebar (desktop) / bottom tabs (phone), language switch, signed-in user + role, sign-out.

This move must be coordinated with whichever session is editing those pages at the time.

### 7.2 i18n

Admin strings live in `src/i18n/admin/{fr,ar,en}.ts` (same shape pattern as `src/i18n/strings/`), loaded only by admin routes. RTL via the existing `localeDir`. Admin pages are dynamic (`export const dynamic = "force-dynamic"`) and inherit `robots: noindex`.

### 7.3 Access gate

- `src/middleware.ts` keeps its locale redirect unchanged; for paths matching `/<locale>/admin` it additionally refreshes the Supabase session cookie (`@supabase/ssr` pattern). Public paths are not touched, so they stay cacheable.
- `admin/layout.tsx` (server) fetches the user and their `staff` row; no session or inactive → redirect to `/[locale]/admin/login`. The role is passed down to grey out owner-only controls.
- `admin/login` lives outside the gated layout (route group `admin/(auth)/login` vs `admin/(app)/...`).

### 7.4 Screens

| Route | Content |
|---|---|
| `admin/login` | Email + password, "forgot password" (Supabase reset email) |
| `admin` | **Today**: pickups due, returns due, cars currently out, overdue returns, bookings/sales with an outstanding balance |
| `admin/cars` | List with filters: status, sale/rent, published, featured |
| `admin/cars/new`, `admin/cars/[id]` | Edit form; photo upload, drag to reorder (first = cover), delete (owner); drawing fallback picker (model/paint/wheel) with live `CarView` preview; upcoming bookings of this car; owner-only fields disabled for staff |
| `admin/customers`, `admin/customers/[id]` | Search by name/phone; contact + optional ID fields; document scans (upload, open via signed URL, delete for owner); history of bookings and sales with balances |
| `admin/bookings` | List (filters: status, car, date) + month calendar per car |
| `admin/bookings/new` | Pick car (rentable only) and dates → live availability check; find or quick-create customer; total pre-filled from days × rate, editable; licence-expiry warning |
| `admin/bookings/[id]` | Details; **check-out** (mileage/fuel out, deposit taken → `deposit_in` payment, status `out`); **return** (mileage/fuel in, damage notes, deposit kept + reason, deposit refunded → `deposit_out` payment, status `returned`); payment log; cancel |
| `admin/sales`, `admin/sales/new`, `admin/sales/[id]` | Car (for sale only), customer, agreed price, status, payment log |
| `admin/staff` | Owner only: add by email, change role, deactivate |

### 7.5 Saving and errors

- Every mutation is a Server Action: parse input with **zod** → call Supabase with the session client (RLS applies) → on car/photo changes `revalidateTag("listings")` → return `{ ok } | { error: messageKey, params }`.
- `src/lib/crm/errors.ts` maps database errors to localized messages, e.g.:
  - exclusion violation `23P01` on bookings → "This car is already booked from {start} to {end}" (the action queries the clashing booking for the dates)
  - `owner_only_field` → "Only the owner can change prices, publishing or featured cars"
  - FK restrict `23503` on delete → "This record has bookings or sales; unpublish it instead"
  - unique `23505` on `sales(car_id)` → "This car already has an active sale"
- Forms keep user input on error and show the message inline.

## 8. Public read path

### 8.1 Mapping in `src/lib/listings.ts`

Each row of `public_cars()` becomes one or two `Listing`s:

| Car | Listing |
|---|---|
| `for_sale` | `{ id: slug, kind: "sale", price: sale_price ?? undefined }` |
| `for_rent` | `{ id: for_sale ? slug + "-location" : slug, kind: "rental", price: daily_rate ?? undefined }` |
| every listing | `name`, `year ?? undefined`, `status`, `render: { model: render_model, paint: render_paint, wheel: render_wheel }`, `photo` = public URL of `photos[0]`, `photos` = public URLs of the rest, `example: is_example` |

`getListing(id)`: if `id` ends in `-location`, strip it, call `public_car(base)` and return its rental listing (only if `for_rent and for_sale`); otherwise call `public_car(id)` and return its sale listing, or its rental listing when it is rental-only.

Note: if a rental-only car later also becomes for sale, its rental URL changes from `<slug>` to `<slug>-location`; accepted.

### 8.2 Ordering

1. "Primary" listings of featured cars (`featured_rank` not null), by rank — primary = the sale listing if `for_sale`, else the rental listing.
2. Everything else (including the secondary rental listing of featured dual cars), newest `created_at` first.

`getListings(kind)` filters after ordering. This keeps `FeaturedCars` (first 3 of `getListings()`) showing distinct featured cars with no UI change.

### 8.3 Freshness

- Reads use a cookie-less client (`src/lib/supabase/public.ts`) with the publishable key, wrapped in `unstable_cache(..., { tags: ["listings"] })`.
- Server Actions that change a car or its photos call `revalidateTag("listings")`, invalidating the home teaser, showroom grid and detail pages.
- `generateStaticParams` in `showroom/[id]` stays; new slugs render on demand (`dynamicParams` default true); removed/sold cars 404 after revalidation.

### 8.4 Failure and fallback

- If a Supabase read throws during regeneration, Next keeps serving the last good page. At build time an error fails the build.
- If `NEXT_PUBLIC_SUPABASE_URL` is unset, `listings.ts` returns the static example list from `src/config/inventory.ts` exactly as today. Adding the env vars on Vercel is the switch-over.

### 8.5 One-time changes outside `listings.ts`

1. `next.config`: `images.remotePatterns` entry for `https://ftzqxwgcngeruibjdnhl.supabase.co/storage/v1/object/public/car-photos/**`.
2. Rental prices are per day: `ListingCard` and the detail page show a "/ day" suffix (localized) for `kind === "rental"`, and the `Listing.price` doc comment says "TND; per day for rentals". Correct with static data too, so the showroom work can land it now.

### 8.6 Seed

A migration inserts the four current example cars (`mustang-gt`, `camaro-ss`, `panamera`, `range-rover-sport`) with the same render settings, `is_example = true`, `published = true`, so the site looks identical on switch-over. The owner deletes them once real stock exists.

## 9. Code layout

```
supabase/
  migrations/
    <ts>_crm_schema.sql          enums, tables, constraints, triggers, balance views
    <ts>_crm_rls.sql             helpers, policies, column guard, staff_add, public_car(s)
    <ts>_crm_storage.sql         buckets + storage policies
    <ts>_crm_seed_examples.sql   four example cars
  tests/                         pgTAP tests (§10)
src/lib/supabase/
  server.ts                      session client for admin (@supabase/ssr, cookies)
  public.ts                      cookie-less client for the showroom
  types.ts                       generated: supabase gen types typescript
src/lib/crm/
  money.ts        rental days, default total, balances
  mapping.ts      public_cars row → Listing[], ordering (pure)
  errors.ts       DB error → message key
  schemas.ts      zod schemas for every form
src/lib/listings.ts              uses mapping.ts + public.ts; static fallback
src/i18n/admin/{fr,ar,en}.ts
src/app/[locale]/(site)/...      existing public pages (moved)
src/app/[locale]/admin/(auth)/login/page.tsx
src/app/[locale]/admin/(app)/... screens from §7.4, each with an actions.ts
```

New dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `zod`. Dev: Supabase CLI (local stack for tests).

## 10. Testing

**Vitest (existing setup)** — pure units:
- `mapping.ts`: sale-only, rental-only and dual cars; `-location` id; hidden prices → `undefined`; photo URLs; featured ordering with no car twice in the first slots; `kind` filtering.
- `listings.ts`: static fallback when env is unset; `getListing` with and without `-location`.
- `money.ts`: day counts across month ends, totals, deposit and balance maths.
- `errors.ts`: each mapped Postgres code.

**Database (pgTAP via `supabase test db`, local stack):**
- Overlapping bookings for the same car rejected; same-day turnover (`ends_on` = next `starts_on`) allowed; cancelled bookings don't block.
- Booking on a `for_rent = false` car rejected.
- Staff: cannot change guarded car columns, cannot insert a published/featured car, cannot delete any row, cannot update payments, cannot write `staff`.
- Inactive staff: no access.
- Anon: no select on any table; `public_cars()` excludes unpublished and sold cars, never returns internal columns, returns null for hidden prices.
- Storage: anon cannot read `customer-docs`; staff cannot delete objects.

**Manual walkthrough** (phone, fr/ar/en): add car → publish → appears on showroom within seconds → feature it → appears in home teaser → create booking → clash message on overlapping dates → check-out → return with deposit kept → payments bring balance to zero → staff account cannot edit price.

## 11. Rollout

1. Build schema, admin and tests against the local Supabase stack; the public site keeps static data (env unset in production).
2. Apply migrations to the hosted project; create the owner user and run the one-time owner insert; invite staff.
3. Owner adds real cars and photos.
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` on Vercel and redeploy — showroom now reads the CRM.
5. Owner deletes the example cars.
