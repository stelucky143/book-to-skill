# BookSkill SaaS — Full-Stack Deployment Guide

Turn any book or document into an AI-powered study partner. Users upload PDFs and ask questions; the AI answers from the actual book content.

---

## 📁 Structure

```
saas/
├── backend/          Python FastAPI backend (wraps book-to-skill)
│   ├── main.py       All API routes
│   ├── auth.py       JWT authentication
│   ├── models.py     DB models + Pydantic schemas
│   ├── database.py   SQLAlchemy + SQLite setup
│   ├── extraction.py book-to-skill integration + local file storage
│   ├── qa.py         AI Q&A (OpenAI or Anthropic)
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── web/              Next.js 14 web frontend
│   ├── app/          App Router pages
│   ├── components/   Reusable UI components
│   ├── lib/          API client + auth helpers
│   └── Dockerfile
├── mobile/           React Native (Expo) mobile app
│   ├── app/          Expo Router screens
│   └── lib/          API client
└── docker-compose.yml
```

---

## 🚀 Quick Start (Local Development)

### 1. Backend

```bash
# From the repo root
cd /path/to/book-to-skill

# Install book-to-skill + backend deps
pip install -e ".[pdf,epub,docx,rtf]"
pip install -r saas/backend/requirements.txt

# Configure environment
cp saas/backend/.env.example saas/backend/.env
# Edit saas/backend/.env — at minimum set JWT_SECRET_KEY and OPENAI_API_KEY

# Run the API server
uvicorn saas.backend.main:app --reload --port 8000
```

The API will be available at http://localhost:8000.
Interactive docs: http://localhost:8000/docs

### 2. Web Frontend

```bash
cd saas/web
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

### 3. Mobile App

```bash
cd saas/mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `a`/`i` for Android/iOS simulator.

---

## 🐳 Docker (Production)

```bash
# From saas/ directory
cd saas

# Set required environment variables
export JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
export OPENAI_API_KEY=sk-...your-key...

docker compose up --build -d
```

- Backend API: http://localhost:8000
- Web frontend: http://localhost:3000
- Skill files persist in Docker volume `skills_data`
- Database persists in Docker volume `db_data`

---

## 🔑 Required Configuration

Edit `saas/backend/.env` (copy from `.env.example`):

| Variable | Description |
|---|---|
| `JWT_SECRET_KEY` | **Required.** Random secret for signing JWTs. Generate with: `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `OPENAI_API_KEY` | Required if `AI_PROVIDER=openai` (default) |
| `ANTHROPIC_API_KEY` | Required if `AI_PROVIDER=anthropic` |
| `AI_PROVIDER` | `openai` or `anthropic` (default: `openai`) |
| `AI_MODEL` | Model to use (default: `gpt-4o-mini`) |
| `SKILLS_ROOT` | Where skill files are stored (default: `/var/app/skills`) |

---

## 📡 API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Create account |
| POST | `/auth/login` | — | Get JWT token |
| GET | `/me` | ✓ | Current user info |
| GET | `/usage` | ✓ | Tier + usage stats |
| POST | `/upload` | ✓ | Upload & extract book (async) |
| GET | `/books` | ✓ | List all books |
| GET | `/books/{id}` | ✓ | Book details |
| DELETE | `/books/{id}` | ✓ | Delete book + files |
| GET | `/status/{job_id}` | ✓ | Extraction job status |
| POST | `/ask` | ✓ | Ask a question |

All authenticated endpoints require: `Authorization: ******

### Upload example
```bash
curl -X POST http://localhost:8000/upload \
  -H "Authorization: ******" \
  -F "file=@mybook.pdf" \
  -F "extraction_mode=text"
```

### Ask example
```bash
curl -X POST http://localhost:8000/ask \
  -H "Authorization: ******" \
  -H "Content-Type: application/json" \
  -d '{"book_id": 1, "question": "What is the main thesis of chapter 3?"}'
```

---

## 💰 Pricing Tiers

| Tier | Price | Books | Questions/mo |
|---|---|---|---|
| Free | $0 | 2 | 50 |
| Student | $5/mo | 10 | 500 |
| Pro | $15/mo | 50 | Unlimited |
| Team | $49/mo | 200 | Unlimited |

Tiers are enforced in the API. To upgrade a user:
```python
# Quick manual upgrade (connect to SQLite first)
sqlite3 /var/app/bookskill.db
UPDATE users SET tier = 'pro' WHERE email = 'user@example.com';
```

For automated billing, integrate [Stripe](https://stripe.com) and call a similar update on webhook receipt.

---

## 🔒 Security

- Each user's skill files are isolated at `<SKILLS_ROOT>/<user_id>/<slug>/`
- Uploaded files are validated for extension and size before processing
- book-to-skill's built-in `sanitize.py` strips invisible Unicode (prompt-injection protection)
- DOCX parser guards against XXE/Billion-Laughs attacks
- JWT tokens expire after 7 days (configurable via `JWT_EXPIRE_MINUTES`)
- CORS restricted to configured `CORS_ORIGINS`

---

## ☁️ Production Deployment

### DigitalOcean / AWS EC2

1. Provision a server (2 vCPU, 4 GB RAM, 100 GB SSD — ~$20/mo on DigitalOcean)
2. Install Docker + Docker Compose
3. Clone the repo
4. Set environment variables in a `.env` file
5. Run `docker compose up -d`
6. Add a reverse proxy (nginx) with SSL (Let's Encrypt / Certbot)

### Web Frontend

Deploy `saas/web/` to [Vercel](https://vercel.com):
```bash
cd saas/web
npx vercel --prod
```
Set `NEXT_PUBLIC_API_URL` to your backend's public URL in Vercel's environment variables.

### Mobile App

```bash
cd saas/mobile
# Build for production
npx expo build:android
npx expo build:ios
```

Submit to Google Play Store / Apple App Store.

---

## 🛠 Extending

- **Add Stripe billing** — add a `/billing/upgrade` endpoint that creates a Stripe Checkout Session, handle webhook at `/billing/webhook`, update `user.tier` on successful payment
- **Add Google OAuth** — integrate `python-social-auth` or `authlib` on the backend; add NextAuth.js provider on the web
- **Add EPUB/DOCX support** — already supported by book-to-skill; just upload the file
- **Upgrade to PostgreSQL** — change `DATABASE_URL` to `postgresql://...`; SQLAlchemy handles the rest
- **Add Redis + Celery** — replace `BackgroundTasks` in `main.py` with Celery tasks for better reliability and retry logic
