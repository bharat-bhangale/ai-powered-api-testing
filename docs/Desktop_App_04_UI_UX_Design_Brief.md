# ATX Desktop Application - UI/UX Design Brief

Version: 2.0
Date: June 2026
Product: ATX Desktop
Audience: AI coding agents and UI engineers implementing the desktop user interface

## 1. Design Goal

ATX Desktop should feel like a precise developer tool: dense, readable, keyboard-friendly, and focused on repeated API testing workflows. The app should not look like a marketing website. The first screen is the API testing workbench.

The UI must reuse the existing ATX design system:

- React components.
- CSS Modules.
- CSS variables from `apps/web/src/styles/variables.css`.
- Lucide React icons.
- Monaco editor where code or JSON editing is required.
- No Tailwind CSS.
- No decorative gradient orbs, bokeh backgrounds, or oversized hero layouts.

## 2. Visual Principles

| Principle | Requirement |
|:--|:--|
| Workbench first | The primary view is a productivity layout with tools, panels, and editors. |
| High information density | Use compact spacing and predictable alignment. |
| Clear hierarchy | Method, URL, Send, response status, and active collection must be visually dominant. |
| Low decoration | Styling supports scanning and interaction, not brand theater. |
| Review before mutation | AI-generated changes appear in preview panels before being accepted. |
| Desktop-native polish | Menus, dialogs, tray, and notifications should feel integrated with the OS. |

## 3. Design Tokens

Use these existing CSS variables. Do not hard-code colors, spacing, borders, shadows, or typography values.

### 3.1 Colors

| Purpose | Token |
|:--|:--|
| Primary action | `var(--color-primary)` |
| App background | `var(--color-bg-app)` |
| Surface | `var(--color-bg-surface)` |
| Elevated surface | `var(--color-bg-elevated)` |
| Hover state | `var(--color-bg-hover)` |
| Active state | `var(--color-bg-active)` |
| Input background | `var(--color-bg-input)` |
| Border | `var(--color-border)` |
| Hover border | `var(--color-border-hover)` |
| Focus border | `var(--color-border-focus)` |
| Primary text | `var(--color-text-primary)` |
| Secondary text | `var(--color-text-secondary)` |
| Tertiary text | `var(--color-text-tertiary)` |
| Success | `var(--color-success)` |
| Warning | `var(--color-warning)` |
| Error | `var(--color-error)` |
| Info | `var(--color-info)` |

HTTP method tokens:

- GET: `var(--color-method-get)`
- POST: `var(--color-method-post)`
- PUT: `var(--color-method-put)`
- PATCH: `var(--color-method-patch)`
- DELETE: `var(--color-method-delete)`

### 3.2 Typography

| Purpose | Token |
|:--|:--|
| UI font | `var(--font-sans)` |
| Code font | `var(--font-mono)` |
| Tiny labels | `var(--text-xs)` |
| Body text | `var(--text-sm)` |
| Section title | `var(--text-base)` or `var(--text-lg)` |
| Page title | `var(--text-xl)` or `var(--text-2xl)` |

Rules:

- Do not scale font size with viewport width.
- Keep letter spacing at `0`.
- Use mono font for JSON, scripts, headers table values, cURL, and generated code.

### 3.3 Spacing, Radius, Shadows

| Purpose | Token |
|:--|:--|
| Small gaps | `var(--space-1)` to `var(--space-3)` |
| Panel padding | `var(--space-4)` to `var(--space-6)` |
| Large layout gaps | `var(--space-8)` to `var(--space-12)` |
| Small radius | `var(--radius-sm)` |
| Medium radius | `var(--radius-md)` |
| Large radius | `var(--radius-lg)` |
| Overlay shadow | `var(--shadow-lg)` or `var(--shadow-xl)` |

Cards and framed repeated items should use radius `var(--radius-lg)` or less.

## 4. Main Workbench Layout

Default desktop viewport: 1440 x 900.
Minimum supported viewport: 1024 x 720.

```text
+------------------------------------------------------------------+
| Title Bar / Top Bar (48px)                                       |
+----------------------+-------------------------------------------+
| Sidebar (280px)      | Request Tabs (36px)                       |
|                      +-------------------------------------------+
| Collections          | URL Bar + Send Controls                    |
| Environments         +-------------------------------------------+
| History              | Request Editor             | AI Panel      |
| Imports              | Params Headers Body Tests  | (360px)       |
|                      +----------------------------+---------------+
|                      | Response Viewer                            |
+----------------------+-------------------------------------------+
| Status Bar (28px)                                                |
+------------------------------------------------------------------+
```

Panel dimensions:

| Element | Size |
|:--|:--|
| Sidebar | 280px default, 220px minimum, 420px maximum |
| Top bar | 48px |
| Request tabs | 36px |
| Status bar | 28px |
| AI panel | 360px default, 300px minimum, 520px maximum |
| Modal max width | 720px for normal modals, 960px for import preview |
| Settings content width | 1040px max with left settings nav |

Responsive rules:

- Below 1180px width, AI panel is collapsible by default.
- Below 1024px width, sidebar may collapse to icon rail.
- Do not let URL controls wrap in a way that hides Send. If space is tight, move secondary actions into an overflow menu.
- Editors and result panels must use stable heights to avoid layout shift while typing or running requests.

## 5. Desktop Title Bar

Two acceptable approaches:

1. Use native frame on macOS and Linux where it looks acceptable.
2. Use a custom title bar on Windows for app-level controls and consistent styling.

Custom title bar requirements:

- Height: 32px to 36px.
- Drag region only on non-interactive empty areas.
- Window controls on Windows: minimize, maximize or restore, close.
- App title: `ATX`.
- Show workspace or collection name if available.
- Keep controls keyboard accessible.

Do not place primary request actions in the title bar. Keep Send, Save, and environment controls in the app top bar.

## 6. Top Bar

Purpose:

- Global navigation and current context.
- Environment selector.
- Import action.
- Runner and dashboard entry.
- Settings.
- AI usage indicator.

Required controls:

- App logo or short `ATX` mark.
- New Request icon button.
- Import icon button.
- Environment selector.
- Dashboard icon button.
- Runner icon button.
- AI panel toggle.
- Theme switcher.
- Settings icon button.

Use Lucide icons where available. Text labels may be included for high-value actions such as Send, Save, and Import when space allows.

## 7. Sidebar

Sidebar sections:

- Collections.
- Environments.
- History.
- Imports or recent files if implemented.

Collection tree requirements:

- Clear icons for collection, folder, and request.
- HTTP method badge on request rows.
- Active request row highlighted with `var(--color-bg-active)`.
- Context menu for collection, folder, and request actions.
- Search field at top of collections list.
- Empty state with New Collection and Import actions.

Tree row sizing:

- Height: 28px to 32px.
- Indentation: 16px per nesting level.
- Method badge width: stable, no layout shift between methods.

## 8. Request Builder

### 8.1 URL Bar

Required layout:

```text
[Method selector] [URL input................................] [Send] [Save] [More]
```

Rules:

- Method selector uses method colors.
- URL input uses mono font only if current web style already does; otherwise use UI font for readability.
- Send button uses primary color.
- Save is secondary unless unsaved changes exist.
- More menu contains copy as cURL, generate code, duplicate, and close.

### 8.2 Request Tabs

Request tabs show:

- Request name or URL fallback.
- Unsaved indicator.
- Close button.
- Method color strip or badge.

Behavior:

- Active tab is visually clear.
- Tabs do not resize while response status changes.
- Overflow tabs use horizontal scrolling or dropdown list.

### 8.3 Editors

Request editor tabs:

- Params.
- Headers.
- Auth.
- Body.
- Pre-request Script.
- Tests.

Key-value editor:

- Columns: enabled, key, value, description, actions.
- Stable row height.
- Secret values masked.
- Add row button at bottom.
- Disabled rows visibly muted.

Body editor:

- Monaco for JSON and raw code-like content.
- Form-data view if supported.
- Empty body state for GET and HEAD.
- JSON validation shown inline.

Auth config:

- Types: none, bearer, basic, API key.
- Collection inheritance indicator.
- Secret values are masked and stored through keychain in desktop mode.

## 9. Response Viewer

Required areas:

- Status and status text.
- Timing.
- Size.
- Body view.
- Headers view.
- Test results.
- AI debug entry point.

Response body tabs:

- Pretty.
- Raw.
- Preview if safe and implemented.
- Tests.

Status styling:

- 2xx: success token.
- 3xx: info token.
- 4xx: warning token.
- 5xx: error token.

Rules:

- JSON body uses mono font.
- Long lines can wrap based on user preference.
- Copy buttons use icons with tooltips.
- Failed request panel offers Retry and Debug with AI.

## 10. AI Panel

The AI panel is a persistent right panel, not a modal-first experience.

Sections:

- Chat.
- Test Suggestions.
- Debug Analysis.
- Suite Generation.
- Coverage Analysis.
- Documentation Generation.

AI panel requirements:

- Width: 360px default.
- Collapsible.
- Resizable.
- Shows configured or missing AI key state.
- Shows usage remaining when available.
- Shows sanitized context summary before sending.
- Uses review cards for generated tests, requests, docs, and fixes.

Review card actions:

- Accept.
- Edit.
- Copy.
- Dismiss.
- Apply selected.

AI safety UI:

- Redacted secrets must be visibly marked as redacted.
- Destructive AI changes require confirmation.
- AI-generated tests are inserted only after user approval.

## 11. Collection Runner UI

Runner layout:

```text
Runner Header: collection, environment, controls, summary
|
+-- Run result table
|   +-- request name
|   +-- method
|   +-- status
|   +-- duration
|   +-- tests passed
|   +-- tests failed
|   +-- actions
|
+-- Detail panel for selected row
```

Controls:

- Start.
- Stop.
- Rerun failed.
- Export result.
- Open history.

Summary:

- Total requests.
- Completed.
- Passed tests.
- Failed tests.
- Total duration.

Use compact table rows and status chips based on design tokens.

## 12. Dashboard UI

Dashboard should be operational, not decorative.

Widgets:

- Recent runs.
- Pass/fail trend.
- Slowest endpoints.
- Recent history.
- Schema violations.
- AI usage.
- Schedules due.

Rules:

- Avoid oversized cards.
- Use compact data panels.
- Every widget should have a direct action, such as open runner, open schema contracts, or open failed request.
- Empty widgets include one clear action.

## 13. Settings UI

Settings is a full page or large modal with a left navigation rail and right content area.

Sections and controls:

### 13.1 General

- Theme: light, dark, system.
- Startup route.
- Open last workspace toggle.
- History retention.
- Minimize to tray toggle.

### 13.2 AI

- Gemini API key input with reveal toggle.
- Model input or selector.
- Test key action.
- Clear AI chat history.
- Usage display.

### 13.3 Proxy

- System proxy.
- Manual proxy.
- No proxy.
- Proxy host, port, username, password.
- Test proxy action.

### 13.4 Certificates

- Import certificate.
- Certificate list.
- Expiry status.
- Remove certificate.
- Assign certificate to request or collection if implemented.

### 13.5 Data

- Data directory display.
- Open data directory.
- Create backup.
- Restore backup.
- Export all.
- Clear history.

### 13.6 Updates

- Current version.
- Check for updates.
- Update channel.
- Auto-download toggle.
- Install downloaded update.

### 13.7 About

- App version.
- Runtime mode.
- API status.
- SQLite path.
- Open logs.
- License links.

## 14. Modals and Dialogs

Modal rules:

- Use modals for focused tasks: save request, create collection, import preview, confirm delete, restore summary.
- Do not put nested cards inside modal cards.
- First focus target should be the primary input or first actionable control.
- Escape closes only when it will not lose unsaved work.
- Destructive actions use clear confirmation text and error color.

Native dialogs:

- Use Electron file dialogs for file paths.
- Keep browser-like fallback only for web mode.
- Always show selected file name in the UI after native file selection.

## 15. Notifications and Status

### 15.1 In-App Toasts

Use existing Sonner setup for:

- Save success.
- Import success.
- Export success.
- AI generation complete.
- Backup created.
- Non-critical errors.

### 15.2 Status Bar

Status bar shows:

- Runtime mode.
- API connection status.
- Active environment.
- Last request status and timing.
- AI key status.
- Background runner or schedule status.

### 15.3 Native Notifications

Use native notifications for:

- Scheduled run failed.
- Long collection run completed.
- Update available.
- Backup complete if the app is minimized.

Native notification text must be short and actionable.

## 16. Accessibility

Requirements:

- All icon-only buttons have accessible labels and tooltips.
- Focus ring uses `var(--color-border-focus)`.
- Menus and modals are keyboard navigable.
- Tables support row selection through keyboard.
- Response status uses text plus color.
- Error messages are close to the failing input.
- Contrast must remain readable in dark and light themes.
- Reduced motion setting disables non-essential animations.

## 17. Interaction States

Every interactive element needs:

- Default.
- Hover.
- Focus.
- Active.
- Disabled.
- Loading where relevant.
- Error where relevant.

Buttons:

- Primary for Send and confirmation actions.
- Secondary for Save, Cancel, Export, and neutral actions.
- Destructive for delete, clear, and restore overwrite actions.
- Icon buttons for toolbar actions with tooltips.

## 18. Empty States

Required empty states:

- No collections.
- No saved requests in collection.
- No environments.
- No history.
- No response yet.
- No AI key configured.
- No test results.
- No schedules.
- No schema contracts.

Empty states should be compact and action-oriented. They must not explain the product at length.

## 19. Loading States

Required loading states:

- App initializing local API.
- Sending request.
- Saving request.
- Loading collections.
- Import parsing.
- Collection runner active.
- AI generation active.
- Backup or restore active.
- Update check active.

Loading states must not resize the surrounding layout.

## 20. Error States

Error UI must identify:

- What failed.
- Why it likely failed.
- What the user can do next.

Common actions:

- Retry.
- Open settings.
- Open logs.
- Copy error details.
- Debug with AI if relevant and configured.

Do not hide technical errors from developer users, but put stack traces behind a details expander.

## 21. CSS Module Guidance

Component styling rules:

- Each new component has a colocated `.module.css` file.
- Use class names based on UI role, such as `.toolbar`, `.panel`, `.row`, `.statusBadge`.
- Use design variables for all visual tokens.
- Avoid global selectors except in shared CSS files.
- Do not style based on DOM depth when a class is clearer.
- Keep responsive rules local to the component when possible.

## 22. Visual Acceptance Checklist

The UI is acceptable when:

- Workbench opens as the first desktop screen.
- No text overlaps in 1024 x 720 and 1440 x 900.
- Send, URL, method, active environment, and active response status are easy to find.
- AI panel can be opened, closed, and resized without breaking layout.
- Sidebar tree remains readable with long collection and request names.
- Settings pages are scannable and do not use marketing-style hero sections.
- Dark and light themes use only existing CSS variables.
- Native menu commands map to visible renderer behavior.
