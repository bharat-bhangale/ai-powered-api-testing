# Agent Instructions — ATX (AI-Powered API Testing Tool)

## Project Type

SPA monorepo: React 19 + Vite 6 frontend, Express 5 + TypeScript backend, MongoDB Atlas.

## Non-Negotiable Rules

1. **TypeScript strict mode** in ALL files — no `any` unless explicitly justified
2. **CSS Modules + CSS Variables** for styling — NO Tailwind CSS
3. **Zod validation** for ALL API request bodies
4. **Backend module pattern:** controller (thin) → service (thick) → routes
5. **Services NEVER import Express types** — receive typed params, return typed results
6. **API response format:** `{ success: boolean, data?: T, error?: { code: string, message: string } }`
7. **Named exports only** — no `export default` for components or modules
8. **Client-side IDs:** use `crypto.randomUUID()`
9. **All colors, spacing, borders** from CSS variables in `variables.css`
10. **Components are self-contained** with co-located `.module.css` files

## Architecture

- **Frontend state:** Zustand (client/UI state) + TanStack Query (server/API state)
- **Auth:** JWT access tokens (15 min) + HTTP-only refresh cookies (7 days)
- **AI:** OpenAI structured outputs with Zod schemas via `zodResponseFormat`
- **Executor:** Server-side proxy (solves CORS) with SSRF guard
- **Database:** MongoDB Atlas with Mongoose ODM

## File Locations

- Frontend components: `apps/web/src/components/{feature}/{ComponentName}.tsx`
- Backend modules: `apps/api/src/modules/{name}/{name}.controller.ts`
- Shared types: `packages/shared/src/types/`
- Zustand stores: `apps/web/src/stores/{name}Store.ts`
- API services: `apps/web/src/services/{name}.service.ts`

## Commands

- `npm run dev` — Start frontend + backend concurrently
- `npm run dev:web` — Frontend only (port 5173)
- `npm run dev:api` — Backend only (port 8000)
- `npm run lint` — ESLint all files
- `npm run type-check` — TypeScript verification
- `npm run test` — Run Vitest test suite

## When Tests Fail

Stop and report the failure. Do not auto-fix without user approval.

## When Linting Fails

Auto-fix if `--fix` resolves it. Otherwise, stop and report.
