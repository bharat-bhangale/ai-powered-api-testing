---
name: backend-module
description: "Use when creating a new backend API module with controller, service, routes, and validation. Applies to Express 5 + TypeScript + Mongoose."
---

# Backend Module Pattern

## Module Structure
```
modules/{name}/
├── {name}.controller.ts    ← HTTP layer (parse req, call service, format res)
├── {name}.service.ts       ← Business logic (typed params, no Express imports)
├── {name}.routes.ts        ← Route definitions + middleware chain
├── {name}.validation.ts    ← Zod schemas for request bodies
└── __tests__/
    └── {name}.service.test.ts
```

## Controller Rules (THIN)
- Parse req.body, req.params, req.query into typed variables
- Call service method with typed params (NEVER pass req/res)
- Return `{ success: true, data: result }` or `{ success: false, error: { code, message } }`
- Wrap in try-catch; pass errors to next()

## Service Rules (THICK)
- All business logic lives here
- Receives plain TypeScript parameters
- Returns typed data objects
- Throws errors with meaningful messages
- Interacts with Mongoose models

## Route Pattern
```typescript
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
const router = Router();
router.post('/', authenticate, validate(schema), controller.create);
```

## Registration
```typescript
// In apps/api/src/app.ts:
app.use('/api/{resource}', routes);
```
