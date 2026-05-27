# ⚡ ATX — AI-Powered API Testing Tool

An intelligent API testing platform built with React, Express, and AI — like Postman, but with AI-powered test generation, smart debugging, and an integrated chat assistant.

## 🚀 Features

- **Request Builder** — Build HTTP requests with method selector, headers, params, and JSON body editor (Monaco)
- **Response Viewer** — Pretty-printed JSON, status badges, timing metrics, response headers
- **Multi-Tab Interface** — Work on multiple API requests simultaneously
- **Collections & Folders** — Organize saved requests into collections with nested folders
- **Environment Variables** — Switch between Dev/Staging/Prod with `{{variable}}` resolution
- **Request History** — Auto-saved history with search, filter, and replay
- **cURL Import/Export** — Paste cURL commands or export requests as cURL
- **Postman Import** — Migrate collections from Postman (v2.1 format)
- **AI Chat Assistant** — Ask questions about your API with full request/response context
- **AI Test Generation** — Generate comprehensive test assertions from any API response
- **AI Debug Assistant** — Get instant diagnosis and fix suggestions for error responses
- **Dark/Light Theme** — System-aware theming with smooth transitions
- **Keyboard Shortcuts** — Ctrl+Enter send, Ctrl+S save, Ctrl+N new tab, and more

## 🛠️ Tech Stack

| Layer | Technology |
|:------|:-----------|
| Frontend | React 19, Vite 6, TypeScript |
| State | Zustand (client), TanStack Query (server) |
| Styling | CSS Modules + CSS Variables (no Tailwind) |
| Backend | Express 5, TypeScript |
| Database | MongoDB Atlas, Mongoose 8 |
| AI | OpenAI GPT-4o-mini (structured outputs via Zod) |
| Testing | Vitest |

## 📁 Project Structure

```
ai-powered-api-testing/
├── apps/
│   ├── web/                 # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── app/         # App, Router, ErrorBoundary
│   │   │   ├── components/  # UI components (ai, layout, sidebar, etc.)
│   │   │   ├── hooks/       # useTheme, useKeyboardShortcuts
│   │   │   ├── services/    # API client, executor service
│   │   │   ├── stores/      # Zustand stores (request, auth, ai, etc.)
│   │   │   └── styles/      # CSS variables, animations, index.css
│   │   └── index.html
│   └── api/                 # Express backend
│       └── src/
│           ├── config/      # Environment config (Zod-validated)
│           ├── middleware/   # Auth, error handling
│           └── modules/     # Feature modules
│               ├── ai/      # LLM Gateway, chat, test gen, debug
│               ├── auth/    # JWT auth with refresh tokens
│               ├── collections/
│               ├── environments/
│               ├── executor/ # Proxy HTTP executor
│               ├── history/
│               ├── import/  # cURL + Postman import
│               └── requests/
├── packages/
│   ├── shared/              # Shared TypeScript types & Zod schemas
│   └── utils/               # Shared utility functions
├── tooling/
│   ├── tsconfig/            # Shared TypeScript configs
│   └── eslint-config/       # Shared ESLint configs
└── docs/                    # 7-day sprint guides & prompts
```

## 🏁 Getting Started

### Prerequisites

- Node.js 22+ (LTS)
- MongoDB Atlas account ([free M0 tier](https://cloud.mongodb.com))
- OpenAI API key ([platform.openai.com](https://platform.openai.com))

### Installation

```bash
git clone https://github.com/bharat-bhangale/ai-powered-api-testing.git
cd ai-powered-api-testing
npm install
```

### Environment Setup

Create `apps/api/.env`:

```env
PORT=8000
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/atx
ACCESS_TOKEN_SECRET=<generate-64-char-random-string>
REFRESH_TOKEN_SECRET=<generate-another-64-char-random-string>
FRONTEND_URL=http://localhost:5173
OPENAI_API_KEY=sk-...
NODE_ENV=development
```

### Development

```bash
npm run dev
```

This starts:
- Frontend at `http://localhost:5173`
- Backend at `http://localhost:8000`

### Running Tests

```bash
npx vitest run
```

## ☁️ Deployment

### Backend → Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Set root directory: `apps/api`
3. Build command: `npm run build`
4. Start command: `npm start`
5. Add environment variables (see table below)
6. Note the deployment URL (e.g., `https://your-api.up.railway.app`)

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → Import from GitHub
2. Set root directory: `apps/web`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add env: `VITE_API_URL=https://your-api.up.railway.app`
6. Deploy

### Post-Deploy

- Update Railway's `FRONTEND_URL` to your Vercel URL
- Test CORS: can the frontend call the backend?
- Test auth flow: register → login → create collection

## 🔑 Environment Variables

### Backend (`apps/api/.env`)

| Variable | Required | Description |
|:---------|:---------|:------------|
| `PORT` | ✅ | Server port (default: 8000) |
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `ACCESS_TOKEN_SECRET` | ✅ | JWT access token secret (64+ chars) |
| `REFRESH_TOKEN_SECRET` | ✅ | JWT refresh token secret (64+ chars) |
| `FRONTEND_URL` | ✅ | Frontend URL for CORS (e.g., `http://localhost:5173`) |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for AI features |
| `NODE_ENV` | ❌ | `development` or `production` |

### Frontend (`apps/web/.env`)

| Variable | Required | Description |
|:---------|:---------|:------------|
| `VITE_API_URL` | ❌ | Backend URL (default: `http://localhost:8000`) |

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|:---------|:-------|
| `Ctrl+Enter` | Send request |
| `Ctrl+S` | Save request |
| `Ctrl+N` | New tab |
| `Ctrl+W` | Close current tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Ctrl+L` | Focus URL bar |
| `Ctrl+Shift+I` | Toggle AI chat |
| `Ctrl+E` | Environment selector |
| `Ctrl+H` | History panel |
| `Ctrl+Shift+C` | Copy as cURL |
| `Escape` | Close modal/dropdown |

## 📄 License

MIT © Bharat Bhangale
