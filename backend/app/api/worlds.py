"""
Worlds router — WorldForge CRUD + AI generation.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database.session import get_db
from app.models.world import World
from app.services.ai_service import AIService

router = APIRouter()
ai = AIService()


class WorldCreate(BaseModel):
    project_id: int
    name: str
    type: Optional[str] = ""
    overview: Optional[str] = ""
    geography: Optional[str] = ""
    factions: Optional[str] = ""
    timeline: Optional[str] = ""
    rules: Optional[str] = ""


class WorldGenerateRequest(BaseModel):
    project_id: int
    prompt: str


@router.get("/{project_id}")
async def list_worlds(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(World).where(World.project_id == project_id))
    return result.scalars().all()


@router.post("/", status_code=201)
async def create_world(payload: WorldCreate, db: AsyncSession = Depends(get_db)):
    world = World(**payload.model_dump())
    db.add(world)
    await db.commit()
    await db.refresh(world)
    return world


@router.put("/{world_id}")
async def update_world(world_id: int, payload: WorldCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(World).where(World.id == world_id))
    world = result.scalar_one_or_none()
    if not world:
        raise HTTPException(status_code=404, detail="World not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(world, k, v)
    await db.commit()
    await db.refresh(world)
    return world


@router.post("/generate")
async def generate_world(payload: WorldGenerateRequest):
    """Use AI to generate a full world profile from a short prompt."""
    world = await ai.generate_world(prompt=payload.prompt, project_id=payload.project_id)
    return world
