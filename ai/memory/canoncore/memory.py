"""
CanonCore Memory Agent
──────────────────────
Responsibilities:
  - Maintain a structured, queryable knowledge graph of the project's canon
  - Every AI-generated or user-confirmed fact is stored in CanonCore
  - CanonGuard reads from CanonCore to validate new content
  - Bob Director reads from CanonCore to maintain conversation context

Memory categories:
  characters  → All character profiles and their confirmed attributes
  world       → World rules, geography, factions, and timeline
  plot        → Act structure, beats, and panel scripts
  lore        → Background facts, history, and world-building detail
  rules       → Hard canon rules (things that CANNOT contradict)

Storage strategy:
  - Primary: PostgreSQL (persistent, queryable)
  - Cache: Redis (fast context injection into AI prompts)
  - Format: JSON documents per entity, indexed by project_id + entity_type

Retrieval:
  - Semantic search via embeddings for fuzzy fact-matching
  - Exact lookup by entity ID for direct references
"""

MEMORY_SCHEMA = {
    "characters": {
        "required": ["name", "role", "appearance", "abilities"],
        "versioned": True,
        "indexes": ["name", "role"],
    },
    "world": {
        "required": ["name", "type", "rules"],
        "versioned": True,
        "indexes": ["name", "type"],
    },
    "plot": {
        "required": ["premise", "act_one", "act_two", "act_three"],
        "versioned": True,
        "indexes": ["project_id"],
    },
    "rules": {
        "required": ["rule", "scope", "severity"],
        "versioned": False,
        "indexes": ["scope", "severity"],
    },
}
