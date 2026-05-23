# Master Prompt Engineering & Agent Orchestration Guide

## For Claude Opus 4.6 in Google Antigravity IDE

**Developer:** Bharat Bhangale  
**Project:** AI-Powered API Testing Tool  
**Purpose:** Complete guide for using Skills, Sub-Agents, Hooks, and optimized prompts

---

## Table of Contents

1. [How Antigravity's Agent System Works](#1-how-antigravitys-agent-system-works)
2. [Setting Up Your Agent Infrastructure](#2-setting-up-your-agent-infrastructure)
3. [The Unified Prompt System](#3-the-unified-prompt-system)
4. [Daily Workflow: Step-by-Step Execution](#4-daily-workflow-step-by-step-execution)
5. [Prompt File Index](#5-prompt-file-index)

---

## 1. How Antigravity's Agent System Works

### 1.1 The Four Building Blocks

```
┌─────────────────────────────────────────────────────────┐
│                  YOUR PROJECT                            │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  SKILLS  │  │  AGENTS  │  │  HOOKS   │  │ PROMPTS │ │
│  │          │  │   .md    │  │          │  │ (yours) │ │
│  │ Persistent│  │ Cross-   │  │Automated │  │ Per-    │ │
│  │ knowledge│  │ tool     │  │ quality  │  │ feature │ │
│  │ for every│  │ rules    │  │ gates    │  │ copy-   │ │
│  │ agent    │  │ for all  │  │ after    │  │ paste   │ │
│  │ session  │  │ agents   │  │ edits    │  │ ready   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
```

| Block | What It Is | Where It Lives | When It's Read |
|:------|:-----------|:---------------|:---------------|
| **Skills** | Project knowledge that persists across all conversations | `.agent/skills/*.md` | Every time Claude starts a new task |
| **AGENTS.md** | Universal rules for any AI agent in the project | `AGENTS.md` (project root) | Every time any agent reads the project |
| **Hooks** | Shell scripts that run automatically after edits | `.agent/hooks/*.sh` | After Claude edits a file (PostToolUse) |
| **Prompts** | Your copy-paste prompts for each feature | Your report files | When you start a new feature task |

### 1.2 How Sub-Agents Work

When you give Claude a complex task, it can delegate to **sub-agents** — isolated sessions that handle focused work:

```
YOU (prompt) ──► ORCHESTRATOR AGENT
                    │
                    ├──► SUB-AGENT 1: Backend (model, service, routes)
                    ├──► SUB-AGENT 2: Frontend (components, store, CSS)
                    └──► SUB-AGENT 3: Integration (API calls, wiring)
                    │
                    ▼
              ORCHESTRATOR reviews all outputs
              and commits the unified result
```

**Key principle:** Sub-agents run in **parallel** and each gets its own context window. This means:
- They don't pollute each other's context
- Each sub-agent can focus deeply on its domain
- The orchestrator merges their work

### 1.3 How Skills Reduce Token Usage

Without Skills, you'd repeat project context in every prompt:

```
❌ BAD: "Build the Collections CRUD. By the way, we use Express+TypeScript, 
   Mongoose, Zod validation, CSS Modules not Tailwind, our response format 
   is {success, data, error}..." (50+ extra tokens EVERY time)

✅ GOOD: "Build the Collections CRUD module." 
   (Skills file already told Claude everything it needs)
```

**Skills reduce each prompt by ~200-500 tokens** because they pre-load:
- Architecture decisions
- Coding standards
- File locations
- Design tokens
- Response format conventions

---

## 2. Setting Up Your Agent Infrastructure

### Step 1: Create the folder structure (run once before Day 1)

```
api-testing-tool/
├── .agent/
│   ├── skills/
│   │   ├── project-architecture.md      ← Core architecture knowledge
│   │   ├── design-system.md             ← All CSS design tokens
│   │   ├── backend-patterns.md          ← Backend module conventions
│   │   └── frontend-patterns.md         ← Frontend component conventions
│   └── hooks/
│       └── post-edit-lint.sh            ← Auto-lint after every edit
├── AGENTS.md                            ← Universal agent rules
└── ... (rest of project)
```

### Step 2: Create each Skills file

These are detailed in the companion file: **`Skills_and_Agents_Configuration.md`**

### Step 3: Create AGENTS.md

Already provided in your Sprint Overview file. Copy it to your project root.

### Step 4: Understand the prompt workflow

```
┌──────────────────── YOUR DAILY WORKFLOW ────────────────────┐
│                                                              │
│  1. OPEN Antigravity                                         │
│  2. PASTE the Day's Orchestrator Prompt (from report file)   │
│  3. REVIEW Claude's implementation plan                      │
│  4. APPROVE → Claude delegates to sub-agents                 │
│  5. VERIFY in browser                                        │
│  6. PASTE next feature prompt if needed                      │
│  7. COMMIT to Git at end of day                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. The Unified Prompt System

### 3.1 Prompt Anatomy

Every prompt in this guide follows the same structure for consistency:

```
┌─────────────────────────────────────────────────┐
│ FEATURE PROMPT STRUCTURE                         │
│                                                  │
│ [CONTEXT]      What feature, what day            │
│ [SCOPE]        Backend / Frontend / Both          │
│ [FILES]        Exact file paths to create/modify │
│ [SPEC]         Functional requirements           │
│ [CONSTRAINTS]  Design/tech constraints           │
│ [VERIFICATION] How to test it works              │
│                                                  │
│ ← Skills handle: architecture, design tokens,    │
│   coding standards, file conventions             │
└─────────────────────────────────────────────────┘
```

### 3.2 The Four Agent Roles

Each feature prompt can target one of four agent roles:

| Role | Symbol | Scope | Skills Used |
|:-----|:-------|:------|:------------|
| **🏗️ Backend Agent** | `[BE]` | Models, services, controllers, routes, validation | `backend-patterns.md` |
| **🎨 Frontend Agent** | `[FE]` | Components, stores, hooks, CSS modules | `frontend-patterns.md`, `design-system.md` |
| **🔌 Integration Agent** | `[INT]` | API service layer, connecting FE↔BE | Both patterns |
| **🧪 Testing Agent** | `[TEST]` | Unit tests, integration tests | Both patterns |

### 3.3 How to Use the Prompts

**Option A: Single-Agent Mode (simpler, recommended for beginners)**
1. Copy the **Full Feature Prompt** from the day's report file
2. Paste it into Antigravity
3. Claude builds everything in sequence

**Option B: Multi-Agent Mode (faster, for parallel work)**
1. Copy the **Orchestrator Prompt** from the day's report file
2. Claude creates a plan and delegates to sub-agents
3. Sub-agents work in parallel (backend + frontend simultaneously)

**Option C: Granular Mode (most control)**
1. Copy individual `[BE]`, `[FE]`, `[INT]` prompts separately
2. Run them one at a time
3. Verify each before proceeding

---

## 4. Daily Workflow: Step-by-Step Execution

### Morning Startup (Every Day)

```
Step 1: Open Antigravity IDE
Step 2: Open the day's report file (e.g., Day3_Prompts_Auth_Collections.md)
Step 3: Copy the "ORCHESTRATOR PROMPT" section
Step 4: Paste into Claude chat
Step 5: Wait for implementation plan
Step 6: Review → type "approve" or suggest changes
Step 7: Claude executes (may spawn sub-agents)
Step 8: Test in browser when done
```

### When Claude Finishes a Feature

```
Step 1: Open browser → test the feature manually
Step 2: If bugs: describe the bug to Claude → it fixes
Step 3: If working: move to next feature prompt
Step 4: At end of day: git add . && git commit -m "Day X: [features]"
```

### When You Get Stuck

```
Option 1: "Explain what you just did and why"
Option 2: "The [component] is not rendering. Debug it."
Option 3: "Run npm run dev and show me any errors"
Option 4: Refer to the Day Guide (.md) for the expected code
```

---

## 5. Prompt File Index

| File | Content | Day |
|:-----|:--------|:----|
| [Skills_and_Agents_Configuration.md](file:///c:/Users/bhang/OneDrive/Desktop/AI Projects/AI-API-Testing-Tool-Research/Skills_and_Agents_Configuration.md) | All Skills files, AGENTS.md, Hooks — create these FIRST | Pre-Day 1 |
| [Day1_2_Prompts_Foundation.md](file:///c:/Users/bhang/OneDrive/Desktop/AI Projects/AI-API-Testing-Tool-Research/Day1_2_Prompts_Foundation.md) | 10 prompts for: setup, design system, request builder, KV editors, Monaco, executor, SSRF, response viewer, tabs, integration | Day 1-2 |
| [Day3_Prompts_Auth_Collections.md](file:///c:/Users/bhang/OneDrive/Desktop/AI Projects/AI-API-Testing-Tool-Research/Day3_Prompts_Auth_Collections.md) | 6 prompts for: auth backend, auth frontend, collections CRUD, sidebar tree, save/load | Day 3 |
| [Day4_Prompts_Environments_Auth.md](file:///c:/Users/bhang/OneDrive/Desktop/AI Projects/AI-API-Testing-Tool-Research/Day4_Prompts_Environments_Auth.md) | 6 prompts for: env CRUD, env frontend, variable resolver, auto-complete, auth panel | Day 4 |
| [Day5_Prompts_History_Import.md](file:///c:/Users/bhang/OneDrive/Desktop/AI Projects/AI-API-Testing-Tool-Research/Day5_Prompts_History_Import.md) | 6 prompts for: history backend, history UI, cURL parser, cURL export, Postman import | Day 5 |
| [Day6_Prompts_AI_Features.md](file:///c:/Users/bhang/OneDrive/Desktop/AI Projects/AI-API-Testing-Tool-Research/Day6_Prompts_AI_Features.md) | 7 prompts for: LLM gateway, AI chat, test gen, debug assistant, usage tracking | Day 6 |
| [Day7_Prompts_Polish_Deploy.md](file:///c:/Users/bhang/OneDrive/Desktop/AI Projects/AI-API-Testing-Tool-Research/Day7_Prompts_Polish_Deploy.md) | 5 prompts for: theme system, animations, error handling, keyboard shortcuts, deployment | Day 7 |

---

*Next: Create your Skills and Agent configuration files from `Skills_and_Agents_Configuration.md`, then start with Day 1-2 prompts.*
