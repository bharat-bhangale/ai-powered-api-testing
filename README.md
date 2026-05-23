# 🚀 AI-Powered API Testing Tool

An intelligent API testing platform built with React, Express, and AI — like Postman, but with AI-powered test generation, smart debugging, and an integrated chat assistant.

## ✨ Features

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

## 🛠️ Tech Stack

| Layer | Technology |
|:------|:-----------|
| Frontend | React 19, Vite 6, TypeScript |
| State | Zustand (client), TanStack Query (server) |
| Styling | CSS Modules + CSS Variables |
| Backend | Express 5, TypeScript |
| Database | MongoDB Atlas, Mongoose |
| AI | OpenAI GPT-4o-mini (structured outputs) |
| Testing | Vitest |

## 📁 Project Structure

```
ai-powered-api-testing/
├── apps/
│   ├── web/          # React frontend (Vite)
│   └── api/          # Express backend
├── packages/
│   ├── shared/       # Shared TypeScript types & Zod schemas
│   └── utils/        # Shared utility functions
├── tooling/
│   ├── tsconfig/     # Shared TypeScript configs
│   └── eslint-config/ # Shared ESLint configs
└── .agents/          # AI agent configuration (Skills, Hooks)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 22+ (LTS)
- MongoDB Atlas account (free M0 tier)
- OpenAI API key

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/ai-powered-api-testing.git
cd ai-powered-api-testing
npm install
```

### Environment Setup

```bash
# Copy the example env file
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your credentials
```

### Development

```bash
npm run dev
```

This starts:
- Frontend at `http://localhost:5173`
- Backend at `http://localhost:8000`

## 📝 License

MIT © Bharat Bhangale
