"""
FastAPI application — BookSkill backend.

Endpoints:
  POST   /auth/register     Create account
  POST   /auth/login        Obtain JWT token
  GET    /me                Current user info + usage
  POST   /upload            Upload & extract a book (async)
  GET    /books             List user's books
  GET    /books/{id}        Book details
  DELETE /books/{id}        Delete a book
  GET    /status/{job_id}   Extraction job status
  POST   /ask               Ask a question about a book
"""
from __future__ import annotations

import datetime
import os
import re
import uuid
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv()  # must happen before other imports read os.getenv

from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from saas.backend.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from saas.backend.database import get_db, init_db
from saas.backend.extraction import (
    SKILLS_ROOT,
    _safe_slug,
    delete_skill_files,
    load_skill_text,
    run_extraction,
    skill_dir,
)
from saas.backend.models import (
    AskRequest,
    AskResponse,
    Book,
    BookOut,
    StatusResponse,
    TIERS,
    TokenResponse,
    User,
    UserLogin,
    UserOut,
    UserRegister,
    UsageInfo,
)
from saas.backend.qa import answer_question

# ── App setup ─────────────────────────────────────────────────────────────────

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(50 * 1024 * 1024)))  # 50 MB

ALLOWED_EXTENSIONS = {
    ".pdf", ".epub", ".docx", ".rtf",
    ".txt", ".text", ".md", ".markdown", ".rst", ".adoc",
    ".html", ".htm", ".mobi", ".azw", ".azw3",
}

CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")]

app = FastAPI(
    title="BookSkill API",
    description="Upload books and chat with them using AI.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job status store — maps job_id → {status, book_id, error}
_job_store: dict[str, dict] = {}


@app.on_event("startup")
def on_startup() -> None:
    SKILLS_ROOT.mkdir(parents=True, exist_ok=True)
    init_db()


# ── Auth endpoints ────────────────────────────────────────────────────────────

@app.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        questions_reset_at=datetime.datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id, user.email))


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return TokenResponse(access_token=create_access_token(user.id, user.email))


# ── User / usage ──────────────────────────────────────────────────────────────

@app.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    books_count = db.query(Book).filter(Book.user_id == current_user.id).count()
    out = UserOut.model_validate(current_user)
    out.books_count = books_count
    return out


@app.get("/usage", response_model=UsageInfo)
def usage(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _reset_monthly_questions_if_needed(current_user, db)
    tier = TIERS[current_user.tier]
    books_used = db.query(Book).filter(Book.user_id == current_user.id).count()
    return UsageInfo(
        tier=current_user.tier,
        books_used=books_used,
        books_limit=tier["books"],
        questions_this_month=current_user.questions_this_month,
        questions_limit=tier["questions_per_month"],
    )


# ── Upload ────────────────────────────────────────────────────────────────────

@app.post("/upload", response_model=BookOut, status_code=status.HTTP_202_ACCEPTED)
async def upload_book(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    extraction_mode: str = Form("text"),
    slug: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ── Tier limit check ──────────────────────────────────────────────────────
    tier_cfg = TIERS[current_user.tier]
    book_count = db.query(Book).filter(Book.user_id == current_user.id).count()
    if book_count >= tier_cfg["books"]:
        raise HTTPException(
            status_code=403,
            detail=f"Book limit reached for your tier ({tier_cfg['books']} books). Upgrade to upload more.",
        )

    # ── File validation ───────────────────────────────────────────────────────
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Read content to validate size (do not trust Content-Length header)
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(content) / 1024 / 1024:.1f} MB). Limit is {MAX_UPLOAD_BYTES // 1024 // 1024} MB.",
        )

    extraction_mode = extraction_mode if extraction_mode in ("technical", "text") else "text"

    # ── Derive unique slug ────────────────────────────────────────────────────
    base_slug = _safe_slug(file.filename, slug)
    final_slug = _unique_slug(base_slug, current_user.id, db)

    # ── Save uploaded file to a temp path inside the skill dir ───────────────
    out_dir = skill_dir(current_user.id, final_slug)
    upload_path = out_dir / f"_upload{ext}"
    upload_path.write_bytes(content)

    # ── Create DB record ──────────────────────────────────────────────────────
    job_id = str(uuid.uuid4())
    book = Book(
        user_id=current_user.id,
        slug=final_slug,
        original_filename=file.filename,
        extraction_mode=extraction_mode,
        status="processing",
        job_id=job_id,
    )
    db.add(book)
    db.commit()
    db.refresh(book)

    _job_store[job_id] = {"status": "processing", "book_id": book.id}

    # ── Schedule background extraction ───────────────────────────────────────
    background_tasks.add_task(
        run_extraction,
        book_id=book.id,
        user_id=current_user.id,
        slug=final_slug,
        input_path=upload_path,
        extraction_mode=extraction_mode,
        db_update_callback=_make_db_update_callback(book.id, job_id),
    )

    return BookOut.model_validate(book)


def _unique_slug(base: str, user_id: int, db: Session) -> str:
    """Append a counter suffix until the slug is unique for this user."""
    slug = base
    counter = 1
    while db.query(Book).filter(Book.user_id == user_id, Book.slug == slug).first():
        slug = f"{base}-{counter}"
        counter += 1
    return slug


def _make_db_update_callback(book_id: int, job_id: str):
    """Return a callback that updates the Book row and job store in a fresh DB session."""
    def callback(bid: int, **kwargs):
        from saas.backend.database import SessionLocal
        db = SessionLocal()
        try:
            book = db.get(Book, bid)
            if book:
                for k, v in kwargs.items():
                    setattr(book, k, v)
                db.commit()
        finally:
            db.close()

        new_status = kwargs.get("status", "processing")
        _job_store[job_id] = {
            "status": new_status,
            "book_id": book_id,
            "error": kwargs.get("error_message"),
        }
    return callback


# ── Books ─────────────────────────────────────────────────────────────────────

@app.get("/books", response_model=list[BookOut])
def list_books(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    books = (
        db.query(Book)
        .filter(Book.user_id == current_user.id)
        .order_by(Book.created_at.desc())
        .all()
    )
    return [BookOut.model_validate(b) for b in books]


@app.get("/books/{book_id}", response_model=BookOut)
def get_book(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    book = _get_user_book(book_id, current_user.id, db)
    return BookOut.model_validate(book)


@app.delete("/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    book = _get_user_book(book_id, current_user.id, db)
    delete_skill_files(current_user.id, book.slug)
    db.delete(book)
    db.commit()


# ── Job status ────────────────────────────────────────────────────────────────

@app.get("/status/{job_id}", response_model=StatusResponse)
def job_status(job_id: str, current_user: User = Depends(get_current_user)):
    info = _job_store.get(job_id)
    if not info:
        raise HTTPException(status_code=404, detail="Job not found")
    return StatusResponse(
        job_id=job_id,
        status=info["status"],
        book_id=info.get("book_id"),
        error=info.get("error"),
    )


# ── Q&A ───────────────────────────────────────────────────────────────────────

@app.post("/ask", response_model=AskResponse)
def ask(
    payload: AskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ── Monthly question limit ─────────────────────────────────────────────
    _reset_monthly_questions_if_needed(current_user, db)
    tier_cfg = TIERS[current_user.tier]
    limit = tier_cfg["questions_per_month"]
    if limit != -1 and current_user.questions_this_month >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Monthly question limit ({limit}) reached. Upgrade to ask more.",
        )

    book = _get_user_book(payload.book_id, current_user.id, db)

    if book.status != "ready":
        raise HTTPException(
            status_code=409,
            detail=f"Book is not ready yet (status: {book.status}). Please wait for extraction to finish.",
        )

    text, sources = load_skill_text(current_user.id, book.slug)
    if not text:
        raise HTTPException(
            status_code=404,
            detail="Book content not found on disk. It may still be processing.",
        )

    try:
        answer = answer_question(payload.question, text, book_title=book.title)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    # ── Increment usage counter ────────────────────────────────────────────
    current_user.questions_this_month += 1
    db.commit()

    return AskResponse(answer=answer, book_title=book.title, sources_used=sources)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_user_book(book_id: int, user_id: int, db: Session) -> Book:
    book = db.get(Book, book_id)
    if not book or book.user_id != user_id:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


def _reset_monthly_questions_if_needed(user: User, db: Session) -> None:
    now = datetime.datetime.utcnow()
    reset_at = user.questions_reset_at
    if not reset_at or (now.year, now.month) != (reset_at.year, reset_at.month):
        user.questions_this_month = 0
        user.questions_reset_at = now
        db.commit()
