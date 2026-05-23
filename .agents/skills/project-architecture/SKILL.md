---
name: project-architecture
description: "Core project architecture knowledge. Use when making any architectural decisions, understanding the stack, or creating new features."
---

# Project Architecture — ATX

## Stack
- **Monorepo:** npm workspaces (apps/*, packages/*)
- **Frontend:** React 19, Vite 6, TypeScript strict
- **Backend:** Express 5, TypeScript strict, Mongoose 8
- **Database:** MongoDB Atlas (Mongoose ODM)
- **AI:** OpenAI GPT-4o-mini via structured outputs (Zod + zodResponseFormat)
- **State:** Zustand (client), TanStack Query (server)
- **Styling:** CSS Modules + CSS Variables (NO Tailwind)

## Response Format (ALL API endpoints)
```
Success: { success: true, data: { ... } }
Error: { success: false, error: { code: "ERROR_CODE", message: "Human message" } }
```

## Auth Flow
- Access token: JWT, 15 min, Bearer header
- Refresh token: JWT, 7 days, HTTP-only secure cookie
- Password: bcrypt, 12 salt rounds

## Key Paths
- Backend modules: `apps/api/src/modules/{name}/`
- Frontend components: `apps/web/src/components/{feature}/`
- Shared types: `packages/shared/src/types/`
- Zustand stores: `apps/web/src/stores/`
- API services: `apps/web/src/services/`
