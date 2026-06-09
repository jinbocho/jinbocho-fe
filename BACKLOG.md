# Jinbocho Frontend — Backlog

Tasks derived from `IMPLEMENTATION_PLAN.md`. Each task has an **owner**:

- **🔴 Opus** — delicate / high-risk / architectural. Mistakes here cascade. Implemented up front.
- **🟢 Sonnet** — mechanical / well-specified. Safe to delegate once the foundation exists.

Status: ☐ todo · ◐ in progress · ☑ done

---

## Phase 1 — Foundation

| ID | Task | Owner | Deps | Status |
|----|------|-------|------|--------|
| F1 | Vite + React + TS (strict) scaffold; `tsconfig`, `vite.config.ts`, `package.json`, deps installed | 🔴 Opus | — | ☑ |
| F2 | `types/api.ts` — hand-written types mirroring backend schemas (the contract everything depends on) | 🔴 Opus | F1 | ☑ |
| F3 | `lib/jwt.ts` — decode claims + expiry check (security-sensitive, must be exact) | 🔴 Opus | F1 | ☑ |
| F4 | `lib/api.ts` — ky instance + bearer attach + **401→refresh-once→retry** interceptor (highest-risk piece) | 🔴 Opus | F2,F3 | ☑ |
| F5 | `features/auth/store.ts` — Zustand session store + localStorage mirror + JWT→user decode | 🔴 Opus | F3 | ☑ |
| F6 | `lib/queryClient.ts` — TanStack Query defaults (staleTime, retry, error policy) | 🔴 Opus | F1 | ☑ |
| F7 | Route guards `<RequireAuth>` / `<RequireRole>` + boot-time refresh splash | 🔴 Opus | F4,F5 | ☑ |
| F8 | `App.tsx` route tree + `main.tsx` providers wiring | 🔴 Opus | F6,F7 | ☑ |
| F9 | Tailwind config + design tokens (colors, fonts, radius, shadow) + `styles/index.css` | 🔴 Opus | F1 | ☑ |
| F10 | `lib/format.ts` — date/price formatters + status→color/label map | 🟢 Sonnet | F2 | ☑ |
| F11 | `hooks/useDebounce.ts`, `hooks/useMediaQuery.ts` | 🟢 Sonnet | F1 | ☑ |

## Phase 1b — UI primitives (`components/ui/`)

| ID | Task | Owner | Deps | Status |
|----|------|-------|------|--------|
| U1 | Button + IconButton (variants, sizes, loading) | 🟢 Sonnet | F9 | ☑ |
| U2 | Input, Textarea, Select, Checkbox (labels, error, a11y) | 🟢 Sonnet | F9 | ☑ |
| U3 | Card, Badge, Avatar, Skeleton, Spinner | 🟢 Sonnet | F9 | ☑ |
| U4 | Modal (focus-trap, ESC, mobile bottom-sheet) + ConfirmDialog | 🔴 Opus | F9 | ☑ |
| U5 | Toast provider + `useToast` | 🔴 Opus | F9 | ☑ |
| U6 | EmptyState, ErrorState, Pagination, SearchInput, BookCover | 🟢 Sonnet | F9,F11 | ☑ |
| U7 | Layout: AppShell + Sidebar (md+) + BottomNav (mobile) + TopBar | 🟢 Sonnet | U1-U3 | ☑ |

## Phase 2 — Auth feature

| ID | Task | Owner | Deps | Status |
|----|------|-------|------|--------|
| A1 | `features/auth` hooks: `useLogin`, `useRegister`, `useLogout`, boot refresh | 🔴 Opus | F4,F5 | ☑ |
| A2 | `LoginPage` (RHF+Zod, 401/403 mapping, AuthLayout) | 🟢 Sonnet | A1,U1-U2 | ☑ |
| A3 | `RegisterPage` (register → auto-login, 409 handling) | 🟢 Sonnet | A1,U1-U2 | ☑ |

## Phase 3 — Core catalog (the heart)

| ID | Task | Owner | Deps | Status |
|----|------|-------|------|--------|
| C1 | `features/records` hooks: `useRecords(q)`, `useRecord(id)`, create/update/delete | 🔴 Opus | F4,F6 | ☑ |
| C2 | `features/books` hooks + **books↔records join** (`useBookViews`, pure `joinBooksToRecords` tested) | 🔴 Opus | C1 | ☑ |
| C3 | Reading-status mutation w/ **optimistic update + rollback** (`useUpdateReadingStatus`, query-param API) | 🔴 Opus | C2 | ☑ |
| C4 | `BookCatalogPage` + list + URL-synced filters (room/status/q), debounced search | 🟢 Sonnet | C2,U6 | ☑ |
| C5 | `BookListItem` (cover, title, author, status control, location chip) | 🟢 Sonnet | C2,U3 | ☑ |
| C6 | `BookDetailPage` (metadata, history, edit notes / move / delete modals) | 🟢 Sonnet | C2 | ☑ |

## Phase 4 — Locations + Add flow

| ID | Task | Owner | Deps | Status |
|----|------|-------|------|--------|
| L1 | `features/locations` hooks: rooms/bookcases(`?room_id`)/sections/shelves CRUD | 🔴 Opus | F4,F6 | ☑ |
| L2 | `LocationsPage` tree (accordion) + per-entity CreateEditModal + delete | 🟢 Sonnet | L1,U4 | ☑ |
| L3 | `LocationPicker` cascading selects (room→bookcase→section→shelf) | 🟢 Sonnet | L1,U2 | ☑ |
| L4 | ISBN lookup `useIsbnLookup` + `metadataToRecordDraft` + `normalizeIsbn`/`isValidIsbn` (tested) | 🔴 Opus | F4 | ☑ |
| L5 | `IsbnScanner` (@zxing/browser camera + permission/insecure/no-camera fallbacks) | 🔴 Opus | L4 | ☑ |
| L6 | `AddBookPage` wizard (scan/type tabs → preview → location → submit); scanner lazy-loaded | 🟢 Sonnet | L3,L4,L5,C1,C2 | ☑ |

## Phase 5 — Visualization & dashboard

| ID | Task | Owner | Deps | Status |
|----|------|-------|------|--------|
| V1 | `features/map` hook + `BookcaseMapPage` grid (sections/shelves/spines) | 🟢 Sonnet | F4,U3 | ☑ |
| V2 | `BookSpine` (status color, tap → detail) + legend | 🟢 Sonnet | V1 | ☑ |
| D1 | `useLibraryStats` + pure `computeLibraryStats` (tested) — client-derived, no backend endpoint | 🔴 Opus | C2,L1 | ☑ |
| D2 | `DashboardPage` (StatCards, books-per-room bars, recently added) | 🟢 Sonnet | D1,U3 | ☑ |

## Phase 6 — Admin & polish

| ID | Task | Owner | Deps | Status |
|----|------|-------|------|--------|
| M1 | `features/users` + `features/family` hooks — gateway proxy added (BE1) + validated | 🔴 Opus | F4 | ☑ |
| M2 | `UsersPage` (admin) + Invite/Edit modals + self-guard | 🟢 Sonnet | M1,U4 | ☑ |
| M3 | `SettingsPage` (family + profile, role-gated edit, export, logout) | 🟢 Sonnet | M1 | ☑ |
| M4 | `useExport` + `ExportMenu` (CSV/JSON) wired into catalog + settings | 🔴 Opus | F4 | ☑ |
| M5 | empty/error/loading states throughout + responsive (mobile-first); formal Lighthouse audit not run | 🟢 Sonnet | all | ◐ |

## Backend fixes (required for FE integration)

Discovered while wiring the FE data layer. All fixed in this session.

| ID | Fix | File(s) | Status |
|----|-----|---------|--------|
| BE1 | **Gateway didn't proxy users/families** — auth proxy hardcodes `auth/` segment, so `/v1/users` & `/v1/families` were unreachable. Added `users.py` + `families.py` proxy modules and registered them. | gateway `endpoints/{users,families}.py`, `router.py` | ☑ |
| BE2 | **Catalog couldn't validate JWTs** — `catalog-service.env` had no `JWT_SECRET_KEY` (required field → boot fails; must match auth's secret). Added it. | `envs/catalog-service.env` | ☑ |
| BE3 | **Book writes 500'd** — `books.py` read `payload["user_id"]` (5×) but the JWT claim is `sub`. Fixed to `payload["sub"]`. | catalog `endpoints/books.py` | ☑ |
| BE4 | **All catalog GET/POST 500'd** — response schemas declared `created_at: str`/`updated_at: str` but ORM returns `datetime` → Pydantic v2 rejected every response. Changed to `datetime` (6 schemas). | catalog `schemas/{room,bookcase,section,shelf,record,book}_schemas.py` | ☑ |
| BE5 | **List books 500'd** — endpoint called `execute(family_id, limit, offset)` positionally; those landed in the use case's `shelf_id`/`reading_status` params (`uuid = integer` SQL error). Fixed to keyword args. | catalog `endpoints/books.py` | ☑ |
| BE6 | **PATCH family 500'd** — repo `save()` always `add()`'d a new model → duplicate-PK on update. Switched to `session.merge()` (upsert). | auth `repositories/family_repository.py` | ☑ |
| BE7 | **Constructor arity drift** (refactor left endpoints out of sync): `AddBookUseCase`, `CreateShelfUseCase`, `GetOwnedBookUseCase`, `UpdateBookMetadataUseCase`, `UpdateBookPositionUseCase` were called with the wrong number of repos. Fixed all call sites + added missing injected repos. | catalog `endpoints/{books,shelves}.py` | ☑ |
| BE8 | **PATCH book 500'd** — `update_book_metadata.py` used `BookHistory` without importing it (`NameError`). Added import. | catalog `use_cases/catalog/update_book_metadata.py` | ☑ |
| BE9 | **GET book {id} 500'd** — endpoint returned composite `{book, record}` but `response_model` is flat `OwnedBookResponse`. Return `.book`. | catalog `endpoints/books.py` | ☑ |
| BE10 | **ISBN lookup 500'd** — (a) upstream timeouts weren't caught, defeating the Google→OpenLibrary fallback; wrapped both in `try/except httpx.HTTPError` + `follow_redirects`. (b) gateway proxy used httpx default 5s timeout < external-API latency → raised to 30s on all proxies. | catalog `use_cases/ingestion/lookup_isbn.py`, `core/lifespan.py`; gateway all `endpoints/*.py` | ☑ |
| BE-V | **End-to-end API validation** — full stack via docker compose, migrations applied, **30/30 endpoints pass** through the gateway (`validate_api.sh`). | `jinbocho-infrastructure-v1/validate_api.sh` | ☑ |

## Deployment & tests

| ID | Task | Owner | Deps | Status |
|----|------|-------|------|--------|
| P1 | `render.yaml` static-site + SPA rewrite + `.env.example` | 🔴 Opus | F1 | ☑ |
| T1 | Vitest+RTL+MSW setup — **Vitest+jsdom+jest-dom wired; MSW dep installed, not yet configured** | 🔴 Opus | F1 | ◐ |
| T2 | Unit tests: jwt ✅; **books↔records join, stats aggregation, refresh interceptor still TODO** | 🔴 Opus | F4,C2,D1 | ◐ |
| T3 | Component tests: auth forms, status mutation, guards | 🟢 Sonnet | A2,C3,F7 | ☐ |

---

## Opus session — DELIVERED ✅

The delicate foundation is built, and verified green (`typecheck`, `build`, `test`, dev server 200):

- **F1** Vite+React+TS strict scaffold, all configs, deps installed
- **F2** `types/api.ts` — full contract mirroring backend schemas
- **F3** `lib/jwt.ts` — decode + expiry (with unit tests, 6 passing)
- **F4** `lib/api.ts` — ky client with **proactive refresh + guarded 401 fallback** (no-loop design)
- **F5** `features/auth/store.ts` — Zustand session, localStorage refresh mirror
- **F6** `lib/queryClient.ts` — TanStack defaults (no retry on 401/403/404)
- **F7** `features/auth/guards.tsx` — RequireAuth / RequireRole + boot splash
- **F8** `App.tsx` route tree + `main.tsx` providers
- **F9** Tailwind tokens (the plan's exact palette/fonts)
- **U4** Modal (focus-trap, ESC, mobile bottom-sheet) + ConfirmDialog
- **U5** Toast provider + `useToast`
- **U1** Button (IconButton still pending)
- **A1** auth hooks (`useLogin`/`useRegister`/`useLogout`/`useBootSession`)
- **A2** minimal functional LoginPage (proves the whole auth chain end-to-end)
- **P1** `render.yaml` + `.env.example`
- **T1/T2** Vitest wired; jwt tests passing

### Handoff to Sonnet — start here (dependency order)

1. **F10, F11** (format helpers, hooks) — no deps, unblock everything.
2. **U2, U3, U6** (form inputs, display primitives, feedback) — depend on F9 (done).
3. **U1** finish IconButton; **U7** make AppShell responsive (Sidebar/BottomNav).
4. **A2 polish + A3** RegisterPage.
5. **C4, C5, C6** catalog UI — but these need **C1, C2, C3** (Opus-tagged data layer) first.

### Opus session 2 — DELIVERED ✅ (data layer)

All 🔴 Opus data-layer tasks are done and verified (typecheck + build + 18 tests green):

- **C1** `features/records/hooks.ts` — search/CRUD
- **C2** `features/books/hooks.ts` — full CRUD + position + history + the **books↔records join** (`useBookViews`, pure `joinBooksToRecords`); `lib/paginate.ts` fetch-all helper
- **C3** `useUpdateReadingStatus` — optimistic update + rollback (query-param API)
- **L1** `features/locations/hooks.ts` — rooms/bookcases/sections/shelves CRUD with parent filters
- **L4** `features/records/isbn.ts` — `useIsbnLookup` + `metadataToRecordDraft` + ISBN validators
- **L5** `components/books/IsbnScanner.tsx` — @zxing/browser with denied/insecure/no-camera fallbacks
- **D1** `features/stats/useLibraryStats.ts` — pure `computeLibraryStats`
- **M1** `features/users/hooks.ts` + `features/family/hooks.ts` (⚠️ see gateway gap)
- **M4** `features/export/useExport.ts` — authenticated blob download

Tests added: `jwt`, `books/join`, `records/isbn`, `stats`.

### ✅ Gateway gap RESOLVED + full backend validated

The earlier blocker (gateway not proxying `/v1/users` & `/v1/families`) is fixed (BE1). While validating, **10 backend bugs** were found and fixed (see "Backend fixes" table) and the entire API surface now passes **30/30** end-to-end through the gateway (`jinbocho-infrastructure-v1/validate_api.sh`). Nothing on the FE side is blocked anymore.

### ✅ FE COMPLETE (all features built)

Every page and primitive is implemented, wired into the router, and verified: **`typecheck` clean, `build` green, 18 unit tests pass**, dev server serves 200 against the live gateway. Bundle is 125 kB gzip (the @zxing scanner is code-split into its own on-demand chunk).

Shipped this session: F10/F11 helpers · U1–U7 primitives + responsive AppShell (sidebar desktop / bottom-nav mobile) · A2/A3 auth pages (RHF+Zod) · C4 catalog (URL-synced filters + debounced search) · C5 list item · C6 book detail (edit notes / move / delete + history) · L2 locations tree (full CRUD) · L3 LocationPicker · L6 add-book wizard (scan/type → preview → placement) · V1/V2 bookcase map · D2 dashboard · M2 users admin · M3 settings · M4 export menu.

### Remaining (optional, non-blocking)

- **T3** component tests (auth forms, status mutation, guards) — MSW is installed but not yet configured; only the pure-logic unit tests exist so far.
- **M5** formal Lighthouse/a11y audit — empty/error/loading states and mobile-first responsiveness are in place throughout, but no formal audit pass was run.
