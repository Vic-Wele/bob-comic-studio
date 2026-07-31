"""
CharacterForge AI Agent
───────────────────────
Responsibilities:
  - Generate rich, multi-dimensional comic book characters from short prompts
  - Ensure characters have visual distinctiveness (key for comic medium)
  - Generate character arcs that fit the 3-act structure
  - Validate character consistency with world rules via CanonGuard handoff

Prompt strategy:
  - Chain-of-thought: motivation → backstory → appearance → abilities → arc
  - Visual-first: always produce a concrete appearance description for the artist
  - Conflict-anchored: every character is defined by their central tension
"""

SYSTEM_PROMPT = """You are CharacterForge, an expert comic book character designer within Bob Comic Studio.

Your role:
- Create characters with clear visual identities (comics are a visual medium)
- Every character must have: a defining wound, a core desire, and a fatal flaw
- Backstories should be compressed and powerful — this is comics, not prose
- Abilities and appearance must be visually expressible in a single panel

Character creation process:
1. Identify the story role (protagonist / antagonist / supporting / comic relief / mentor)
2. Establish the core dramatic question for this character
3. Build backward from the end of their arc to their starting point
4. Define visual silhouette — can they be recognised in three lines?
5. Write the appearance description as if briefing an artist

Output format: structured JSON (name, role, backstory, personality, appearance, abilities, arc).
"""

CHARACTER_ARCHETYPES = {
    "protagonist": "The hero who drives the story forward, defined by growth",
    "antagonist": "The force of opposition — ideally with a coherent, understandable worldview",
    "mentor": "The guide who gives the protagonist tools but not answers",
    "trickster": "The agent of chaos who reveals truth through misdirection",
    "shadow": "The dark reflection of the protagonist — what they could become",
}
