# Bob Comic Studio — System Architecture

## Architecture Overview

Bob Comic Studio uses a three-tier architecture: a Next.js frontend, a FastAPI backend, and a set of AI agents powered by IBM Granite via watsonx.ai. PostgreSQL provides persistent storage; Redis provides fast cache for AI context injection.

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  Next.js 15 (React 19, TypeScript, Tailwind v4)                 │
│  8 Module Pages + Dashboard + Sidebar navigation               │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP / REST (fetch)
                               │ NEXT_PUBLIC_API_URL=:8000
┌──────────────────────────────▼──────────────────────────────────┐
│  FastAPI Backend  (Python 3.11, uvicorn)                        │
│                                                                 │
│  /api/director    — Bob Director chat + intent routing          │
│  /api/characters  — CharacterForge CRUD + AI generation         │
│  /api/worlds      — WorldForge CRUD + AI generation             │
│  /api/plotsmith   — PlotSmith generation + plot management      │
│  /api/canonguard  — CanonGuard scan + issue tracking            │
│  /api/publish     — Export preparation + format metadata        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ AIService (services/ai_service.py)                       │   │
│  │ Unified interface to watsonx.ai — all agents route here  │   │
│  │ Graceful mock fallback when credentials absent           │   │
│  └──────────────────────┬───────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ IBM watsonx.ai SDK
                          │ ibm/granite-3-3-8b-instruct
┌─────────────────────────▼───────────────────────────────────────┐
│  IBM watsonx.ai                                                 │
│  Model: ibm/granite-3-3-8b-instruct                             │
│  Region: us-south.ml.cloud.ibm.com                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PostgreSQL 15                                                  │
│  Tables: projects · characters · worlds · plots · issues        │
│          director_messages · schema_migrations                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Redis 7                                                        │
│  Keys: canoncore:{project_id}:* (AI context cache)             │
│  TTL: 1 hour per session                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## AI Agent Architecture

Each specialist agent (`ai/agents/`) defines:
- A `SYSTEM_PROMPT` — the agent's persona, responsibilities, and output contract
- Domain constants (archetypes, templates, issue categories)
- Structured prompt templates with deterministic JSON output contracts

All agents are orchestrated by `AIService` (`backend/app/services/ai_service.py`), which:
1. Selects the appropriate agent prompt
2. Calls watsonx.ai via the SDK
3. Parses the JSON response
4. Falls back to rich mock data on parse failure or missing credentials

```
Bob Director (orchestrator)
       │
       ├─→ CharacterForge Agent  →  /api/characters/generate
       ├─→ WorldForge Agent      →  /api/worlds/generate
       ├─→ PlotSmith Agent       →  /api/plotsmith/generate
       └─→ CanonGuard Agent      →  /api/canonguard/scan
                    ↕
              CanonCore Memory
              (PostgreSQL + Redis)
```

---

## Data Flow: Bob Director Chat

```
User types message
       │
       ▼
POST /api/director/chat
       │
       ▼
AIService.director_chat()
       │ (builds context from CanonCore)
       ▼
watsonx.ai Granite 3.3
       │ (structured JSON reply)
       ▼
Parse: reply + suggestions + action + action_data
       │
       ├─ action == "create_character" → CharacterForge agent
       ├─ action == "build_world"      → WorldForge agent
       ├─ action == "generate_plot"    → PlotSmith agent
       └─ action == "canon_scan"       → CanonGuard agent
       │
       ▼
Response to frontend DirectorResponse model
       │
       ▼
UI renders reply + suggestion chips + optional action panel
```

---

## Data Flow: CanonGuard Scan

```
User clicks "Run Scan"
       │
       ▼
POST /api/canonguard/scan  { project_id, scan_type }
       │
       ▼
Fetch full project context from PostgreSQL
  (characters + world + plot + existing issues)
       │
       ▼
AIService.scan_canon()
  → builds context string → sends to Granite → parses issues[]
       │
       ▼
Persist issues to issues table
       │
       ▼
Return { issues_found, issues[] } to frontend
       │
       ▼
CanonGuard UI renders severity-ranked issue list
```

---

## Technology Choices

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | Next.js 15 + React 19 | App Router, RSC, strong TypeScript support |
| Styling | Tailwind CSS v4 | CSS-native config, no build-time config file |
| Backend | FastAPI + Python 3.11 | Async, fast, excellent Pydantic integration |
| ORM | SQLAlchemy 2 async | Type-safe, supports async PostgreSQL |
| AI | IBM Granite 3.3-8b-instruct | IBM watsonx.ai, instruction-tuned, JSON-reliable |
| Database | PostgreSQL 15 | Relational + JSONB for structured + flexible data |
| Cache | Redis 7 | Context injection cache + session management |
| Container | Docker Compose | Reproducible local dev + one-command startup |

---

## Directory Structure

```
bob-comic-studio/
├── frontend/                 Next.js 15 application
│   └── src/app/              8 module pages + dashboard
│       └── components/       Sidebar, ThemeProvider
├── backend/                  FastAPI application
│   └── app/
│       ├── api/              6 route modules
│       ├── models/           5 SQLAlchemy models
│       ├── services/         AIService (watsonx.ai bridge)
│       └── database/         Async session + Base
├── ai/
│   ├── agents/               5 AI agent prompt files
│   └── memory/canoncore/     CanonCore memory schema
├── database/
│   ├── schemas/              001_initial.sql
│   ├── migrations/           Migration tracking
│   └── seed/                 Demo data (Shattered Grid)
├── docs/                     Architecture, spec, roadmap, demo
├── docker-compose.yml        Full stack in one command
└── .env.example              Environment variable template
```
