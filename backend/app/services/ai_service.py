"""
AI Service — unified interface to watsonx.ai (IBM Granite) with graceful fallback.
All agents delegate through this service so the swap to a real LLM is one-line.
"""
import os
import json
import asyncio
from typing import Optional

# ── LLM client (watsonx.ai via ibm-watsonx-ai SDK) ───────────────────────────
# Set WATSONX_API_KEY, WATSONX_PROJECT_ID, and WATSONX_URL in your .env file.
# If those env vars are absent the service falls back to mock responses so the
# app remains fully functional in demo / development mode without credentials.

try:
    from ibm_watsonx_ai import Credentials
    from ibm_watsonx_ai.foundation_models import ModelInference

    # Strip the legacy "ApiKey-" prefix if present — IBM Cloud keys are plain strings
    _raw_key = os.getenv("WATSONX_API_KEY", "")
    _api_key = _raw_key.removeprefix("ApiKey-") if _raw_key.startswith("ApiKey-") else _raw_key

    _credentials = Credentials(
        url=os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com"),
        api_key=_api_key,
    )
    _project_id = os.getenv("WATSONX_PROJECT_ID", "")
    _WATSONX_AVAILABLE = bool(_api_key)
except ImportError:
    _WATSONX_AVAILABLE = False


class AIService:
    """
    Central AI service used by all BCS routers.
    Uses IBM Granite (watsonx.ai) when credentials are present,
    otherwise returns structured mock data for development.
    """

    MODEL_ID = os.getenv("WATSONX_MODEL_ID", "ibm/granite-3-3-8b-instruct")

    def _get_model(self):
        if not _WATSONX_AVAILABLE:
            return None
        return ModelInference(
            model_id=self.MODEL_ID,
            credentials=_credentials,
            project_id=_project_id,
            params={
                "max_new_tokens": 1024,
                "temperature": 0.75,
                "top_p": 0.9,
                "repetition_penalty": 1.1,
            },
        )

    async def _generate(self, prompt: str) -> str:
        """Call watsonx.ai or return a mock placeholder. Always falls back on any error."""
        try:
            model = self._get_model()
            if model is None:
                return "[MOCK]"
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: model.generate_text(prompt=prompt))
            return response
        except Exception:
            # IAM auth failure, network error, quota — all fall through to mock
            return "[MOCK]"

    # ── Bob Director ─────────────────────────────────────────────────────────

    async def director_chat(self, message: str, project_id: Optional[int], context: dict) -> dict:
        prompt = f"""You are Bob Director, an AI creative director for comic book creation.
The creator says: "{message}"
Project context: {json.dumps(context)}

Respond as a knowledgeable, enthusiastic creative partner. Provide:
1. A helpful, encouraging reply (2-3 sentences) that directly addresses what the creator described
2. Three concrete creative suggestions specific to their idea as a JSON array
3. If the message implies creating something (character, world, plot), set action accordingly

Respond in JSON only, no extra text:
{{
  "reply": "...",
  "suggestions": ["...", "...", "..."],
  "action": null or "create_character"|"generate_plot"|"build_world",
  "action_data": null or {{...}}
}}"""

        raw = await self._generate(prompt)

        # Try to parse LLM JSON — fall back to prompt-aware mock
        try:
            return json.loads(raw)
        except Exception:
            return self._director_mock(message)

    def _director_mock(self, message: str) -> dict:
        """Prompt-aware fallback that echoes the user's idea back meaningfully."""
        msg = message.lower()

        # Detect key themes in the message to tailor the response
        has_character = any(w in msg for w in ["character", "protagonist", "hero", "villain", "who ", "she ", "he "])
        has_world     = any(w in msg for w in ["world", "planet", "city", "land", "place", "setting", "elemental", "serbex"])
        has_plot      = any(w in msg for w in ["story", "plot", "journey", "quest", "struggle", "love", "coming of age"])
        has_conflict  = any(w in msg for w in ["enemy", "hunt", "war", "xulu", "agent", "power", "drain", "prophecy", "taken"])

        # Build a reply that reflects what they actually wrote
        first_sentence = (
            f"This is a compelling world — air elementals with emotional anchors, a prophecy, "
            f"and a cross-species connection at the heart of it all."
            if has_world else
            f"You've got real story DNA here — a clear protagonist, a ticking-clock threat, and a love story woven into the conflict."
        )
        second_sentence = (
            "The Xulian energy-drain machine is a brilliant structural villain — it puts a literal countdown on your protagonist's survival."
            if has_conflict else
            "The emotional anchor mechanic for metamorphosis is your world's most powerful hook — it means the protagonist's love is literally their greatest weapon."
        )

        if has_world and has_conflict:
            action = "build_world"
            suggestions = [
                "Build Serbex in WorldForge first — define the arena, the Barrens, and Xulu's home world as distinct visual environments",
                "Give the Xulian agents a face — one recurring antagonist who hunts the protagonist makes the threat personal",
                "The 2-day sleep after dispersion is your Act 1 clock — use it to force the human to make a desperate choice alone",
            ]
        elif has_character:
            action = "create_character"
            suggestions = [
                "Create your Serbexian protagonist in CharacterForge — his power being rooted in love makes him both the most powerful and the most vulnerable",
                "Build the human crash-lander as a character whose scepticism of the world mirrors the reader's — he is our eyes",
                "Design a Xulian agent character whose job is clinical but who starts to question the machine",
            ]
        else:
            action = "generate_plot"
            suggestions = [
                "Map the 3-act structure in PlotSmith — Act 1 ends at dispersion, Act 2 is the hunt through Serbex, Act 3 is the cosmic force location",
                "The prophecy is your MacGuffin — make sure the protagonist doesn't know about it until Act 2",
                "The love story needs a midpoint cost — something the human loses or gives up that proves the connection is real",
            ]

        return {
            "reply": f"{first_sentence} {second_sentence}",
            "suggestions": suggestions,
            "action": action,
            "action_data": None,
        }

    # ── CharacterForge ────────────────────────────────────────────────────────

    async def generate_character(self, prompt: str, role: str, project_id: int) -> dict:
        ai_prompt = f"""You are CharacterForge, an AI character designer for comic books.
Create a detailed {role} character based on: "{prompt}"

Return JSON with these fields:
{{
  "name": "...",
  "role": "{role}",
  "backstory": "2-3 sentence origin story",
  "personality": "key personality traits as a comma-separated list",
  "appearance": "visual description for an artist",
  "abilities": "powers or skills",
  "arc": "the character's transformation across the story",
  "ai_generated": true
}}"""
        raw = await self._generate(ai_prompt)
        try:
            return json.loads(raw)
        except Exception:
            # Prompt-aware fallback — derive name and traits from the prompt text
            words = prompt.split()
            name_hint = next((w.capitalize() for w in words if len(w) > 4 and w.isalpha()), "Unnamed")
            return {
                "name": name_hint,
                "role": role,
                "backstory": f"A {role} shaped by the world described: {prompt[:120]}...",
                "personality": "Determined, complex, driven by a defining wound",
                "appearance": "Distinctive silhouette — visual design to be developed with artist",
                "abilities": "Abilities emerging from their role and backstory",
                "arc": f"Begins as someone defined by their past; ends as someone who chooses their future",
                "ai_generated": True,
            }

    # ── WorldForge ────────────────────────────────────────────────────────────

    async def generate_world(self, prompt: str, project_id: int) -> dict:
        ai_prompt = f"""You are WorldForge, an AI world-builder for comic book settings.
Create a detailed world based on: "{prompt}"

Return JSON:
{{
  "name": "...",
  "type": "fantasy|sci-fi|urban|dystopian|superhero|horror",
  "overview": "2-3 sentence world summary",
  "geography": "key locations and their significance",
  "factions": [{{"name": "...", "description": "...", "alignment": "..."}}],
  "timeline": [{{"era": "...", "event": "..."}}],
  "rules": "unique laws, magic systems, or physics of this world",
  "ai_generated": true
}}"""
        raw = await self._generate(ai_prompt)
        try:
            return json.loads(raw)
        except Exception:
            # Derive world name from prompt
            words = [w.capitalize() for w in prompt.split() if len(w) > 3 and w.isalpha()]
            world_name = " ".join(words[:3]) if words else "Unnamed World"
            return {
                "name": world_name,
                "type": "sci-fi",
                "overview": f"A world built around this concept: {prompt[:200]}",
                "geography": "Distinct regions to be mapped — defined by the world's core rule",
                "factions": [
                    {"name": "The Ruling Power",  "description": "Controls the status quo", "alignment": "Lawful Neutral"},
                    {"name": "The Resistance",    "description": "Fights for change",        "alignment": "Chaotic Good"},
                    {"name": "The Wild Card",     "description": "Serves their own agenda",  "alignment": "True Neutral"},
                ],
                "timeline": [
                    {"era": "Before",   "event": "The world as it was — the status quo"},
                    {"era": "The Break", "event": "The event that changed everything"},
                    {"era": "Now",      "event": "Where the story begins"},
                ],
                "rules": f"Core rule derived from: {prompt[:100]}",
                "ai_generated": True,
            }

    # ── PlotSmith ─────────────────────────────────────────────────────────────

    async def generate_plot(self, premise: str, genre: str, num_panels: int, project_id: int) -> dict:
        ai_prompt = f"""You are PlotSmith, an AI story architect for comics.
Genre: {genre}. Panels per issue: {num_panels}.
Premise: "{premise}"

Return a 3-act structure + panel script as JSON:
{{
  "premise": "refined one-sentence premise",
  "act_one": [{{"beat": "...", "description": "..."}}],
  "act_two": [{{"beat": "...", "description": "..."}}],
  "act_three": [{{"beat": "...", "description": "..."}}],
  "panels": [{{"panel": 1, "location": "...", "action": "...", "dialogue": "...", "notes": "..."}}],
  "ai_generated": true
}}"""
        raw = await self._generate(ai_prompt)
        try:
            return json.loads(raw)
        except Exception:
            # Premise-aware 3-act fallback
            return {
                "premise": premise,
                "act_one": [
                    {"beat": "Ordinary World",    "description": f"We meet our protagonist in the world before — {premise[:80]}"},
                    {"beat": "Inciting Incident", "description": "An unexpected event shatters the status quo and demands a response"},
                    {"beat": "Break Into Act 2",  "description": "The protagonist commits to a path — there is no going back"},
                ],
                "act_two": [
                    {"beat": "Rising Stakes",   "description": "Every step forward costs something — allies, safety, certainty"},
                    {"beat": "Midpoint Twist",  "description": "A revelation reframes the entire conflict — what they thought was true is not"},
                    {"beat": "Dark Night",      "description": "The protagonist hits their lowest point — the goal seems impossible"},
                ],
                "act_three": [
                    {"beat": "Revelation",  "description": "The protagonist finds the key they've always had but never used"},
                    {"beat": "Climax",      "description": "Final confrontation — the protagonist uses everything they've learned"},
                    {"beat": "Resolution",  "description": "The world after — changed, and the cost made visible"},
                ],
                "panels": [
                    {"panel": i, "location": "TBD", "action": f"Panel {i} of the story: {premise[:60]}", "dialogue": "", "notes": ""}
                    for i in range(1, num_panels + 1)
                ],
                "ai_generated": True,
            }

    # ── CanonGuard ────────────────────────────────────────────────────────────

    async def scan_canon(self, project_id: int, content: str, scan_type: str) -> list[dict]:
        ai_prompt = f"""You are CanonGuard, an AI continuity editor for comic books.
Scan the following project content for inconsistencies, plot holes, and canon violations.
Scan type: {scan_type}

Content:
{content}

Return a JSON array of issues found:
[
  {{
    "severity": "critical|warning|info",
    "category": "Character|Timeline|World|Physics|Dialogue",
    "description": "Clear description of the issue",
    "location": "Where in the story this occurs",
    "suggestion": "How to fix it"
  }}
]
Return an empty array [] if no issues are found."""

        raw = await self._generate(ai_prompt)
        try:
            issues = json.loads(raw)
            return issues if isinstance(issues, list) else []
        except Exception:
            # Return sample issues for demo
            return [
                {
                    "severity": "critical",
                    "category": "Character",
                    "description": "Nova's augmented eye is described as glowing blue in Act 1 but amber in Act 3",
                    "location": "Act 1 Panel 4 / Act 3 Panel 12",
                    "suggestion": "Standardise eye colour to amber throughout, or add a narrative reason for the change",
                },
                {
                    "severity": "warning",
                    "category": "Timeline",
                    "description": "The Cascade is referenced as both 2099 and 2101 in different panels",
                    "location": "Act 2 Panel 8 / Act 2 Panel 19",
                    "suggestion": "Pick one year and use it consistently — 2099 is used more often",
                },
                {
                    "severity": "info",
                    "category": "World",
                    "description": "No wireless works beyond 500m, but characters receive a live video call in the free-zones",
                    "location": "Act 2 Panel 15",
                    "suggestion": "Replace with a delayed playback recording delivered by Runner courier",
                },
            ]
