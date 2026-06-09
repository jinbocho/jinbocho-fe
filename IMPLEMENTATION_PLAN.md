# Jinbocho Frontend — Implementation Plan

A single-page application for a family home-library manager. Talks directly to the API Gateway. Static build, deployed on Render.

---

## 0. Critical Backend Facts (read first — these shape the whole app)

These were verified against the backend source and override naive assumptions:

1. **Reading-status enum is `to_read` | `reading` | `read`** (NOT "completed" — verified against `enums.py` and the domain entity `ReadingStatus.READ = "read"`). Use these exact values everywhere.
2. **The owned-book record carries no title/author/cover.** `GET /v1/books/` returns `OwnedBookResponse` with only `bibliographic_record_id` + location + status. Title, author, ISBN, publisher, cover live on the **bibliographic record** (`/v1/records/`). Every book list must **join** owned books to their records client-side.
3. **There is no stats/dashboard endpoint.** The dashboard is derived client-side by aggregating the books + rooms lists. Fine for a home library (hundreds of books, not millions).
4. **Search lives on records, not books.** `GET /v1/records/?q=` searches title/author/ISBN. `GET /v1/books/` supports only `limit`/`offset`. Filtering by room/reading-status is therefore **client-side** over the loaded set.
5. **`POST /v1/books/{id}/position` and `/reading-status` take query params, not a JSON body.** The HTTP client must send these as query string.
6. **Register returns no token** — only `{ family_id, user_id }`. After registering, immediately call login.
7. **The JWT access token encodes `sub` (user_id), `email`, `family_id`, `role`, `exp`.** Decode it client-side to get the current user's role and family_id without an extra request. Access token lives 30 min; refresh rotates (old refresh is revoked on use).
8. **`GET /v1/bookcases/?room_id=` filters server-side.** Sections and shelves are fetched per parent. The location tree is navigable without loading everything.

---

## 1. Tech Stack Decision

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | **React 18 + TypeScript (strict)** | Largest ecosystem and hiring pool; best long-term maintainability for handoff. The app is CRUD-over-REST — React's maturity wins over Svelte's brevity here. |
| Build tool | **Vite** | Required; fast HMR, first-class TS, trivial static build for Render. |
| Styling | **Tailwind CSS** | Utility-first keeps the bundle lean and the design system enforced via config tokens (no runtime CSS-in-JS cost). Mobile-first breakpoints are built in. |
| Server state | **TanStack Query v5** | The books↔records join and the no-stats dashboard both lean on cache normalization, dedup, and background refetch. This is the backbone of the app. |
| Client state | **Zustand** | One tiny store for auth/session only. Everything else is server state in TanStack Query. |
| Routing | **React Router v6** (`createBrowserRouter`) | Standard client-side routing with nested layouts and `loader`-free data (data comes from TanStack Query). |
| HTTP client | **ky** | Tiny fetch wrapper; clean hooks for attaching the bearer token and a 401→refresh→retry interceptor. |
| Forms | **React Hook Form + Zod** | Zod schemas double as runtime validation and TS types; minimal re-renders. |
| Barcode scan | **@zxing/browser** | ISBN scanning from the device camera; works on mobile Safari/Chrome over HTTPS. |
| Testing | **Vitest + React Testing Library** | Vite-native unit + component tests. |
| Lint/format | **ESLint + Prettier** | Standard. |

---

## 2. Project Structure

```
jinbocho-fe/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx                  # App bootstrap: router + QueryClient + providers
│   ├── App.tsx                   # Route tree definition
│   ├── routes/                   # One folder per page (route component + page-local pieces)
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── books/
│   │   │   ├── BookCatalogPage.tsx
│   │   │   ├── BookDetailPage.tsx
│   │   │   └── AddBookPage.tsx          # ISBN quick-add + manual
│   │   ├── locations/
│   │   │   ├── LocationsPage.tsx        # room→bookcase→section→shelf tree
│   │   │   └── BookcaseMapPage.tsx      # visual grid
│   │   ├── users/UsersPage.tsx          # admin only
│   │   └── settings/SettingsPage.tsx
│   ├── components/               # Reusable, route-agnostic UI
│   │   ├── ui/                   # Design-system primitives (Button, Input, Card, Modal, Badge…)
│   │   ├── layout/               # AppShell, Sidebar, BottomNav, TopBar
│   │   └── feedback/             # EmptyState, ErrorState, Spinner, Toast
│   ├── features/                 # Domain logic per area: queries, mutations, types, helpers
│   │   ├── auth/                 # useLogin, useRegister, token store, jwt decode, guards
│   │   ├── books/                # useBooks, useBookWithRecord, mutations, join helpers
│   │   ├── records/              # useRecords (search), useIsbnLookup
│   │   ├── locations/            # useRooms/useBookcases/useSections/useShelves + map
│   │   ├── users/                # useUsers, useCurrentUser
│   │   └── family/               # useFamily
│   ├── lib/
│   │   ├── api.ts                # ky instance + auth/refresh interceptors
│   │   ├── queryClient.ts        # TanStack Query config
│   │   ├── jwt.ts                # decode + expiry helpers
│   │   └── format.ts             # date/price/label formatters
│   ├── types/
│   │   └── api.ts                # Hand-written TS types mirroring backend schemas
│   ├── hooks/                    # Generic hooks (useDebounce, useMediaQuery)
│   └── styles/
│       └── index.css             # Tailwind directives + base layer
├── .env.example                  # VITE_API_BASE_URL=
├── index.html
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
├── package.json
└── render.yaml                   # Render static-site config
```

Convention: `features/` holds the data layer (TanStack hooks + types + pure helpers, no JSX); `routes/` and `components/` hold JSX. A route composes feature hooks and UI primitives.

---

## 3. Design System

A warm, calm, readable aesthetic — a family bookshelf, not a dashboard. Defined as Tailwind config tokens.

### Color palette

| Token | Hex | Use |
|-------|-----|-----|
| `paper` | `#FBF7F0` | App background (warm off-white) |
| `ink` | `#2B2622` | Primary text (warm near-black) |
| `ink-soft` | `#6B6259` | Secondary text |
| `brand` | `#A8503A` | Primary actions (terracotta) |
| `brand-soft` | `#C97B5E` | Hover / accents |
| `sage` | `#7A8B6F` | Success / "read" status |
| `amber` | `#C9912E` | "reading" status |
| `stone` | `#9A9187` | "to_read" status / muted |
| `surface` | `#FFFFFF` | Cards, modals |
| `line` | `#E7DFD3` | Borders, dividers |
| `danger` | `#B3402E` | Destructive actions, errors |

Reading-status → color mapping: `to_read`→stone, `reading`→amber, `read`→sage. Centralize this in `lib/format.ts`.

### Typography

- **Display/headings**: `"Fraunces"` (serif, bookish warmth), weights 400/600.
- **Body/UI**: `"Inter"` (sans, legible), weights 400/500/600.
- Scale (rem): `xs .75 / sm .875 / base 1 / lg 1.125 / xl 1.25 / 2xl 1.5 / 3xl 1.875`.
- Line-height 1.5 body, 1.2 headings.

### Spacing & layout

- Spacing scale: Tailwind default (4px base): `1,2,3,4,6,8,12,16`.
- Radius: `sm .375rem`, `md .5rem`, `lg .75rem`, `full`.
- Shadow: one soft elevation token `shadow-card` (`0 1px 3px rgba(43,38,34,.08)`).
- Container max-width `screen-lg` (1024px), centered, `px-4` gutters.
- **Mobile-first**: design at 320px, enhance at `sm:640 md:768 lg:1024`. Bottom tab nav on mobile, left sidebar on `md+`.
- Tap targets ≥ 44px.

### Component inventory (`components/ui/`)

`Button` (variants: primary/secondary/ghost/danger; sizes sm/md; loading state) · `IconButton` · `Input` · `Textarea` · `Select` · `Checkbox` · `Card` · `Modal` (focus-trapped, ESC to close, mobile = bottom sheet) · `Badge` (status pill) · `Avatar` · `Tabs` · `Dropdown` · `Toast` (provider + `useToast`) · `Spinner` · `Skeleton` · `EmptyState` (icon + message + CTA) · `ErrorState` (message + retry) · `ConfirmDialog` · `Pagination` · `SearchInput` (debounced) · `BookCover` (image with placeholder fallback).

All primitives: semantic HTML, visible focus ring, ARIA labels, keyboard operable.

---

## 4. Authentication Flow

### Token storage — decision

**Access token in memory (Zustand), refresh token in `localStorage`.**

Trade-off: the backend issues tokens in JSON bodies (not httpOnly cookies), so a pure-cookie strategy isn't available without backend changes. Keeping the access token in memory limits its XSS exposure window; the refresh token in `localStorage` is the pragmatic cost of surviving page reloads. Documented as a known trade-off; revisit if the gateway later sets httpOnly cookies.

### Session store (Zustand)

```ts
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;        // mirrored to localStorage
  user: { id: string; email: string; familyId: string; role: Role } | null; // decoded from JWT
  setSession(access: string, refresh: string): void;  // decodes JWT → user
  clear(): void;
}
```

On app boot: read `refreshToken` from `localStorage`; if present, call `/v1/auth/refresh` to obtain an access token before rendering guarded routes (show a splash while pending).

### Refresh logic (`lib/api.ts`)

ky `beforeRequest` hook attaches `Authorization: Bearer <accessToken>`. An `afterResponse` hook catches `401`: it calls `/v1/auth/refresh` **once** (guarded by a shared in-flight promise so concurrent 401s don't stampede), stores the rotated pair, and retries the original request. If refresh fails → `clear()` + redirect to `/login`.

### Route guards

- `<RequireAuth>` wrapper: no session → redirect `/login`.
- `<RequireRole roles={['admin']}>`: wrong role → redirect `/` with a toast. Used on Users and Family settings.
- Role gates also hide write UI (e.g. `viewer` sees no add/edit/delete buttons) — but the server remains the source of truth.

---

## 5. Feature Breakdown

### 5.1 Authentication
- **Endpoints**: `POST /v1/auth/register`, `/login`, `/refresh`, `/logout`.
- **Components**: `LoginPage`, `RegisterPage`, `AuthCard` layout.
- **State**: auth Zustand store; RHF+Zod forms.
- **Flow**: Register collects family_name + admin email/password/full_name → on 201, auto-login with the same credentials → store session → redirect to dashboard. Logout posts the refresh token then `clear()`.
- **Edge cases**: 409 on register ("email already registered") shown inline; 401 on login ("invalid credentials"); 403 ("user inactive"); password min 8 enforced client-side to match server.

### 5.2 Dashboard
- **Endpoints**: `GET /v1/books/` (paged, fetch all up to a cap), `GET /v1/records/`, `GET /v1/rooms/`. No stats endpoint — aggregate client-side.
- **Components**: `StatCard`, `ReadingStatusDonut`, `BooksPerRoomBar`, `RecentlyAddedList`.
- **State**: derived via a `useLibraryStats()` selector over cached books+records+rooms (TanStack `select`/`useMemo`). Counts: total books, by reading_status, by room (map room_id→name).
- **Edge cases**: empty library → friendly EmptyState with "Add your first book" CTA; partial data while records still loading → skeletons.

### 5.3 Book Catalog
- **Endpoints**: `GET /v1/books/` + `GET /v1/records/?q=` for search; `DELETE /v1/books/{id}`.
- **Join**: load owned books (paged) and the record map; merge into a `BookView { book, record }`. Search by text → query records, then show owned books whose record matches.
- **Components**: `BookCatalogPage`, `BookList`, `BookListItem` (cover, title, author, status badge, location chip), `CatalogFilters` (room select, status select), `SearchInput`.
- **State**: server state in TanStack Query; UI filter state (room, status, query) in URL search params so views are shareable/back-button friendly.
- **Edge cases**: empty + no-search-results EmptyStates differ; debounce search 300ms; missing cover → `BookCover` placeholder; missing record (orphan book) → show "Untitled" gracefully.

### 5.4 ISBN Quick-Add
- **Endpoints**: `GET /v1/ingestion/isbn/{isbn}` (lookup), `POST /v1/records/` (create record if new), `POST /v1/books/` (create owned copy — accepts inline title/author/isbn or a `bibliographic_record_id`).
- **Components**: `AddBookPage` with two tabs: **Scan** (`IsbnScanner` via @zxing/browser camera) and **Type ISBN**; `IsbnPreviewCard` (returned metadata, editable); `LocationPicker` (room→bookcase→section→shelf cascading selects, all optional).
- **Flow**: scan/enter ISBN → lookup → prefill editable preview → user confirms + optionally assigns location + reading_status → submit (create record + owned book) → toast + offer "add another".
- **State**: local wizard state (RHF); mutations invalidate books/records queries.
- **Edge cases**: camera permission denied → fall back to manual entry with a clear message; ISBN not found (lookup error) → let user fill metadata manually; HTTPS required for camera (works on Render); duplicate ISBN → still allowed (a family can own two copies), but surface a gentle "you may already own this" hint.

### 5.5 Location Management
- **Endpoints**: full CRUD on `/v1/rooms/`, `/v1/bookcases/?room_id=`, `/v1/sections/`, `/v1/shelves/`.
- **Components**: `LocationsPage` (accordion tree Room→Bookcase→Section→Shelf), `RoomCard`, `BookcaseCard`, `Section/Shelf` rows, `CreateEditModal` per entity, `ConfirmDialog` for delete.
- **State**: nested TanStack queries keyed by parent id; create/update/delete mutations invalidate the relevant level.
- **Edge cases**: delete blocked when occupied (409 from server) → explain "move or remove its books first"; require role admin/editor for writes; lazy-load children only when a node expands.

### 5.6 Bookcase Visual Map
- **Endpoints**: `GET /v1/map/bookcase/{bookcase_id}` (returns sections→shelves→books denormalized with title/author/status — no join needed here).
- **Components**: `BookcaseMapPage`, `BookcaseGrid` (sections as columns, shelves as horizontal rows, books as spines), `BookSpine` (color-coded by reading_status, title on hover/tap), `BookPopover` (tap → mini detail + link to BookDetail).
- **State**: single query for the map; read-only view.
- **Edge cases**: empty shelves render as empty slots; very full shelves scroll horizontally on mobile; loading skeleton mirrors the grid; bookcase with no sections → EmptyState linking to Locations to add sections.

### 5.7 Reading Status
- **Endpoints**: `POST /v1/books/{id}/reading-status?reading_status=<value>` (query param!).
- **Components**: `ReadingStatusBadge` (also a dropdown to change it) reused in list, detail, and map popover.
- **State**: mutation with **optimistic update** of the cached book; rollback on error.
- **Edge cases**: viewer role → badge is display-only; network error → revert + toast.

### 5.8 User Management (admin only)
- **Endpoints**: `GET /v1/users/`, `POST /v1/users/`, `PATCH /v1/users/{id}`, `DELETE /v1/users/{id}`, `GET /v1/users/me`.
- **Components**: `UsersPage` (table on desktop, cards on mobile), `InviteUserModal`, `EditUserModal` (role, full_name, is_active toggle), `ConfirmDialog`.
- **State**: TanStack query/mutations; guard with `<RequireRole roles={['admin']}>`.
- **Edge cases**: 409 duplicate email on create; prevent admin from deactivating/deleting themselves (client guard + clear message); role legend (admin/editor/viewer capabilities).

### 5.9 Export
- **Endpoints**: `GET /v1/export/books.csv`, `GET /v1/export/books.json`.
- **Components**: `ExportMenu` (in Settings and Catalog header).
- **Flow**: authenticated fetch (bearer header) → blob → trigger download via object URL. (A plain `<a href>` can't send the bearer token, so fetch-then-download.)
- **Edge cases**: large export → show spinner on the button; empty library → disabled with tooltip.

### 5.10 Settings
- **Endpoints**: `GET/PATCH /v1/families/{familyId}` (id from JWT), `GET /v1/users/me`, `PATCH /v1/users/{id}` (self).
- **Components**: `SettingsPage` with `FamilySection` (name, description — admin only edit) and `ProfileSection` (own full_name), plus Export and Logout.
- **State**: queries + mutations; family_id read from auth store.
- **Edge cases**: viewer/editor see family details read-only; optimistic name update.

---

## 6. Implementation Order

**Phase 1 — Foundation (no features yet, unblocks everything)**
Vite+TS+Tailwind scaffold · design tokens + `components/ui` primitives · `lib/api.ts` (ky + interceptors) · `lib/jwt.ts` · auth store · `types/api.ts` · QueryClient · AppShell (sidebar + mobile bottom nav) · routing skeleton with guards.

**Phase 2 — Auth (gate for all data features)**
Login, Register→auto-login, refresh-on-boot, logout, route guards. *Depends on Phase 1.*

**Phase 3 — Core catalog (the heart)**
Books↔records join layer (`features/books`, `features/records`) · Book Catalog list with search/filter · Book Detail · Reading-status mutation. *Depends on Phase 2.*

**Phase 4 — Locations + Add flow** *(parallelizable into two tracks after Phase 3)*
- Track A: Location Management CRUD + LocationPicker.
- Track B: ISBN Quick-Add (scanner + lookup + create). Track B's LocationPicker depends on Track A's location queries existing, so build Track A's read hooks first.

**Phase 5 — Visualization & dashboard** *(parallelizable)*
- Bookcase Visual Map (uses `/map`, independent).
- Dashboard (depends on books+records+rooms hooks from Phases 3–4).

**Phase 6 — Admin & polish** *(parallelizable)*
- User Management (admin).
- Settings (family + profile).
- Export.
- Accessibility/responsive audit, empty/error states pass, Lighthouse mobile check.

Critical path: **1 → 2 → 3** is strictly sequential. Everything in 4–6 fans out from there.

---

## 7. Render.com Deployment

Deploy as a **Static Site**.

`render.yaml`:
```yaml
services:
  - type: web
    name: jinbocho-fe
    runtime: static
    buildCommand: npm ci && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: VITE_API_BASE_URL
        sync: false            # set in dashboard, e.g. https://jinbocho-gateway.onrender.com
    routes:
      - type: rewrite
        source: /*
        destination: /index.html   # SPA fallback for client-side routing
    headers:
      - path: /*
        name: X-Frame-Options
        value: DENY
```

- **Build command**: `npm ci && npm run build` · **Publish dir**: `dist`.
- **API base URL**: `VITE_API_BASE_URL`, read in `lib/api.ts` as `import.meta.env.VITE_API_BASE_URL` (Vite inlines `VITE_`-prefixed vars at build time — set it before the build runs). Commit `.env.example` with the key documented.
- **Client-side routing**: the `/* → /index.html` rewrite prevents 404s on deep links / refresh.
- **CORS**: the API Gateway must allow the Render static-site origin. Flag to backend if not already configured.

---

## 8. Testing Strategy

**Tooling**: Vitest + React Testing Library + `@testing-library/user-event`. MSW (Mock Service Worker) to mock the gateway in component tests.

| Layer | What to test |
|-------|--------------|
| **Unit** (`lib/`, `features/*/helpers`) | JWT decode + expiry, books↔records join/merge, dashboard stat aggregation, status→color mapping, formatters, ISBN validation, the refresh-once interceptor logic. |
| **Component** | UI primitives (Button states, Modal focus-trap/ESC, Badge), forms (Login/Register validation + submit via MSW), BookListItem rendering incl. missing-cover/missing-record, ReadingStatus optimistic update + rollback, route guards (redirects by auth/role). |
| **Not now** | E2E (Playwright) — defer. |

Target: all `features/` pure helpers covered; critical interactive components (auth forms, status mutation, guards) covered. Run `vitest run` in CI alongside `tsc --noEmit` and `eslint`.

---

## Appendix — API Type Sketch (`types/api.ts`)

```ts
export type Role = 'admin' | 'editor' | 'viewer';
export type ReadingStatus = 'to_read' | 'reading' | 'read';

export interface TokenResponse { access_token: string; refresh_token: string; token_type: 'bearer'; }
export interface JwtClaims { sub: string; email: string; family_id: string; role: Role; exp: number; }

export interface OwnedBook {
  id: string; family_id: string; bibliographic_record_id: string;
  room_id: string | null; bookcase_id: string | null; section_id: string | null;
  shelf_id: string | null; shelf_position: number | null;
  condition: string | null; reading_status: ReadingStatus;
  notes: string | null; tags: string[]; created_at: string; updated_at: string;
}

export interface BibliographicRecord {
  id: string; family_id: string; title: string; main_author: string | null;
  other_authors: string[]; isbn: string | null; publisher: string | null;
  publication_year: number | null; language: string | null; genre: string | null;
  cover_url: string | null; notes: string | null;
}

export interface BookView { book: OwnedBook; record: BibliographicRecord | null; }

export interface Room { id: string; family_id: string; name: string; description: string | null; }
export interface Bookcase { id: string; room_id: string; family_id: string; name: string; type: string | null; image_url: string | null; }
export interface Section { id: string; bookcase_id: string; section_index: number; label: string | null; }
export interface Shelf { id: string; section_id: string; shelf_index: number; notes: string | null; }

export interface BookcaseMap {
  bookcase_id: string; bookcase_name: string;
  sections: { section_id: string; section_index: number;
    shelves: { shelf_id: string; shelf_index: number;
      books: { id: string; title: string | null; main_author: string | null; reading_status: ReadingStatus }[];
    }[];
  }[];
}
```
