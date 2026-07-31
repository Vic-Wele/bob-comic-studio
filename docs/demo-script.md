# Bob Comic Studio — Demo Script
## IBM AI Builders Challenge — July 2025

**Target duration:** 3 minutes  
**Format:** Screen recording with voiceover  
**Demo story:** "The Shattered Grid" (pre-seeded in the database)

---

## Opening (0:00 – 0:20)

> _Show the BCS dashboard — dark theme, all 8 module cards visible._

**VO:**  
"Creating a comic book means being a writer, character designer, world-builder, and continuity editor — all at once. Bob Comic Studio changes that. It's an AI-powered creative workspace where every stage of making a comic has its own intelligent collaborator."

---

## Bob Director Chat (0:20 – 0:55)

> _Navigate to Bob Director. Type the prompt:_  
> `"I want to create a sci-fi thriller about a whistleblower in a post-EMP world where all data travels physically."`

**VO:**  
"We start with Bob Director — the AI creative lead. I describe my idea in plain language..."

> _Show the AI response appearing with reply, 3 suggestions, and an action chip: "Build Your World"._

**VO:**  
"...and Bob Director responds with story-level thinking: themes, stakes, and concrete next steps. It also recognises I need a world first, and offers to route me directly to WorldForge."

---

## WorldForge (0:55 – 1:20)

> _Click the WorldForge action or navigate to /worldforge._  
> _Show The Shattered Grid world card — Overview, Geography, Factions, Timeline tabs._

**VO:**  
"WorldForge takes my one-line concept and generates a full setting: the geography of surviving city-nodes, three competing factions with coherent ideologies, and — critically — the one rule that defines this world: no wireless beyond 500 metres. Everything travels by hand. That single constraint creates every conflict in the story."

---

## CharacterForge (1:20 – 1:45)

> _Navigate to /characterforge. Show Nova Reyes selected in the sidebar._  
> _Show the full profile: appearance, personality, abilities, arc._

**VO:**  
"CharacterForge generates visual-first character profiles — designed so an artist can draw the character from the description alone. Every character has a defining wound, a core desire, and a transformation arc. Nova starts as a rule-follower. She ends as someone who breaks rules to protect the truth."

> _Briefly show the second character — Director Voss — to demonstrate an antagonist with a coherent worldview._

---

## PlotSmith (1:45 – 2:10)

> _Navigate to /plotsmith. Show the 3-act sidebar and the panel-by-panel script._

**VO:**  
"PlotSmith takes the premise and produces a 3-act structure, then goes further — breaking it into a panel-by-panel script in industry-standard Marvel format. Each panel has action description, dialogue, and artist notes. The entire 24-panel first issue is scaffolded in seconds."

---

## CanonGuard (2:10 – 2:35)

> _Navigate to /canonguard. Click "Run Scan"._  
> _Show the scan animation, then 3 issues appearing: 1 critical, 1 warning, 1 info._

**VO:**  
"Before we publish, CanonGuard runs a full continuity scan. It found a critical issue — Nova's augmented eye changes colour between Act 1 and Act 3. It found a timeline inconsistency — two different years for the same event. It even caught a world-rule violation: a video call in a world where wireless doesn't work. Every issue comes with a specific fix suggestion."

> _Click "Resolve" on one issue to show the workflow._

---

## Publish Studio (2:35 – 2:50)

> _Navigate to /publish. Show the 4 export format cards._

**VO:**  
"With the story written and canon verified, Publish Studio packages the project for any format — print PDF, CBZ for digital comics platforms, EPUB for ebook readers, or a web-ready page. One click to export."

---

## Closing (2:50 – 3:00)

> _Return to Dashboard. All 8 modules visible._

**VO:**  
"Bob Comic Studio doesn't replace the creator. It removes every barrier between an idea and a finished comic. Built for the IBM AI Builders Challenge — Reimagine Creative Industries with AI."

> _Fade to the BCS logo._

---

## Pre-Demo Checklist

- [ ] `docker compose up -d` running — postgres, redis, backend, frontend all healthy
- [ ] Demo data seeded: `psql $DATABASE_URL -f database/seed/demo_data.sql`
- [ ] Frontend loads at `http://localhost:3000` in dark mode
- [ ] `WATSONX_API_KEY` set in `.env` — or confirm mock mode fallback is working
- [ ] Record at 1920×1080, no browser chrome visible (F11 fullscreen)
- [ ] Total recording ≤ 3 minutes (challenge requirement)
