---
name: frontend-component
description: "Use when creating React components. Covers component structure, CSS Modules, Zustand stores, and API service layer patterns."
---

# Frontend Component Pattern

## Component Structure
- PascalCase filename: `ComponentName.tsx`
- Co-located CSS: `ComponentName.module.css`
- Named export: `export const ComponentName = ({ prop }: Props) => { ... }`
- Props interface above component: `interface ComponentNameProps { ... }`

## CSS Module Rules
```tsx
import styles from './ComponentName.module.css';
// Usage: className={styles.container}
```
- ALL colors from CSS variables: `var(--color-primary)`
- ALL spacing from CSS variables: `var(--space-4)`
- NO hardcoded colors or magic numbers
- NO Tailwind — CSS Modules only

## Zustand Store Pattern
```typescript
import { create } from 'zustand';
interface XStore { /* state + actions */ }
export const useXStore = create<XStore>((set, get) => ({
  // state fields with initial values
  // action methods that call set()
}));
```

## API Service Pattern
```typescript
import { apiClient } from './api';
export const featureService = {
  getAll: () => apiClient.get('/api/feature').then(r => r.data),
  create: (data: CreatePayload) => apiClient.post('/api/feature', data).then(r => r.data),
};
```
