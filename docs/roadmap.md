# Bob Comic Studio — Roadmap

## Phase 0 — Foundation ✅ (Complete)
_Goal: Working prototype with all 8 modules, production build passing_

- [x] Next.js 15 project scaffolded with TypeScript + Tailwind v4
- [x] Global CSS design system with dark/light theme support
- [x] 8 module pages: Director, CanonCore, Creator, CharacterForge, WorldForge, PlotSmith, CanonGuard, Publish
- [x] Dashboard with module cards and live stats strip
- [x] Sidebar navigation with active route highlighting + theme toggle
- [x] Production build passing (12/12 static pages, zero TypeScript errors)

---

## Phase 1 — Backend & AI Integration ✅ (Complete)
_Goal: Real API layer with AI generation and database persistence_

- [x] FastAPI backend with 6 routers (director, characters, worlds, plotsmith, canonguard, publish)
- [x] SQLAlchemy async models: projects, characters, worlds, plots, issues, director_messages
- [x] AIService — unified IBM Granite (watsonx.ai) interface with mock fallback
- [x] AI agent prompt files for all 5 specialist agents
- [x] CanonCore memory schema
- [x] PostgreSQL schema (001_initial.sql) + demo seed data
- [x] Docker Compose: postgres + redis + backend + frontend
- [x] requirements.txt + .env.example + Dockerfiles
- [x] Full documentation: architecture, product spec, demo script, roadmap
- [x] README updated for IBM AI Builders Challenge submission

---

## Phase 2 — Frontend ↔ Backend Wiring 🔄 (Next)
_Goal: All 8 frontend modules making real API calls_

- [ ] Bob Director: POST /api/director/chat with real AI response rendering
- [ ] CharacterForge: GET/POST/PUT /api/characters with live character list
- [ ] WorldForge: GET/POST /api/worlds with live world data
- [ ] PlotSmith: POST /api/plotsmith/generate with live panel script rendering
- [ ] CanonGuard: POST /api/canonguard/scan → live issue list + resolve action
- [ ] Publish Studio: POST /api/publish/prepare with real format selection
- [ ] Loading states + error boundaries on all API-connected components
- [ ] Frontend `.env.local` with `NEXT_PUBLIC_API_URL`

---

## Phase 3 — watsonx.ai Integration 🔄 (Next)
_Goal: Real IBM Granite responses replacing all mocks_

- [ ] Provision watsonx.ai project + API key on IBM Cloud
- [ ] Test all 5 agent prompts against Granite 3.3-8b-instruct
- [ ] Tune temperature/top_p per agent (Director: 0.8, CanonGuard: 0.3)
- [ ] Add streaming support to Director chat (Server-Sent Events)
- [ ] Response caching: cache identical prompts for 5 minutes in Redis
- [ ] Context injection: pull CanonCore data into all agent prompts

---

## Phase 4 — Creator Mode Canvas 📋 (Planned)
_Goal: Interactive panel layout editor_

- [ ] Drag-and-drop panel grid with configurable layouts
- [ ] Panel-to-script linking (click panel → show PlotSmith script for that panel)
- [ ] Panel metadata editor: character, location, mood, time-of-day
- [ ] Export canvas layout as SVG template for the artist
- [ ] Thumbnail generation (AI-described → placeholder art)

---

## Phase 5 — CanonCore Knowledge Graph 📋 (Planned)
_Goal: Full semantic memory layer_

- [ ] Embed all entity text with an embedding model
- [ ] Vector similarity search via pgvector extension
- [ ] "Remember this" button on Director chat messages
- [ ] Automatic entity extraction from new content → auto-populate CanonCore
- [ ] Canon rules enforcement: flag rule violations before save

---

## Phase 6 — Multi-Project + Auth 📋 (Planned)
_Goal: Production-ready for real users_

- [ ] JWT authentication (login, register, refresh)
- [ ] Per-user project isolation
- [ ] Team collaboration (shared project access)
- [ ] Project export history + version snapshots

---

## IBM AI Builders Challenge — Submission Targets

| Requirement | Status |
|-------------|--------|
| Working prototype using IBM Bob | ✅ Complete |
| GitHub repository with README | ✅ Complete |
| Problem statement | ✅ README |
| Solution description | ✅ README |
| AI approach and architecture | ✅ docs/architecture.md |
| Selected challenge theme | ✅ July — Reimagine Creative Industries |
| How IBM Bob was used | ✅ README |
| Demo video script | ✅ docs/demo-script.md |
| SkillsBuild learning activity | 📋 Complete on skillsbuild.org |
| Video (max 3 min) | 📋 Record per demo-script.md |
| Project page submitted | 📋 Submit by July 31, 11:59pm ET |
