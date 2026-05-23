# New Feature Workflow

When asked to create a new feature module, follow this workflow:

## Step 1: Backend Module
Create at `apps/api/src/modules/{name}/`:
- `{name}.controller.ts` — thin HTTP layer
- `{name}.service.ts` — business logic
- `{name}.routes.ts` — route definitions with middleware
- `{name}.validation.ts` — Zod schemas

## Step 2: Mongoose Model
Create at `apps/api/src/models/{Name}.model.ts`:
- Interface extending Document
- Schema with timestamps: true
- Appropriate indexes
- toJSON transform removing __v

## Step 3: Register Routes
Update `apps/api/src/app.ts`:
- Import routes
- Add `app.use('/api/{resource}', routes)`

## Step 4: Frontend Service
Create at `apps/web/src/services/{name}.service.ts`:
- Import apiClient
- Export CRUD functions

## Step 5: Zustand Store (if needed)
Create at `apps/web/src/stores/{name}Store.ts`:
- Client-side state only
- Server data via TanStack Query, NOT duplicated in store

## Step 6: Verify
- Run `npx tsc --noEmit` in both apps
- Ensure no TypeScript errors
