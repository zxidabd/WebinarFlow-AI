# WebinarFlow-AI

> An AI agent that turns a single business idea into a complete webinar funnel —
> landing pages, webinar scripts, email sequences, and sales assets — automatically.

Monorepo: a **Next.js 15** frontend and a **FastAPI** backend, with a multi-agent
AI system, multi-tenant SaaS, CRM, email/WhatsApp automation, analytics, and
payments.

## Quick start

### Prerequisites
- Node.js >= 20
- Python >= 3.11
- PostgreSQL (or set `SQLITE_FALLBACK=true` to develop without it)
- Redis (for Celery — optional until Phase 4)

### 1. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../env.example ../.env                              # then edit secrets
uvicorn app.main:app --reload --port 8000
```
Health: http://localhost:8000/health · Docs: http://localhost:8000/api/docs

### 2. Frontend
```bash
cd frontend
npm install
cp ../env.example .env.local                           # set NEXT_PUBLIC_API_URL
npm run dev    # http://localhost:3000
```

### Or, from the repo root (workspaces)
```bash
npm run backend:install   # pip install
npm run backend           # uvicorn
npm run dev               # next dev (in another terminal)
```

## Environment
See [`env.example`](./env.example). Copy it to `.env` (backend) and
`frontend/.env.local` (frontend). The app boots with sane defaults; only the
database URL and an AI provider key are required to exercise generation.

## Project layout
```
backend/app/
  main.py            FastAPI entry (CORS, lifespan, /health)
  core/config.py     pydantic-settings (all integrations)
  db/                async SQLAlchemy engine/session + Alembic Base
  api/v1/            versioned routers (auth, users, orgs, webinars, generate…)
  models/            ORM models
  schemas/          Pydantic request/response schemas
  services/          business logic + integration adapters (LLM, Zoom, Stripe…)
  agents/            the multi-agent AI system (Planner → Funnel/Copy/…)
frontend/src/
  app/               Next.js App Router (landing + product routes)
  components/        UI primitives (shadcn) + feature components
  lib/              utils, api client, motion
  store/             zustand stores (auth, ui)
docs/AUDIT.md        gap analysis this project is executing against
```

## Status
See [`docs/AUDIT.md`](./docs/AUDIT.md) for the original gap analysis. Phases:
0 boot · 1 auth · 2 webinars · 3 AI agent system · 4 funnel/CRM/automation ·
5 analytics/payments · 6 admin/tests/deploy.

## License
Proprietary — © WebinarFlow-AI.
