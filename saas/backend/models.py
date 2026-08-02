"""SQLAlchemy ORM models and Pydantic response schemas."""
from __future__ import annotations

import datetime
from typing import Literal, Optional

from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pydantic import BaseModel, EmailStr, field_validator

from saas.backend.database import Base

# ── Tier definitions ──────────────────────────────────────────────────────────

TIERS: dict[str, dict] = {
    "free":    {"books": 2,   "questions_per_month": 50,  "price_usd": 0},
    "student": {"books": 10,  "questions_per_month": 500, "price_usd": 5},
    "pro":     {"books": 50,  "questions_per_month": -1,  "price_usd": 15},  # -1 = unlimited
    "team":    {"books": 200, "questions_per_month": -1,  "price_usd": 49},
}

TierName = Literal["free", "student", "pro", "team"]

# ── ORM models ────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    tier: Mapped[str] = mapped_column(String(32), default="free", nullable=False)
    questions_this_month: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    questions_reset_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow, nullable=False
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    books: Mapped[list["Book"]] = relationship("Book", back_populates="user", cascade="all, delete-orphan")


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(128), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=True)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    file_format: Mapped[str] = mapped_column(String(32), nullable=True)
    file_size_mb: Mapped[float] = mapped_column(Float, nullable=True)
    extraction_mode: Mapped[str] = mapped_column(String(32), default="text", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="processing", nullable=False)
    # "processing" | "ready" | "failed"
    error_message: Mapped[str] = mapped_column(String(2048), nullable=True)
    pages: Mapped[int] = mapped_column(Integer, nullable=True)
    words: Mapped[int] = mapped_column(Integer, nullable=True)
    estimated_tokens: Mapped[int] = mapped_column(Integer, nullable=True)
    chapters_detected: Mapped[int] = mapped_column(Integer, nullable=True)
    job_id: Mapped[str] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="books")

# ── Pydantic schemas ──────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: str
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: str
    tier: TierName
    questions_this_month: int
    questions_reset_at: datetime.datetime
    created_at: datetime.datetime
    books_count: int = 0

    model_config = {"from_attributes": True}


class BookOut(BaseModel):
    id: int
    slug: str
    title: Optional[str]
    original_filename: str
    file_format: Optional[str]
    file_size_mb: Optional[float]
    extraction_mode: str
    status: str
    error_message: Optional[str]
    pages: Optional[int]
    words: Optional[int]
    estimated_tokens: Optional[int]
    chapters_detected: Optional[int]
    job_id: Optional[str]
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class AskRequest(BaseModel):
    book_id: int
    question: str

    @field_validator("question")
    @classmethod
    def question_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Question cannot be empty")
        if len(v) > 2000:
            raise ValueError("Question too long (max 2000 chars)")
        return v


class AskResponse(BaseModel):
    answer: str
    book_title: Optional[str]
    sources_used: list[str] = []


class StatusResponse(BaseModel):
    job_id: str
    status: str
    book_id: Optional[int] = None
    error: Optional[str] = None


class UsageInfo(BaseModel):
    tier: str
    books_used: int
    books_limit: int
    questions_this_month: int
    questions_limit: int  # -1 means unlimited
