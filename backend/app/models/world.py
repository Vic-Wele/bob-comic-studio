"""
SQLAlchemy models — World / Setting.
"""
from datetime import datetime
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database.session import Base


class World(Base):
    __tablename__ = "worlds"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(100), default="")     # fantasy | sci-fi | urban | dystopian | etc.
    overview: Mapped[str] = mapped_column(Text, default="")
    geography: Mapped[str] = mapped_column(Text, default="")
    factions: Mapped[str] = mapped_column(Text, default="")        # JSON string
    timeline: Mapped[str] = mapped_column(Text, default="")        # JSON string
    rules: Mapped[str] = mapped_column(Text, default="")           # canon rules (JSON)
    ai_generated: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
