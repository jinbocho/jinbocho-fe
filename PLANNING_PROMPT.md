# Frontend Planning Prompt — Jinbocho

## Context

Jinbocho is a home library management system for families. It allows a family to catalog physical books, organize them across rooms and bookcases, and track reading statuses. The backend is a Python/FastAPI microservices system already fully built and deployed.

You are asked to plan the complete frontend implementation: tech stack selection, project structure, UI/UX design system, feature breakdown, implementation order, and deployment strategy.

---

## System Overview

### Backend API (single entry point: API Gateway)

All requests go through the API Gateway. JWT Bearer token required on every protected endpoint.

**Auth endpoints** — `POST /v1/auth/register`, `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`

**User endpoints** — `GET /v1/users/me`, `POST /v1/users/`, `GET /v1/users/`, `PATCH /v1/users/{id}`, `DELETE /v1/users/{id}`

**Family endpoints** — `GET /v1/families/{id}`, `PATCH /v1/families/{id}`

**Rooms** — `GET/POST /v1/rooms/`, `GET/PATCH/DELETE /v1/rooms/{id}`

**Bookcases** — `GET/POST /v1/bookcases/`, `GET/PATCH/DELETE /v1/bookcases/{id}`

**Sections** — `GET/POST /v1/sections/`, `GET/PATCH/DELETE /v1/sections/{id}`

**Shelves** — `GET/POST /v1/shelves/`, `GET/PATCH/DELETE /v1/shelves/{id}`

**Books** — `GET/POST /v1/books/`, `GET/PATCH/DELETE /v1/books/{id}`, `POST /v1/books/{id}/position`, `POST /v1/books/{id}/reading-status`, `GET /v1/books/{id}/history`

**Bibliographic records** — `GET/POST /v1/records/`, `GET/PATCH/DELETE /v1/records/{id}` (search via `?q=`)

**ISBN ingestion** — `GET /v1/ingestion/isbn/{isbn}`, `POST /v1/ingestion/bulk-lookup`

**Map** — `GET /v1/map/bookcase/{bookcase_id}` (returns bookcase with sections → shelves → books)

**Export** — `GET /v1/export/books.csv`, `GET /v1/export/books.json`

### Roles

- `admin`: full access (users, family settings, all catalog operations)
- `editor`: can manage books and locations
- `viewer`: read-only

---

## Requirements

### Functional

1. **Authentication**: Login page, registration (family + admin user), token refresh, logout.
2. **Dashboard**: Summary of the library — total books, books per room, reading status stats.
3. **Book catalog**: List, search (by title/author/ISBN), filter by room/reading status, add/edit/delete books.
4. **ISBN quick-add**: Scan or type an ISBN → auto-fill book metadata from the API → confirm and save.
5. **Location management**: CRUD for rooms → bookcases → sections → shelves.
6. **Bookcase visual map**: Display a bookcase as a visual grid of sections/shelves with books on them.
7. **Reading status**: Update status (to-read, reading, read) directly from book list or book detail.
8. **User management** (admin only): List, invite, edit, deactivate users.
9. **Export**: Download books as CSV or JSON.
10. **Settings**: Family name, user profile.

### Non-functional

- **Single-page application (SPA)**: client-side routing, no full page reloads.
- **Mobile-first, responsive**: usable on phones (the ISBN scan flow especially). Works on screens from 320px to 1440px+.
- **Curated UX**: clean, minimal design; no visual noise. A family app — warm and readable, not a developer tool.
- **Performance**: fast initial load; paginated lists; debounced search.
- **Accessibility**: semantic HTML, keyboard navigation, ARIA labels where needed.
- **Deployment on render.com**: static site build (no SSR required).

---

## Tech Stack Constraints

- **Language**: TypeScript (strict mode).
- **No UI framework lock-in**: choose the best option for a small, well-designed SPA — evaluate React, Vue 3, or Svelte.
- **Styling**: CSS-in-JS, utility-first (Tailwind), or a minimal component library — justify the choice.
- **State management**: choose what fits the scale (Zustand, Pinia, Svelte stores, TanStack Query, etc.).
- **HTTP client**: pick one (fetch, axios, ky) and standardize.
- **Routing**: client-side only.
- **Build tool**: Vite.
- **No backend-for-frontend**: the app talks directly to the API Gateway.

---

## What to Plan

Produce a complete, actionable implementation plan covering:

1. **Tech stack decision** — framework, styling, state, routing, HTTP client. One recommendation per category with brief rationale. No exhaustive comparisons.

2. **Project structure** — directory tree with purpose of each directory. Follow the chosen framework's conventions.

3. **Design system** — color palette (warm, family-oriented), typography, spacing scale, component inventory (Button, Input, Card, Modal, Badge, etc.). Must be mobile-friendly.

4. **Authentication flow** — token storage strategy (memory + httpOnly cookie vs localStorage — note security trade-offs), refresh logic, route guards.

5. **Feature breakdown** — one section per feature listed above. For each:
   - Which API endpoints it uses
   - Key components to build
   - State shape
   - Any UX edge cases (empty states, loading, errors)

6. **Implementation order** — phased plan: which features to build first, dependencies between them, what can be done in parallel.

7. **Render.com deployment** — build command, publish directory, environment variable for the API Gateway base URL, how to handle client-side routing (rewrite rules).

8. **Testing strategy** — unit tests for business logic/utilities, component tests, no E2E required for now.

---

## Output Format

Write the plan as a structured Markdown document. Use headers, tables where useful, and code snippets for directory trees and configuration examples. Be specific and concrete — this plan will be used directly to implement the frontend without further clarification.

Do not pad. Every section must contain decisions, not options lists. If a trade-off is worth noting, one sentence is enough.
