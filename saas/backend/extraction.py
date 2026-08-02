"""
Text extraction using book-to-skill's existing parsers.

Runs in a background thread via FastAPI's BackgroundTasks. Stores output at:
  <SKILLS_ROOT>/<user_id>/<book_slug>/
    full_text.txt
    metadata.json
"""
from __future__ import annotations

import json
import os
import re
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Optional

# ── Configuration ─────────────────────────────────────────────────────────────

SKILLS_ROOT = Path(os.getenv("SKILLS_ROOT", str(Path.home() / ".bookskill" / "skills")))


def skill_dir(user_id: int, slug: str) -> Path:
    """Return the local path for a user's skill, creating it if needed."""
    d = SKILLS_ROOT / str(user_id) / slug
    d.mkdir(parents=True, exist_ok=True)
    return d


def _safe_slug(filename: str, custom_slug: Optional[str] = None) -> str:
    """Derive a filesystem-safe slug from a filename or use the custom one."""
    base = custom_slug or Path(filename).stem
    # Lowercase, replace non-alphanumeric (except hyphens) with hyphens, collapse runs
    slug = re.sub(r"[^a-z0-9-]", "-", base.lower())
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    return slug[:64] or "book"


def run_extraction(
    *,
    book_id: int,
    user_id: int,
    slug: str,
    input_path: Path,
    extraction_mode: str,
    db_update_callback,  # callable(book_id, **kwargs) -> None
) -> None:
    """
    Run book-to-skill text extraction for the uploaded file and persist the
    results.  Calls ``db_update_callback`` with status / metadata when done.

    This function is designed to run in a background thread so the upload
    endpoint can return immediately.
    """
    work_dir = Path(tempfile.mkdtemp(prefix="bts_"))
    try:
        _do_extraction(
            book_id=book_id,
            user_id=user_id,
            slug=slug,
            input_path=input_path,
            extraction_mode=extraction_mode,
            work_dir=work_dir,
            db_update_callback=db_update_callback,
        )
    finally:
        # Clean up the temp working directory regardless of success/failure
        shutil.rmtree(work_dir, ignore_errors=True)


def _do_extraction(
    *,
    book_id: int,
    user_id: int,
    slug: str,
    input_path: Path,
    extraction_mode: str,
    work_dir: Path,
    db_update_callback,
) -> None:
    # Insert the repo root on sys.path so the book_to_skill package is found
    # even if it was not installed via pip.
    repo_root = Path(__file__).resolve().parent.parent.parent
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))

    try:
        from book_to_skill.utils import extract_single_file
        from book_to_skill.exceptions import ExtractionError
    except ImportError as exc:
        db_update_callback(
            book_id,
            status="failed",
            error_message=f"book_to_skill package not found: {exc}. Install it with: pip install -e .",
        )
        return

    try:
        result = extract_single_file(input_path, extraction_mode, "no")
    except Exception as exc:  # noqa: BLE001
        db_update_callback(book_id, status="failed", error_message=str(exc))
        return

    text: str = result.get("text", "")
    if not text.strip():
        db_update_callback(
            book_id, status="failed", error_message="Extraction produced no visible text."
        )
        return

    # ── Persist to the skill directory ────────────────────────────────────────
    out_dir = skill_dir(user_id, slug)

    (out_dir / "full_text.txt").write_text(text, encoding="utf-8")

    # Strip raw text from metadata before persisting it — the full text lives
    # in full_text.txt; keeping it in metadata.json doubles storage for no gain.
    meta = {k: v for k, v in result.items() if k != "text"}
    (out_dir / "metadata.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    db_update_callback(
        book_id,
        status="ready",
        title=_infer_title(result),
        file_format=result.get("format"),
        file_size_mb=result.get("file_size_mb"),
        pages=result.get("pages") or 0,
        words=result.get("words") or 0,
        estimated_tokens=result.get("estimated_tokens") or 0,
        chapters_detected=result.get("chapters_detected") or 0,
    )


def _infer_title(result: dict) -> str:
    """Best-effort title from the first non-blank line of extracted text."""
    text: str = result.get("text", "")
    for line in text.splitlines():
        stripped = line.strip()
        if stripped and len(stripped) <= 200:
            return stripped
    return result.get("filename", "Untitled")


# ── Helpers for the Q&A layer ─────────────────────────────────────────────────

def load_skill_text(user_id: int, slug: str, max_chars: int = 80_000) -> tuple[str, list[str]]:
    """
    Load the extracted text for a book, returning (text, source_files_used).

    Truncates to ``max_chars`` to stay within typical LLM context windows.
    Returns ("", []) if the skill directory doesn't exist yet.
    """
    out_dir = skill_dir(user_id, slug)
    text_file = out_dir / "full_text.txt"
    if not text_file.exists():
        return "", []

    text = text_file.read_text(encoding="utf-8")
    sources = ["full_text.txt"]

    if len(text) > max_chars:
        text = text[:max_chars] + "\n\n[... text truncated for context window ...]"

    return text, sources


def delete_skill_files(user_id: int, slug: str) -> None:
    """Remove all local skill files for a book."""
    out_dir = SKILLS_ROOT / str(user_id) / slug
    shutil.rmtree(out_dir, ignore_errors=True)
