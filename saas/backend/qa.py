"""AI Q&A layer — sends relevant skill text to OpenAI or Anthropic."""
from __future__ import annotations

import os
from typing import Optional

AI_PROVIDER = os.getenv("AI_PROVIDER", "openai").lower()
AI_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Approximate token budget for the book context sent to the model
CONTEXT_CHAR_LIMIT = 80_000

SYSTEM_PROMPT = """You are a knowledgeable assistant that answers questions based on the provided book content.

Rules:
- Answer only from the provided book text. Do not invent information not present in the text.
- If the answer is not in the provided text, say so clearly.
- Be concise but thorough. Use bullet points or numbered lists when helpful.
- Quote short relevant passages (1-2 sentences) to support your answer when helpful.
- Always cite which part of the book your answer comes from (chapter, section, or page if available)."""


def answer_question(
    question: str,
    book_text: str,
    book_title: Optional[str] = None,
) -> str:
    """
    Send the question + relevant book text to the configured AI provider and
    return the answer string.

    Raises RuntimeError if no provider is configured.
    """
    if not book_text.strip():
        return "The book content could not be loaded. Please try again after the extraction completes."

    title_context = f' The book being studied is: "{book_title}".' if book_title else ""
    user_message = (
        f"Based on the following book content, please answer this question:{title_context}\n\n"
        f"Question: {question}\n\n"
        f"Book content:\n{book_text[:CONTEXT_CHAR_LIMIT]}"
    )

    if AI_PROVIDER == "anthropic":
        return _ask_anthropic(user_message)
    else:
        return _ask_openai(user_message)


def _ask_openai(user_message: str) -> str:
    if not OPENAI_API_KEY:
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Configure it in your .env file."
        )
    try:
        from openai import OpenAI  # lazy import — not required at startup
    except ImportError:
        raise RuntimeError("openai package not installed. Run: pip install openai")

    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model=AI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        max_tokens=1024,
        temperature=0.2,
    )
    return response.choices[0].message.content or ""


def _ask_anthropic(user_message: str) -> str:
    if not ANTHROPIC_API_KEY:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set. Configure it in your .env file."
        )
    try:
        import anthropic  # lazy import
    except ImportError:
        raise RuntimeError("anthropic package not installed. Run: pip install anthropic")

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=AI_MODEL or "claude-3-haiku-20240307",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )
    return message.content[0].text if message.content else ""
