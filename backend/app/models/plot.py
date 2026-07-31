"""
SQLAlchemy models — Plot (story structure).
"""
from datetime import datetime
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database.session import Base


class Plot(Base):
    __tablename__ = "plots"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    premise: Mapped[str] = mapped_column(Text, default="")
    act_one: Mapped[str] = mapped_column(Text, default="")         # JSON: list of beats
    act_two: Mapped[str] = mapped_column(Text, default="")
    act_three: Mapped[str] = mapped_column(Text, default="")
    panels: Mapped[str] = mapped_column(Text, default="")          # JSON: panel-by-panel script
    ai_generated: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
