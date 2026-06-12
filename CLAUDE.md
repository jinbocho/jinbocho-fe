# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # dev server on :5173
npm run typecheck    # tsc --noEmit — run before every commit
npm run test         # vitest run (single pass)
npm run test:watch   # vitest interactive watch
npm run build        # tsc + vite build → dist/
npm run lint         # eslint
```

Run a single test file:
```bash
npx vitest run src/features/books/join.test.ts
```

## Architecture

**Data flow**: `routes/` → `features/**/hooks.ts` → `lib/api.ts` (ky) → API Gateway `:8000`

**State management**: TanStack Query for all server state. Zustand for two things only: auth session (`features/auth/store.ts`) and language preference (`features/i18n/store.ts`). Theme preference (`features/theme/store.ts`) is also Zustand + `localStorage`. No other global state exists.

**Feature slice pattern**: each `features/<domain>/hooks.ts` exports TanStack Query hooks (`useXxx`) and mutations (`useAddXxx`, `useUpdateXxx`, `useDeleteXxx`). No JSX inside `features/`. Pages in `routes/` compose these hooks.

**Types**: `src/types/api.ts` is the single source of truth for all backend shapes — mirrors Pydantic schemas by hand. Update it whenever the backend schema changes.

## Theme System

Colors are CSS custom properties in `src/styles/index.css` using RGB channel triplets (e.g. `--c-brand: 168 90 56`) so Tailwind alpha utilities (`bg-brand/15`) work. `tailwind.config.ts` maps semantic names (`paper`, `ink`, `brand`, `surface`, `line`, `danger`, `sage`, `amber`, `stone`) to those variables.

Dark mode: toggling `.dark` on `<html>` swaps all variables. `features/theme/store.ts` manages this via Zustand + `localStorage`.

**Never hardcode hex values in components** — use only Tailwind semantic classes (`bg-paper`, `text-ink-soft`, `border-line`, etc.).

## i18n

All UI strings must go through `useTranslation()`. Locale files are in `features/i18n/locales/{en,it,es,fr}.json`. Add keys to all four files when introducing new UI text.

## Critical Backend Gotchas

- **OwnedBook has no title/author.** Join to `BibliographicRecord` via `joinBooksToRecords()` in `features/books/hooks.ts`.
- **Position update** (`POST /v1/books/{id}/position`) reads position from query params, not body.
- **Reading-status update** (`POST /v1/books/{id}/reading-status?reading_status=<value>`) — same, query params.
- **Register returns no token.** After `POST /auth/register` succeeds, issue a login call to get tokens.
- **Catalog timestamps are ISO strings**, typed as `string` in `types/api.ts`.
