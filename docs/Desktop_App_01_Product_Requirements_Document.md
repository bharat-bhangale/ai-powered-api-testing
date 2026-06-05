# ATX Desktop Application — Product Requirements Document (PRD)

> **Version:** 1.0  
> **Author:** Bharat Bhangale  
> **Date:** June 2026  
> **Status:** Draft

---

## 1. Executive Summary

### 1.1 Vision Statement

ATX (AI-powered API Testing eXplorer) Desktop is a native desktop application that brings the full power of the ATX web platform to Windows, macOS, and Linux as a standalone Electron-based app. It combines the intuitive request-building UX of Postman with deeply integrated AI capabilities — auto-test generation, intelligent debugging, coverage analysis, and automated documentation — all running locally with optional cloud sync.

### 1.2 Problem Statement

- **Postman** is feature-rich but AI is an afterthought — Postbot is limited, locked behind enterprise tiers
- **Insomnia** is lightweight but lacks testing depth and AI
- **Bruno** is offline-first but has zero AI integration
- No tool unifies: request building + AI testing + collection running + schema validation + API documentation in a single desktop experience

### 1.3 Product Positioning

ATX Desktop is the **AI-native API development companion** — it doesn't just let you make API calls, it **thinks about your APIs** and generates tests, finds bugs, validates schemas, and writes documentation automatically.

---

## 2. Target Users & Personas

### Persona 1: Solo Backend Developer ("Dev Deepak")
- Builds REST APIs in Node.js/Python
- Tests manually with curl/Postman
- Wants: Auto-generated tests after each request, instant debugging help
- Pain: Writing test assertions is tedious, forgets edge cases

### Persona 2: QA Engineer ("QA Priya")  
- Runs regression suites across environments
- Manages 200+ endpoints across 10 collections
- Wants: Scheduled runs, cross-environment matrix testing, flaky test detection
- Pain: Manual test maintenance, no visibility into API health trends

### Persona 3: Tech Lead ("Lead Arjun")
- Reviews API contracts, ensures quality
- Needs: Auto-generated API docs, coverage reports, health dashboards
- Wants: Know at a glance what's tested, what's broken, what's slow
- Pain: Documentation is always stale, no automated coverage tracking

### Persona 4: Freelancer ("Freelance Neha")
- Works on multiple client projects
- Wants: Offline-first, fast, no account required for basic usage
- Pain: Cloud-only tools don't work on client VPNs, slow electron apps

---

## 3. Feature Matrix

### 3.1 Core Features (Already Built — Web App)

| # | Feature | Status | Module |
|:--|:--------|:-------|:-------|
| F1 | Request Builder (GET/POST/PUT/PATCH/DELETE) | ✅ Done | `request-builder` |
| F2 | Tabbed Interface (multi-request editing) | ✅ Done | `requestStore` |
| F3 | Response Viewer (body/headers/timing) | ✅ Done | `response-viewer` |
| F4 | Collections & Folders (CRUD + drag-drop) | ✅ Done | `collections` |
| F5 | Environments & Variables (`{{var}}` substitution) | ✅ Done | `environments` |
| F6 | Request History (auto-saved, searchable) | ✅ Done | `history` |
| F7 | Auth (JWT login/register + refresh) | ✅ Done | `auth` |
| F8 | Import (Postman/Insomnia/cURL/OpenAPI) | ✅ Done | `import` |
| F9 | Dark/Light Theming + Keyboard Shortcuts | ✅ Done | `styles`, `hooks` |
| F10 | Offline Detection + Error Boundaries | ✅ Done | `common` |

### 3.2 AI Features (Already Built — Web App)

| # | Feature | Status | Module |
|:--|:--------|:-------|:-------|
| AI1 | AI Test Generator (per request) | ✅ Done | `test-generator` |
| AI2 | AI Debug Assistant (error analysis) | ✅ Done | `debug-assistant` |
| AI3 | AI Chat (streaming SSE) | ✅ Done | `chat` |
| AI4 | AI Test Suite Generator (collection-level) | ✅ Done | `suite-generator` |
| AI5 | AI Coverage Analyzer | ✅ Done | `coverage-analyzer` |
| AI6 | AI API Documentation Generator (OpenAPI 3.0) | ✅ Done | `api-doc-generator` |

### 3.3 Automation Features (Already Built — Web App)

| # | Feature | Status | Module |
|:--|:--------|:-------|:-------|
| A1 | Test Script Runner (sandbox VM) | ✅ Done | `test-runner` |
| A2 | Auto-Test on Response | ✅ Done | `testRunnerStore` |
| A3 | Collection Runner (sequential + SSE) | ✅ Done | `collection-runner` |
| A4 | Request Chaining (`{{chain.*}}` variables) | ✅ Done | `chain-resolver` |
| A5 | Pre-Request Scripts (sandbox VM) | ✅ Done | `pre-request-runner` |
| A6 | Scheduled Test Runs (cron-based) | ✅ Done | `schedules` |
| A7 | AI Schema Validator (auto-infer contracts) | ✅ Done | `schema-validator` |
| A8 | Environment Matrix Runner | ✅ Done | `environment-matrix` |

### 3.4 Reporting Features (Already Built — Web App)

| # | Feature | Status | Module |
|:--|:--------|:-------|:-------|
| R1 | Test Dashboard (pass rate, trends, health) | ✅ Done | `dashboard` |
| R2 | Test Run History & Trends | ✅ Done | `test-runs` |
| R3 | Flaky Test Detection | ✅ Done | `test-trend` |
| R4 | Regression Alerts | ✅ Done | `test-trend` |
| R5 | Performance Degradation Detection | ✅ Done | `test-trend` |

### 3.5 Desktop-Specific Features (TO BUILD)

| # | Feature | Priority | Description |
|:--|:--------|:---------|:------------|
| D1 | Electron Shell + Window Management | P0 | Native window with menu bar, title bar, system tray |
| D2 | Local-First Data Storage | P0 | SQLite/NeDB for offline collections, optional MongoDB sync |
| D3 | Native File Dialogs | P1 | Save/open collections as files, export responses |
| D4 | System Proxy Settings | P1 | Respect OS proxy, custom proxy config per environment |
| D5 | Certificate Management | P1 | Import client certs, disable SSL verification per request |
| D6 | Protocol Support (gRPC, WebSocket, GraphQL) | P2 | Beyond REST — protocol tabs in request builder |
| D7 | Native Notifications | P1 | Schedule run failures → OS notification |
| D8 | Auto-Updates (Electron Updater) | P1 | Seamless app updates via GitHub Releases |
| D9 | Code Generation | P2 | Generate cURL/Python/JS/Go code from requests |
| D10 | Workspace Sync | P2 | Optional cloud sync across devices |
| D11 | Plugin System | P3 | Community-built extensions for custom auth, transforms |
| D12 | Multi-Window Support | P2 | Detach tabs to separate windows |

---

## 4. Success Metrics

| Metric | Target (6 months) |
|:-------|:------------------|
| GitHub Stars | 500+ |
| Downloads | 5,000+ |
| Daily Active Users | 200+ |
| Average Session Length | 25+ minutes |
| AI Feature Adoption | 60% of users use at least 1 AI feature |
| Test Generation Rate | 80% of responses auto-trigger test gen |
| Crash Rate | < 0.5% of sessions |
| Cold Start Time | < 3 seconds |

---

## 5. Non-Functional Requirements

### 5.1 Performance
- Cold start: < 3 seconds
- Request execution: < 100ms overhead
- UI response: < 50ms for all interactions
- Memory: < 300MB idle, < 800MB under load

### 5.2 Security
- All API keys stored encrypted (OS keychain integration)
- No telemetry without explicit opt-in
- Requests never proxied through ATX servers
- Auth tokens in HTTP-only cookies

### 5.3 Accessibility
- Full keyboard navigation
- Screen reader compatible
- WCAG 2.1 AA compliance
- Resizable panels and font sizes

### 5.4 Platform Support
- Windows 10+ (x64, ARM64)
- macOS 12+ (Intel, Apple Silicon)
- Linux (AppImage, .deb, .rpm)

---

## 6. Release Plan

### Phase 1: Desktop Shell (Week 1-2)
- Electron wrapper around existing web app
- Native menus, window chrome, system tray
- Local API server bundled

### Phase 2: Local-First (Week 3-4)
- SQLite storage layer
- Offline mode with full functionality
- File-based collection import/export

### Phase 3: Desktop Enhancements (Week 5-6)
- Certificate management
- Proxy settings
- Native file dialogs
- Auto-updates

### Phase 4: Advanced Protocols (Week 7-8)
- WebSocket testing
- GraphQL support
- Code generation

---

## 7. Assumptions

1. The existing web app codebase (React + Express) will be wrapped in Electron
2. The Express API server will be bundled inside Electron as a local server
3. MongoDB will be replaced with SQLite/NeDB for local-first desktop usage
4. Gemini API key will be user-provided (settings panel) — no ATX cloud dependency
5. The app will be distributed as a free, open-source tool (MIT license)
6. Electron v33+ will be used for latest Chromium security
7. The existing CSS Modules design system will carry over unchanged

---

## 8. Out of Scope (V1)

- Mobile app (iOS/Android)
- Team collaboration (shared workspaces)
- CI/CD pipeline integration CLI
- API mocking server
- Load/performance testing (k6-style)
- OAuth2 flow browser popup handling
