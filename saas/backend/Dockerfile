FROM python:3.11-slim

# System dependencies for PDF extraction (pdftotext)
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY saas/backend/requirements.txt ./saas/backend/requirements.txt
RUN pip install --no-cache-dir -r saas/backend/requirements.txt

# Install book-to-skill in editable mode (gives parsers access)
COPY pyproject.toml ./
COPY book_to_skill/ ./book_to_skill/
COPY scripts/ ./scripts/
RUN pip install --no-cache-dir -e ".[pdf,epub,docx,rtf]"

# Copy backend source
COPY saas/backend/ ./saas/backend/

# Create skills storage directory
RUN mkdir -p /var/app/skills

# Expose port
EXPOSE 8000

CMD ["uvicorn", "saas.backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
