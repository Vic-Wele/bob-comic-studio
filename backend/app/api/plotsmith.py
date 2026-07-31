"""
PlotSmith router — story structure generation and management.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database.session import get_db
from app.models.plot import Plot
from app.services.ai_service import AIService

router = APIRouter()
ai = AIService()


class PlotCreate(BaseModel):
    project_id: int
    premise: Optional[str] = ""
    act_one: Optional[str] = ""
    act_two: Optional[str] = ""
    act_three: Optional[str] = ""
    panels: Optional[str] = ""


class PlotGenerateRequest(BaseModel):
    project_id: int
    premise: str
    genre: Optional[str] = "action"
    num_panels: Optional[int] = 24


@router.get("/{project_id}")
async def get_plot(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Plot).where(Plot.project_id == project_id))
    return result.scalar_one_or_none()


@router.post("/", status_code=201)
async def create_plot(payload: PlotCreate, db: AsyncSession = Depends(get_db)):
    plot = Plot(**payload.model_dump())
    db.add(plot)
    await db.commit()
    await db.refresh(plot)
    return plot


@router.put("/{plot_id}")
async def update_plot(plot_id: int, payload: PlotCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Plot).where(Plot.id == plot_id))
    plot = result.scalar_one_or_none()
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(plot, k, v)
    await db.commit()
    await db.refresh(plot)
    return plot


@router.post("/generate")
async def generate_plot(payload: PlotGenerateRequest):
    """Generate a full 3-act plot structure + panel-by-panel script from a premise."""
    plot = await ai.generate_plot(
        premise=payload.premise,
        genre=payload.genre,
        num_panels=payload.num_panels,
        project_id=payload.project_id,
    )
    return plot
