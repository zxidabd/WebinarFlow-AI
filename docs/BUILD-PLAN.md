# WebinarFlow-AI — Build Plan

**Last updated:** 2026-07-13
**Source of truth:** this file. (`docs/AUDIT.md`, dated 2026-07-11, is **stale** — it calls the repo an "~3% empty scaffold"; Phase 0 is done and Phase 1 is well underway. Treat this file, not the audit, as the current plan.)

---

## Phase 0 — Bootable stack ✅ COMPLETE

Make the repo runnable end-to-end with nothing real behind it.

- [x] `backend/requirements.txt` + `backend/app/main.py` — FastAPI app skeleton (health + readiness probes, CORS, router mounting, settings via `pydantic-settings`, lifespan RBAC seeding)
- [x] `backend/app/core/config.py` — settings module
- [x] `backend/app/db/` — SQLAlchemy async engine/session base
- [x] `backend/app/api/v1/router.py` — aggregate v1 router with `_try_include` for optional endpoint modules
- [x] `backend/app/migrations/env.py` + `alembic.ini` + script template — Alembic init
- [x] `backend/env.example`, root `README.md`
- [x] `frontend/src/app/layout.tsx` + `frontend/src/app/page.tsx` — root layout + landing page
- [x] Frontend providers (React Query, theme, toaster) in `components/providers.tsx`
- [x] `frontend/src/lib/api.ts` — axios client with 401-refresh
- [x] High-fidelity landing page: 9 feature components incl. `Hero` + `DashboardPreview` (live Recharts), 6 shadcn UI primitives

---

## Phase 1 — Auth & User Management  ⏳ IN PROGRESS → NEARLY COMPLETE (backend done, frontend auth done, tests green; only the live Postgres migration run remains)

### ✅ Done on backend
- [x] Models registry + entities: `User`, `Organization`, `Membership`, `Role`, `Permission` (+ `role_permissions` association), `RefreshToken` — `models/__init__.py` exports them (Alembic's `import app.models` no longer crashes)
- [x] First Alembic migration: `migrations/versions/0001_initial_auth_tenancy.py`
- [x] Schemas: `auth`, `token`, `user`, `organization`
- [x] Services: `auth_service` (register / login / **refresh with rotation + revocation** / verify-email / forgot + reset-password / **Google sign-in**); `security` (password hashing, JWT, refresh-token hashing); `rbac` (roles/perms + startup seeding from `main.py` lifespan); `oauth` (Google code exchange); `email_service` (verification + reset emails)
- [x] Endpoints: `auth.py`, `users.py`, `organizations.py` — mounted via `router._try_include`
- [x] `app/api/deps.py` — full dependency chain: `get_current_user` → `active` → `verified` → `get_current_membership` (resolves active org from `X-Organization-Id` or default membership) → `require_permissions(*perms)`
- [x] `main.py` lifespan RBAC seeding, CORS, `/health` + `/health/ready` probes
- [x] `backend/tests/` — `conftest.py` (in-memory SQLite via `StaticPool`, real `seed_rbac`, `get_db` override) + test modules `test_auth_api`, `test_auth_service`, `test_organizations`, `test_rbac` (30 tests, green)
- [x] Frontend auth surface — `login`, `register`, `verify-email`, `forgot-password`, `reset-password` pages; persisted zustand store (`store/auth.ts`); `useAuth` hook; `RequireAuth` guard + `dashboard` shell; `AuthShell`; axios client with 401 single-flight refresh to `/auth/refresh`
- [x] Google OAuth frontend — `POST /auth/google` exchange wrapper, `/auth/google/callback` page, `loginWithGoogle`/`beginGoogleSignIn` actions, "Continue with Google" button on login + register *(Phase-1 continuation, 2026-07-15)*
- [x] Resend-verification UX — wired `resendVerification` into the verify-email error state and a post-register "Check your email" screen *(Phase-1 continuation, 2026-07-15)*
- [x] OAuth happy-path backend tests — `test_google_oauth.py` (create/existing-user/state-mismatch/503) *(Phase-1 continuation, 2026-07-15)*
- [ ] **Verify migration against Postgres** — runnable `backend/scripts/verify_migration_postgres.py` added (runs `alembic upgrade head` against a Postgres `DATABASE_URL`, asserts tables/uniques/FKs/indexes + `seed_rbac` + downgrade). Needs a Postgres instance to run; no Postgres/Docker on the dev machine yet, so the live run is deferred. *(Phase-1 continuation, 2026-07-15)*

### 📝 Notes
- `get_current_verified_user` is built but intentionally **not wired** for Phase 1 — no verification gating yet (decision: enable before production launch).
- Verification stays **link-based** (no OTP); dev mode logs the verify/reset token to the backend stdout when `SMTP_HOST` is unset.

---

## Phase 2 — Multi-tenant foundation & Webinar CRUD

- [ ] Organization/team/role/permission CRUD APIs + workspace settings
- [ ] Webinar model + CRUD + dashboard + registration forms + attendance
- [ ] Zoom integration adapter (OAuth, create meeting, fetch registrants)
- [ ] Google Meet integration adapter (OAuth, create meeting, fetch registrants)
- [ ] Frontend: webinar dashboard, create/edit flows, registration forms, attendance views

---

## Phase 3 — AI Agent System + Funnel Builder  (incl. Slide Agent)

> ⚠️ **Fix-up before this phase:** `ANTHROPIC_MODEL` default in `config.py` is `claude-3-5-sonnet-latest` → **EOL**. Update to a current model (`claude-opus-4-8` / `claude-sonnet-5` / `claude-haiku-4-5-20251001`) before any AI work.

### AI Agent System (6 agents)
The pipeline, as rendered on the landing page (`AgentWorkflow.tsx`): **You → Planner → Funnel → Slide → Email → CRM → Analytics**.

- [ ] Modular agent architecture: Planner delegates to Funnel / Slide / Email / CRM / Analytics
- [ ] LLM provider abstraction (Anthropic + OpenAI)
- [ ] Agents to build (in `app/agents/`):
  - [ ] **Planner Agent** — builds the funnel blueprint & timeline
  - [ ] **Funnel Agent** — generates the 7 funnel pages (see below), offers & upsells
  - [ ] **Slide Agent** (`app/agents/slide_agent`) — the *first new agent to add*. This IS the "Webinar" agent the README planned but never built (folded into one agent, not two). Turns the script into a slide deck: slides, hooks, CTAs, registration page. Sits in the pipeline after Funnel.
  - [ ] **Email Agent** — registration/reminder/replay/offer/follow-up sequences
  - [ ] **CRM Agent** — leads/customers/tags/notes/segmentation/scoring
  - [ ] **Analytics Agent** — visitors/registrations/attendance/conversion/revenue/funnel/ROI

### Funnel builder — the 7 generated pages
The Funnel Agent generates a complete, connected funnel of **7 pages**:

1. **Landing Page**
2. **Registration Page**
3. **Thank You Page**
4. **Webinar Page**
5. **Sales Page**
6. **Checkout Page**
7. **Order Confirmation Page**

- [ ] Page-generation service producing all 7 (UI/UX + copy + structure)
- [ ] Real frontend routes for each generated page, including `/checkout` and `/order-confirmation`
- [ ] AI Funnel Builder: templates + funnel analytics

> **Architectural decision: split generation from payment-taking.**
> - **Phase 3** generates the page UI/UX + copy for *all 7 pages*, including Checkout and Order Confirmation. `/checkout` and `/order-confirmation` are **real renderable routes** from Phase 3 — but the Checkout Page is **inactive (non-paying)** until Phase 5 lands.
> - **Phase 5** wires the live money flow behind the Phase-3 Checkout Page (Stripe + Razorpay adapters, Payment/Subscription models, checkout-session creation, Stripe webhook handler, coupons/upsells/order-bumps) and fills the Order Confirmation Page with real transaction data.
> Phase 3 *designs* the funnel; Phase 5 *collects the money* for it. Keeping them split means the agents don't block on payments infra.

### Asset Export Service (also Phase 3)
- [ ] `app/services/asset_export` + router endpoints + minimal models — export generated assets to all four chosen formats:
  - [ ] **PPTX** (PowerPoint, via `python-pptx`)
  - [ ] **PDF**
  - [ ] **HTML bundle** (zip)
  - [ ] **Per-slide image bundle** (PNG/JPG)

### Frontend (Phase 3)
- [ ] Agent workflow UI showing the 7-node pipeline (already present as the landing-page `AgentWorkflow.tsx`; promote into the product once auth-protected)
- [ ] Asset export controls in the product UI

---

## Phase 4 — AI Content Engine, CRM, Email/WhatsApp automation

- [ ] AI content generations (copy, sequences, scripts, follow-ups)
- [ ] CRM (leads/customers/tags/notes/segmentation/scoring)
- [ ] Email automation (registration/reminder/replay/offer/follow-up templates + scheduler)
- [ ] WhatsApp (Meta Cloud API) — scheduled/broadcast/follow-up

---

## Phase 5 — Analytics & Payments

### Analytics
- [ ] Analytics service + dashboard (visitors/registrations/attendance/conversion/revenue/funnel/ROI)

### Payments — wiring the Phase 3 Checkout Page to live money
- [ ] **Stripe integration adapter**
- [ ] **Razorpay integration adapter** — both Stripe AND Razorpay from day one; processor switchable (e.g. by region) so India + global are covered
- [ ] Payment + Subscription models
- [ ] Checkout-session creation endpoint (drives the existing Phase 3 `/checkout` page)
- [ ] Stripe webhook handler → marks paid, fills the Phase 3 **Order Confirmation** page with real transaction data
- [ ] Coupons, subscriptions, upsells, order bumps

> Note: the Checkout Page and Order Confirmation Page *routes* already exist from Phase 3; Phase 5 only adds the live payment behavior behind them.

---

## Phase 6 — Admin & Deployment

- [ ] Admin dashboard (user/subscription/AI-usage/revenue/template management)
- [ ] Dockerfile, docker-compose (app + db + redis), prod env config
- [ ] CI/CD (GitHub Actions: lint/test/build/deploy)
- [ ] Cloud Run / Railway / Vercel configs

---

## Deferred (not in scope now)

- **Knowledge Base** — recorded as a planned future item. Do not build now.

---

## Mapping to the 12 audit areas

| # | Area | Phase |
|---|------|-------|
| 1 | Authentication & User Mgmt | 1 |
| 2 | Multi-Tenant SaaS | 1–2 |
| 3 | Webinar Management (incl. Zoom/Meet) | 2 |
| 4 | AI Funnel Builder | 3 |
| 5 | AI Content Engine | 4 |
| 6 | CRM | 4 |
| 7 | Email Automation | 4 |
| 8 | WhatsApp Automation | 4 |
| 9 | Analytics | 5 |
| 10 | Payments (Stripe + Razorpay, checkout, coupons, upsells) | 5 |
| 11 | Admin Dashboard | 6 |
| 12 | Deployment | 6 |
| — | AI Agent System (Planner/Funnel/Slide/Email/CRM/Analytics) | 3 |
| — | Asset Export Service (PPTX/PDF/HTML-zip/images) | 3 |
| — | The 7 generated funnel pages (incl. Checkout + Order Confirmation) | 3 (gen) / 5 (pay) |

---

## Maintenance

Update this file whenever a phase advances or scope changes — the same way `docs/AUDIT.md` was allowed to go stale. This file is the source of truth, not the audit.
