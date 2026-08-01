"""SQLAlchemy database setup — SQLite for MVP, easy to swap for PostgreSQL."""
from __future__ import annotations

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bookskill.db")

# connect_args only needed for SQLite (enables same-thread access from FastAPI workers)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency: yields a DB session and closes it when done."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables on startup."""
    import importlib
    importlib.import_module("saas.backend.models")  # registers ORM models
    Base.metadata.create_all(bind=engine)
