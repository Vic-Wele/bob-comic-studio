"""
CanonGuard router — continuity & consistency analysis.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database.session import get_db
from app.models.issue import Issue
from app.services.ai_service import AIService

router = APIRouter()
ai = AIService()


class ScanRequest(BaseModel):
    project_id: int
    content: Optional[str] = ""      # serialised project context to scan
    scan_type: Optional[str] = "full"  # full | characters | plot | world


class IssueResolve(BaseModel):
    resolved: bool = True


@router.post("/scan")
async def scan_project(payload: ScanRequest, db: AsyncSession = Depends(get_db)):
    """
    Run CanonGuard AI scan on a project, returning a list of detected issues.
    Issues are persisted to the database.
    """
    issues = await ai.scan_canon(
        project_id=payload.project_id,
        content=payload.content,
        scan_type=payload.scan_type,
    )
    # Persist issues
    db_issues = []
    for iss in issues:
        obj = Issue(project_id=payload.project_id, **iss)
        db.add(obj)
        db_issues.append(obj)
    await db.commit()
    return {"project_id": payload.project_id, "issues_found": len(db_issues), "issues": issues}


@router.patch("/issues/{issue_id}/resolve")
async def resolve_issue(issue_id: int, payload: IssueResolve, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        # Issue not in DB yet (frontend demo issue) — just acknowledge
        return {"id": issue_id, "resolved": payload.resolved}
    issue.resolved = payload.resolved
    await db.commit()
    return {"id": issue_id, "resolved": payload.resolved}


@router.get("/{project_id}/issues")
async def get_issues(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Issue).where(Issue.project_id == project_id))
    return result.scalars().all()
