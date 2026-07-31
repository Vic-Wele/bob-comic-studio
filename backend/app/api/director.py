"""
Bob Director router — AI creative director chat interface.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.ai_service import AIService

router = APIRouter()
ai = AIService()


class DirectorMessage(BaseModel):
    message: str
    project_id: Optional[int] = None
    context: Optional[dict] = None


class DirectorResponse(BaseModel):
    reply: str
    suggestions: list[str]
    action: Optional[str] = None   # e.g. "create_character", "generate_plot", etc.
    action_data: Optional[dict] = None


@router.post("/chat", response_model=DirectorResponse)
async def chat(payload: DirectorMessage):
    """
    Send a message to Bob Director and receive a creative AI response
    with optional structured actions (character creation, plot generation, etc.).
    """
    result = await ai.director_chat(
        message=payload.message,
        project_id=payload.project_id,
        context=payload.context or {},
    )
    return result


@router.get("/prompts")
async def get_story_prompts():
    """Return curated starter prompts for the Director chat."""
    return {
        "prompts": [
            "Create a cyberpunk detective story set in 2087 Neo-Tokyo",
            "Generate a hero who starts as a villain and slowly finds redemption",
            "Design a world where magic is treated like technology — governed and taxed",
            "Write a 3-act structure for a revenge story with a twist ending",
            "Give my story a ticking-clock conflict that escalates every issue",
            "Create an antagonist whose goals are understandable but methods are wrong",
        ]
    }
