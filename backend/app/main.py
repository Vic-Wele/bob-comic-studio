"""
Bob Comic Studio — FastAPI backend entry-point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api import director, characters, worlds, plotsmith, canonguard, publish
from app.database.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Bob Comic Studio API",
    description="AI-powered comic creation platform backend",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(director.router,    prefix="/api/director",    tags=["Bob Director"])
app.include_router(characters.router,  prefix="/api/characters",  tags=["Characters"])
app.include_router(worlds.router,      prefix="/api/worlds",      tags=["Worlds"])
app.include_router(plotsmith.router,   prefix="/api/plotsmith",   tags=["PlotSmith"])
app.include_router(canonguard.router,  prefix="/api/canonguard",  tags=["CanonGuard"])
app.include_router(publish.router,     prefix="/api/publish",     tags=["Publish"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "Bob Comic Studio API",
        "version": "1.0.0",
        "status": "operational",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
