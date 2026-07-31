"""
Characters router — CharacterForge CRUD + AI generation.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database.session import get_db
from app.models.character import Character
from app.services.ai_service import AIService

router = APIRouter()
ai = AIService()


class CharacterCreate(BaseModel):
    project_id: int
    name: str
    role: Optional[str] = "supporting"
    backstory: Optional[str] = ""
    personality: Optional[str] = ""
    appearance: Optional[str] = ""
    abilities: Optional[str] = ""
    arc: Optional[str] = ""


class CharacterGenerateRequest(BaseModel):
    project_id: int
    prompt: str
    role: Optional[str] = "protagonist"


@router.get("/{project_id}")
async def list_characters(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Character).where(Character.project_id == project_id)
    )
    return result.scalars().all()


@router.post("/", status_code=201)
async def create_character(payload: CharacterCreate, db: AsyncSession = Depends(get_db)):
    char = Character(**payload.model_dump())
    db.add(char)
    await db.commit()
    await db.refresh(char)
    return char


@router.put("/{character_id}")
async def update_character(character_id: int, payload: CharacterCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Character).where(Character.id == character_id))
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(char, k, v)
    await db.commit()
    await db.refresh(char)
    return char


@router.delete("/{character_id}", status_code=204)
async def delete_character(character_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Character).where(Character.id == character_id))
    char = result.scalar_one_or_none()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    await db.delete(char)
    await db.commit()


@router.post("/generate")
async def generate_character(payload: CharacterGenerateRequest):
    """Use AI to generate a full character profile from a short prompt."""
    character = await ai.generate_character(
        prompt=payload.prompt,
        role=payload.role,
        project_id=payload.project_id,
    )
    return character
