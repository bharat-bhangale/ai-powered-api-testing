# Day 7 Prompts: Polish, Theme & Deployment

## Copy-Paste Ready Prompts for Claude Opus 4.6 in Antigravity

**Day:** 7 of 7 | **Features:** 2 (Dark/Light Theme, Deployment) + Polish  
**Prerequisites:** Day 6 working (AI chat, test gen, debug assistant)

---

## Quick Reference

| # | Feature | Prompt Type | Est. Time |
|:--|:--------|:------------|:----------|
| P36 | Dark/Light Theme System | 🎨 Frontend | 20 min |
| P37 | Micro-Animations & Polish | 🎨 Frontend | 20 min |
| P38 | Error Handling & Edge Cases | 🎨 Frontend | 20 min |
| P39 | Keyboard Shortcuts | 🎨 Frontend | 10 min |
| P40 | Deployment | 🔌 DevOps | 30 min |

---

## ORCHESTRATOR PROMPT (Day 7)

```
Polish and deploy our API testing tool (Day 7 — LAUNCH DAY).

Today's goal: Dark/light theme toggle, micro-animations everywhere, comprehensive error handling, keyboard shortcuts, and deployment to production.

Execute in order:
1. Theme system: useTheme hook (dark/light/system), ThemeSwitcher component, anti-flash script in index.html, smooth transitions on theme change
2. Micro-animations: entrance animations (fadeIn, slideIn, scaleIn) for dropdowns/modals/sidebar/responses, skeleton loaders, button hover effects
3. Error handling: global ErrorBoundary, offline detection, network error banners, empty states with CTAs
4. Keyboard shortcuts: Ctrl+Enter (send), Ctrl+S (save), Ctrl+N (new tab), Ctrl+W (close tab), Ctrl+L (focus URL)
5. Deployment: build checks → frontend to Vercel → backend to Railway → MongoDB Atlas → env vars → CORS → verify

CSS variables already support both themes (from Day 1 variables.css). Just wire up the toggle.
Final checklist at the end: test all 24 features manually.
```

---

## Individual Feature Prompts

### P36: Dark/Light Theme System

```
[FE] Implement the theme system.

1. hooks/useTheme.ts:
   - State: theme (dark | light | system), persisted in localStorage
   - resolvedTheme: actual applied theme (resolves "system" via matchMedia)
   - setTheme(theme): update state, save to localStorage, apply data-theme attribute to document.documentElement
   - Listen for OS preference changes when theme="system"

2. Anti-flash script in index.html <head> (before CSS):
   <script> reads localStorage("theme"), resolves system preference, sets data-theme attribute immediately </script>
   This prevents a flash of wrong theme on page load.

3. components/common/ThemeSwitcher.tsx + .module.css:
   - Pill-shaped container with 3 icon buttons: Moon (dark), Sun (light), Monitor (system)
   - Active button: primary-subtle background + primary text color
   - Smooth transition on active state
   - Place in StatusBar component

4. Smooth theme transition:
   Add to index.css: html[data-theme-transitioning] * { transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease; }
   In useTheme: add transitioning class before change, remove after 200ms

The CSS variables in variables.css already have [data-theme="light"] overrides from Day 1.
```

### P37: Micro-Animations & Polish

```
[FE] Add premium micro-animations across the app.

1. Create apps/web/src/styles/animations.css:
   @keyframes: fadeIn, fadeInUp, fadeInDown, slideInRight, slideInLeft, scaleIn, pulse, shimmer, spin
   Utility classes: .animate-fade-in, .animate-fade-in-up, .animate-scale-in, .animate-pulse
   Skeleton class: .skeleton (shimmer gradient animation)

2. Apply animations to existing components:
   - MethodSelector dropdown: scaleIn 150ms, transform-origin top
   - Modals: backdrop fadeIn 200ms, content scaleIn 200ms
   - Sidebar tree items: slideInLeft 150ms
   - Response viewer: fadeInUp 200ms when response arrives
   - AI chat messages: fadeInUp 150ms, staggered per message
   - History entries: fadeInUp with 50ms stagger
   - Toast notifications: already handled by Sonner
   - Tab switch: opacity crossfade 150ms

3. Hover micro-interactions:
   - Buttons: translateY(-1px) + shadow-md on hover, translateY(0) on active
   - Sidebar items: left border accent (2px primary) on hover
   - Cards/panels: subtle border-color-hover transition
   - Send button: slight scale(1.02) on hover

4. Status bar at bottom:
   - Left: 🟢 "Connected" (or 🔴 "Disconnected")
   - Center: active environment name
   - Right: AI usage indicator + ThemeSwitcher

5. Loading states:
   - Response area: 3 skeleton lines (shimmer)
   - History list: 5 skeleton rows
   - Collection tree: 3 skeleton items

Import animations.css in index.css.
```

### P38: Error Handling & Edge Cases

```
[FE] Implement comprehensive error handling.

1. app/ErrorBoundary.tsx:
   - Class component with getDerivedStateFromError + componentDidCatch
   - Error UI: centered card with error message + "Reload App" button
   - Wrap <App> in <ErrorBoundary> in main.tsx

2. Network error handling:
   - Detect offline: window.addEventListener('online'/'offline')
   - Show persistent banner when offline: "You're offline — requests will fail"
   - Banner disappears when back online

3. Backend connection check:
   - On app load: GET /health — if fails, show "Cannot connect to server" banner
   - Retry button in banner

4. Edge cases in request builder:
   - URL without protocol: auto-prepend "https://" on send
   - Empty URL: disable Send button, show "Enter a URL" hint
   - Invalid JSON in body editor: show red indicator in Body tab + inline error

5. Edge cases in response viewer:
   - Empty response body (204 No Content): show "No content" message
   - Large response (>1MB): show warning banner "Large response — rendering may be slow" + offer Raw mode
   - Binary response: show "Binary data — cannot display" with size info

6. Toast configuration (Sonner):
   - Position: bottom-right
   - Theme: matches current theme
   - Duration: 3000ms for success, 5000ms for errors
   - Stack: max 3 visible toasts
```

### P39: Keyboard Shortcuts

```
[FE] Implement global keyboard shortcuts.

hooks/useKeyboardShortcuts.ts:
- Ctrl+Enter → send current request (click #send-button)
- Ctrl+S → save request (click #save-button)
- Ctrl+N → add new tab
- Ctrl+W → close current tab
- Ctrl+Tab → switch to next tab
- Ctrl+Shift+Tab → switch to previous tab
- Ctrl+L → focus URL input (#url-input)
- Ctrl+Shift+I → toggle AI chat panel
- Ctrl+Shift+C → copy as cURL
- Escape → close any open modal/dropdown

Implementation:
- Single useEffect with keydown listener in App component
- Check ctrl/meta key + specific key
- Prevent default browser behavior (Ctrl+S, Ctrl+W, Ctrl+N)
- Don't trigger when focused in Monaco editor (check document.activeElement)

Add unique IDs to interactive elements: send-button, save-button, url-input.
Show shortcuts in button tooltips: "Send (Ctrl+Enter)"
```

### P40: Deployment

```
Deploy the API testing tool to production.

1. Frontend build check:
   - cd apps/web && npm run build
   - Fix any build errors
   - Verify dist/ output

2. Backend build check:
   - cd apps/api && npm run build
   - Fix any TypeScript errors
   - Verify dist/ output and npm start works

3. MongoDB Atlas:
   - Create free M0 cluster (if not done)
   - Create db user with readWrite role
   - Whitelist 0.0.0.0/0 for Railway access
   - Get connection string

4. Deploy Backend to Railway:
   - Link GitHub repo, set root directory: apps/api
   - Build: npm run build, Start: npm start
   - Environment variables:
     PORT=8000
     MONGODB_URI=<atlas_connection_string>
     ACCESS_TOKEN_SECRET=<generate 64 char random>
     REFRESH_TOKEN_SECRET=<generate 64 char random>
     FRONTEND_URL=https://<your-app>.vercel.app
     OPENAI_API_KEY=<your_key>
     NODE_ENV=production
   - Get deployment URL

5. Deploy Frontend to Vercel:
   - Link GitHub repo, set root directory: apps/web
   - Build: npm run build, Output: dist
   - Environment variable: VITE_API_URL=https://<your-api>.up.railway.app
   - Deploy

6. Post-deploy:
   - Update backend FRONTEND_URL to actual Vercel URL
   - Test CORS: can frontend call backend?
   - Test auth: register → login → create collection
   - Test executor: send request to public API
   - Test AI: chat, generate tests, debug

7. README.md at project root:
   - Project name + description + screenshot placeholder
   - Tech stack
   - Features list
   - Getting started (local dev): clone → npm install → create .env → npm run dev
   - Deployment instructions
   - Environment variables reference
   - License: MIT
```

---

## Sub-Agent Delegation Map (Day 7)

```
ORCHESTRATOR
├── Frontend Sub-Agent: P36 (theme) → P37 (animations) → P38 (errors) → P39 (shortcuts)
└── DevOps Sub-Agent: P40 (deployment)
```

---

## 🚀 FINAL CHECKLIST PROMPT

After deploying, paste this to verify everything works:

```
Run the final verification checklist for our deployed API testing tool.

Test each feature and report PASS/FAIL:
1. App loads on production URL with dark theme
2. Register new account → success → redirected to main app
3. Login with credentials → success
4. Send GET to https://jsonplaceholder.typicode.com/posts/1 → see 200 + JSON response
5. Send POST with JSON body → see 201 response
6. Add custom header → verify in request
7. Multi-tab: open 3 tabs, switch between them, data persists
8. Create collection → appears in sidebar
9. Save request to collection → appears in tree
10. Click saved request in sidebar → loads in tab
11. Create environment with base_url variable → use {{base_url}}/posts → resolves correctly
12. Switch environment → request uses new variable values
13. Bearer auth config → Authorization header sent
14. History: send requests → see in history → click to replay
15. cURL import: paste cURL → auto-populate builder
16. cURL export: copy as cURL → valid command
17. Postman import: upload collection JSON → creates collection with requests
18. AI chat: ask "What is a 200 status code?" → get streaming response
19. AI test generation: send request → "Generate Tests" → see test suggestions
20. AI debug: trigger 401 error → "Debug with AI" → see diagnosis
21. Dark/light theme toggle → colors transition smoothly
22. Keyboard shortcuts: Ctrl+Enter sends, Ctrl+S saves, Ctrl+N new tab
23. Error handling: invalid URL → error message (no crash)
24. Theme persists after page refresh

Report results as a table with PASS/FAIL and any notes.
```

---

*End of Day 7 Prompts. LAUNCH DAY! 🚀*
