# Typeform Clone

A functional clone of Typeform: build forms in a drag-and-drop builder with live preview, publish them behind a shareable link, collect responses through the signature animated **one-question-at-a-time** experience, and analyse the results.

- **Frontend:** Next.js 14 (App Router) + TypeScript, plain CSS (no UI kit), `@dnd-kit` for drag-and-drop
- **Backend:** Python, FastAPI, SQLAlchemy 2
- **Database:** SQLite (`backend/typeform.db`, auto-created and seeded on first start)
- **Marketing site (`/`):** a recreation of the typeform.com landing page (animated logo, hero videos with tab progress, scroll reveals, mega-menus, customer slider, integrations marquee, footer, cookie banner, contact-sales modal).
- **Auth:** light-weight — sign up / log in (`/signup`, `/login`, scrypt-hashed passwords, opaque bearer tokens). Without a token the seeded "Demo Creator" workspace is used, so the builder is usable instantly. Filling a published form never needs a login.

## Quick start

```bash
# 1. Backend  (http://localhost:8000, docs at /docs)
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. Frontend (http://localhost:3000)
cd frontend
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

On first start the DB is seeded with a default creator and three forms (two published with ~40 responses incl. partial ones, one draft). Delete `backend/typeform.db` to reset. Run the API tests with `cd backend && pytest`.

## Features

| Area | What's implemented |
|---|---|
| Builder | 3-pane layout (content list · live inline-editable canvas · settings panel). Add / edit / duplicate / delete / **drag-and-drop reorder**. 8 types: short text, long text, multiple choice (single or multi), dropdown, email, number (min/max), yes/no, rating (3–10 steps). Per-question required toggle + description. Welcome & thank-you screens. Autosave with "Saving… / All changes saved". Full-screen **Preview** that runs the real respondent component. |
| Form management | Dashboard (list/grid view, search), create, rename, duplicate, delete (with confirm), publish/unpublish, public link `/to/<slug>`, status + response count. |
| Respondent flow | Full-screen, one question at a time, animated slide transitions, progress bar + %, keyboard (Enter, ↑/↓, letter keys A–Z for choices, Y/N, digits for rating, Shift+Enter in long text), client **and** server validation, thank-you screen, no login. |
| Results | Stats (views, starts, responses, completion rate, avg. time), per-question **summary** (choice counts/percentages, rating average + distribution, number stats, latest text answers), **responses table**, single-response drawer with prev/next + delete, completed/partial filter, **CSV export**. |
| Landing page | Pixel-matched recreation of typeform.com: nav whose wordmark **slides into the logo mark** after 500 px of scroll (hover reveals it), mega-menu dropdowns, hero with split-word headline and three tab cards whose progress bars follow the hero videos (auto-advance on `ended`), scroll-parallax purple arc, text/media sections with staggered reveals, customer logo marquee, expanding testimonial slider, integrations marquee with brand-colour hover, looping star-field CTA video, footer with newsletter, cookie banner, "Ask Ty" chat chip, **Contact sales** modal (stored via API). Responsive down to mobile with a hamburger menu. |
| Accounts | Sign up / log in pages; the dashboard avatar menu shows the user and logs out. Each account has its own empty workspace. |
| Typeform feel | Toasts, modals, inline editing, themes, placeholders ("Coming soon") for Connect/integrations, team sharing, payment & file upload, advanced logic. |
| Bonus | **Basic logic jumps** (if answer … then jump to question / end form — evaluated on client *and* server), **custom themes** (6 presets, font, 5 colours), **CSV export**, **partial-response tracking / completion rate**. |

## Architecture

```
frontend/ (Next.js)                         backend/ (FastAPI)
  src/app        routes (/ landing, /login, /signup, /dashboard, /forms/[id]/{edit,connect,share,results}, /to/[slug])
  src/components landing/* (marketing site), auth/AuthPage
  src/components FormRunner (respondent), builder/*, FormHeader, Modal, Toast
  src/hooks      useBuilder — optimistic state + debounced autosave
  src/lib        api client, validation + branching logic, themes
        │  REST/JSON  (NEXT_PUBLIC_API_URL)
        ▼
                                              app/main.py        app, CORS, startup (create tables + seed)
                                              app/routers/forms.py    creator CRUD: forms + questions
                                              app/routers/results.py  responses, summary stats, CSV
                                              app/routers/public.py   unauthenticated respondent API
                                              app/routers/auth.py     signup / login / me (scrypt + bearer tokens)
                                              app/routers/site.py     landing content, contact-sales, newsletter
                                              app/logic.py       answer validation + branching (single source of truth server-side)
                                              app/models.py · schemas.py · deps.py · seed.py
                                                          │
                                                       SQLite
```

Key decisions
- **Validation & logic live on both sides.** `frontend/src/lib/logic.ts` gives instant feedback; `backend/app/logic.py` is authoritative. On submit the server replays the jump rules (`compute_path`) so it only validates questions the respondent could actually have seen (a required question skipped by a jump is not an error).
- **Granular REST for the builder** (one endpoint per question) keeps writes small; the client applies changes optimistically and debounces PATCHes (600 ms), flushing on publish/unload.
- **Partial tracking:** a response row is created when the respondent *starts* (`status=partial`) and flipped to `completed` on submit. Completion rate = completed ÷ started.
- **Answers store the choice *label*** (snapshot semantics), so exports/summaries stay readable even if a choice is later renamed.
- **Auth lives in one dependency:** `deps.current_user` resolves the bearer token to a user (falling back to the demo creator when no token is sent); every creator route is scoped to that owner.
- **Landing content is data:** testimonials and integrations are rows served by `GET /api/site/content`; the frontend ships the same copy as a static fallback so the page still renders if the API is asleep.

## Database schema

```
users(id PK, name, email UNIQUE, password_hash NULL)
auth_sessions(id PK, user_id FK→users CASCADE, token_hash UNIQUE, created_at)
customer_stories(id PK, position, company, quote, logo)      -- landing testimonials
integration_apps(id PK, position, name, logo)                -- landing integrations marquee
contact_requests(id PK, kind[sales|newsletter], name, email, company, message, created_at)
forms(id PK, owner_id FK→users, title, slug UNIQUE, status[draft|published], theme JSON,
      welcome_enabled, welcome_title, welcome_description, welcome_button,
      thankyou_title, thankyou_description, views, created_at, updated_at, published_at)
questions(id PK, form_id FK→forms CASCADE, position, type, title, description, required, settings JSON)
choices(id PK, question_id FK→questions CASCADE, position, label)
logic_rules(id PK, question_id FK→questions CASCADE, position, op, value,
            action[jump|end], target_question_id FK→questions CASCADE NULL)
responses(id PK, form_id FK→forms CASCADE, status[partial|completed], started_at, submitted_at)
answers(id PK, response_id FK→responses CASCADE, question_id FK→questions CASCADE, value JSON,
        UNIQUE(response_id, question_id))
```
`users 1─* forms 1─* questions 1─* choices`, `questions 1─* logic_rules`, `forms 1─* responses 1─* answers *─1 questions`. Foreign keys are enforced (`PRAGMA foreign_keys=ON`), so deleting a form/question/response cascades cleanly. `settings` (placeholder, steps, min/max, allow_multiple) and `theme` are JSON because they are type-specific and never queried relationally.

## API overview (`/docs` has the interactive OpenAPI)

Creator (prefix `/api`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/signup` · `/auth/login` | returns `{token, user}`; 409 duplicate email, 401 bad credentials |
| GET | `/auth/me` | current user |
| GET | `/site/content` | landing testimonials + integrations |
| POST | `/contact-sales` · `/newsletter` | stored in `contact_requests` |
| GET/POST | `/forms` | list (with response counts) / create |
| GET/PATCH/DELETE | `/forms/{id}` | read / update title, theme, welcome & thank-you / delete |
| POST | `/forms/{id}/duplicate` · `/publish` · `/unpublish` | publish validates ≥1 question and non-empty titles |
| POST | `/forms/{id}/questions` | add (`type`, optional `index`) |
| PUT | `/forms/{id}/questions/order` | reorder (`question_ids`) |
| PATCH/DELETE | `/questions/{id}` | edit (title, description, required, settings, choices, rules, type) / delete |
| POST | `/questions/{id}/duplicate` | duplicate |
| GET | `/forms/{id}/responses?status=&limit=&offset=` | paged responses |
| GET/DELETE | `/forms/{id}/responses/{rid}` | one response / delete |
| GET | `/forms/{id}/summary` | stats + per-question aggregates |
| GET | `/forms/{id}/responses/export.csv` | CSV export (formula-injection safe) |

Public (no auth)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/public/forms/{slug}` | published form (404 if draft); counts a view |
| POST | `/api/public/forms/{slug}/responses` | start a response (partial) |
| POST | `/api/public/forms/{slug}/responses/{id}/submit` | validate + store; `422 {errors:{questionId:msg}}` on failure |

## Deployment

- **API → Render** (or Railway/Fly): `render.yaml` is included (root dir `backend`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`). Set `CORS_ORIGINS` to your frontend URL. SQLite lives on the instance disk — on free tiers it resets on redeploy and the seed data returns; attach a persistent disk and set `DATABASE_URL=sqlite:////var/data/typeform.db` to keep data.
- **Frontend → Vercel/Netlify:** import the repo, set root directory `frontend`, env `NEXT_PUBLIC_API_URL=https://<your-api-host>`.

## Assumptions & notes

- Auth is intentionally simple (no email verification, password reset or OAuth). Anonymous requests use the demo creator so reviewers can try the builder immediately.
- "Contact sales" and newsletter submissions are only stored in the database; no email is sent.
- Logic jumps only go **forward** (keeps flows acyclic); first matching rule wins.
- **Fonts:** Typeform's licensed faces (TWK Lausanne, Tobias) are substituted with the free Hanken Grotesk and Newsreader (self-hosted via `@fontsource`); the builder uses Inter/Karla/Space Grotesk/Playfair from Google Fonts.
- **Marketing assets:** the landing page reuses Typeform's public marketing media (hero/CTA videos, section posters, icons, integration and customer logos in `frontend/public/landing`) purely to reproduce the reference design for this exercise. The customer-logo marquee uses made-up placeholder names. Replace the files in that folder to rebrand. All code is original.
- The three hero videos and CTA video are muted, looping/auto-advancing and pause when off screen.
- Connect/integrations, team sharing, payment and file-upload are "Coming soon" placeholders as allowed.

## Original work

All code in this repository was written for this assignment (with AI assistance, as permitted); no existing repositories were copied.
