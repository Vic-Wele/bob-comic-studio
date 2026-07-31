"""
Publish router — export metadata and format preparation.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class PublishRequest(BaseModel):
    project_id: int
    format: str      # pdf | cbz | epub | web
    title: Optional[str] = ""
    author: Optional[str] = ""
    description: Optional[str] = ""
    isbn: Optional[str] = ""
    cover_art: Optional[str] = ""


@router.post("/prepare")
async def prepare_export(payload: PublishRequest):
    """
    Validate and prepare a project for export in the requested format.
    In production this would trigger an async export job.
    """
    format_info = {
        "pdf": {"mime": "application/pdf", "ext": ".pdf", "label": "Print-Ready PDF"},
        "cbz": {"mime": "application/zip", "ext": ".cbz", "label": "Comic Book Archive"},
        "epub": {"mime": "application/epub+zip", "ext": ".epub", "label": "Digital eBook"},
        "web": {"mime": "text/html", "ext": ".html", "label": "Webcomic Page"},
    }
    fmt = format_info.get(payload.format)
    if not fmt:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Unknown format: {payload.format}")

    return {
        "project_id": payload.project_id,
        "format": payload.format,
        "label": fmt["label"],
        "status": "queued",
        "estimated_seconds": 15,
        "metadata": {
            "title": payload.title,
            "author": payload.author,
            "description": payload.description,
        },
    }


@router.get("/formats")
async def list_formats():
    return {
        "formats": [
            {"id": "pdf",  "label": "Print-Ready PDF",     "description": "High-res PDF for print-on-demand"},
            {"id": "cbz",  "label": "Comic Book Archive",  "description": "CBZ for Kindle, Comixology, etc."},
            {"id": "epub", "label": "Digital eBook",       "description": "EPUB 3 for iBooks and Kobo"},
            {"id": "web",  "label": "Webcomic Page",       "description": "Responsive HTML for web publishing"},
        ]
    }
