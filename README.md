# Typeform clone

> ## **Database: SQLite (default, as specified); hosted demo uses Neon Postgres only so data survives Render restarts which would've wiped out all data after 15 minutes of inactivity**

A working clone of Typeform. You build a form in a drag-and-drop builder, publish it, send people the link, and they answer one question at a time in a full-screen, animated flow. Their answers show up in a results view with stats and a CSV export.

- Live app: https://scaler-typeform-submission.vercel.app
- API docs (FastAPI): https://scaler-typeform-submission.onrender.com/docs
- Source: https://github.com/Naman-Singh-777/Scaler-Typeform-Submission

The API runs on Render's free tier and goes to sleep when idle. The first request after a quiet spell can take 30 to 50 seconds. Open the app once, wait for it to wake, and everything after that is fast.

To look around quickly, open the live app, go to Log in, and press "Try the demo account". It signs you in as `creator@example.com` (password `demo1234`), which has three sample forms and about 40 responses. Or sign up with your own email and start from an empty workspace. Filling in a published form never needs an account.

Note on the database: the project uses SQLite by default, as the brief asks. Running the backend locally (`uvicorn app.main:app`) needs no database setup and creates a seeded SQLite file. The hosted demo runs on Neon Postgres instead, because Render's free disk is wiped on every redeploy and visitors would lose their forms. The same SQLAlchemy models run unchanged on both, and Postgres is switched on only by setting `DATABASE_URL`.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, plain CSS, `@dnd-kit` for drag and drop |
| Backend | Python, FastAPI, SQLAlchemy 2 |
| Database | SQLite locally, Postgres (Neon) in production |
| Hosting | Vercel (frontend), Render (API), Neon (database) |

SQLite is the default, so the project runs with no setup. The hosted demo sets `DATABASE_URL` to a Neon Postgres database. Render's free disk is wiped on every redeploy, so SQLite there would lose everyone's forms.

## How it works, from the creator's side

1. **Land on the home page.** `/` is a recreation of the typeform.com landing page: the wordmark that shrinks into the logo as you scroll, mega-menus, hero videos with progress tabs, customer and integration marquees, and an "Ask Ty" chat that answers questions through a real LLM. Log in or Sign up from the top right.
2. **Open your workspace.** The dashboard lists your forms as a list or a grid, with status (draft or published), response count and search. You can create, rename, duplicate or delete a form here. Each account only sees its own forms.
3. **Build the form.** The builder has three panes: the question list on the left, a live canvas in the middle where you edit titles and choices inline, and a settings panel on the right. Press "Add content" to pick a question type, and drag questions in the left list to reorder them. Changes autosave, and the header shows "Saving..." and then "All changes saved".
4. **Add questions with AI, if you like.** "Ask Typeform AI" in the left rail (and the "Chat to create" bar on the Workflow tab) takes a plain description such as "a feedback form for a pet-grooming salon" and adds the questions it generates. From the dashboard, the same box creates a whole new form.
5. **Style it.** The Design panel has six theme presets, a font choice and five colours. Welcome and thank-you screens can be edited and switched on or off.
6. **Preview.** The play button runs the real respondent component full screen, so what you see is what people get. A mobile toggle shows the narrow layout.
7. **Publish.** Press Publish. The form needs at least one question with a title. You get a public link of the form `/to/<slug>` in a copy-to-clipboard dialog. Unpublish takes it offline again, and the Share tab has the link at any time.
8. **Read the results.** The Results tab shows views, starts, responses, completion rate and average time. Below that is a per-question summary (counts and percentages for choices, average and spread for ratings, min, max and average for numbers, latest text answers) and a responses table. Click a row to open that response in a drawer, move between responses, or delete one. You can filter completed against partial responses and export everything as CSV.
9. **Connect (optional).** The Connect tab sends each completed response to Slack (incoming webhook), Zapier (Catch Hook) or any webhook URL. There is a "Send test" button and the last delivery status is shown. Google Sheets, Notion and Mailchimp go through a Zapier Catch Hook.

## How it works, from the respondent's side

Open `/to/<slug>`. No login. The form fills the screen and shows one question at a time with a sliding transition and a progress bar. Enter moves forward, the arrow keys move between questions, letter keys pick a choice, Y and N answer yes/no questions, digits set a rating, and Shift+Enter adds a new line in a long answer. Each answer is validated in the browser (required, email format, number range) and again on the server. After the last question the respondent sees the thank-you screen.

A response row is created the moment someone starts, and marked completed when they submit. That is what makes the completion rate and the partial-response view possible.

## What is implemented

**Question types (9):** short text, long text, multiple choice (single or multiple), dropdown, email, number (min and max), yes/no, rating (3 to 10 steps) and file upload. Every question has a required toggle and a description.

**Bonus items from the brief:**
- Logic jumps. A rule reads "if the answer is X, go to question Y or end the form". Both the browser and the server evaluate them, and jumps only go forward so a flow can never loop.
- Custom themes with presets, fonts and colours.
- CSV export, with protection against spreadsheet formula injection.
- Partial-response tracking and completion rate.
- File upload. Files up to 5 MB are stored in the database, and the creator downloads them from the response drawer.
- Dark mode. It is off by default and can be switched on from the account menu. It covers the creator screens only.

**Beyond the brief:**
- Real accounts: sign up, log in, scrypt-hashed passwords, bearer tokens, and private workspaces.
- A Workflow tab with a map of the questions and their jump rules.
- Real AI for form generation and for the Ask Ty chat. Without an API key the app falls back to built-in templates and canned answers instead of failing.
- Slack, Zapier and webhook delivery.
- The landing page, with contact-sales and newsletter forms that store their submissions.

**Seed data:** on first start the database gets a demo creator and three forms. Two are published with about 40 responses between them (some partial) and one is a draft, so the app is usable straight away.

## Run it locally

```bash
# Backend: http://localhost:8000 (docs at /docs)
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend: http://localhost:3000
cd frontend
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

The SQLite file `backend/typeform.db` is created and seeded on first start. Delete it to reset. Run the API tests with `cd backend && pytest`.

Optional environment variables for the backend:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string. Leave unset to use SQLite. |
| `CORS_ORIGINS` | The frontend URL that may call the API. |
| `LLM_API_KEY` | Turns on real AI. Defaults to Google's Gemini OpenAI-compatible endpoint and the model `gemini-3.5-flash-lite`. Override with `LLM_BASE_URL` and `LLM_MODEL`. |
| `ANTHROPIC_API_KEY` | Alternative to `LLM_API_KEY`, using Claude. `ANTHROPIC_MODEL` is optional. |

## Architecture

```
frontend/ (Next.js)                            backend/ (FastAPI)
  src/app        routes: /, /login, /signup,     app/main.py              app, CORS, startup (tables + seed)
                 /dashboard,                     app/routers/forms.py     forms and questions CRUD
                 /forms/[id]/{edit,workflow,     app/routers/results.py   responses, summary stats, CSV
                 connect,share,results},         app/routers/public.py    respondent API, no auth
                 /to/[slug]                      app/routers/auth.py      signup, login, me
  src/components landing/*, auth/*, builder/*,   app/routers/ai.py        form generation, Ask Ty chat
                 runner/FormRunner, FormHeader   app/routers/integrations.py  webhook, Slack, Zapier
  src/hooks      useBuilder (optimistic state    app/routers/site.py      landing content, contact, newsletter
                 and debounced autosave)         app/logic.py             validation and branching
  src/lib        api client, validation and      app/models.py, schemas.py, deps.py, seed.py
                 branching, themes, AI fallback
        |  REST / JSON (NEXT_PUBLIC_API_URL)
        v
                                               SQLite or Postgres
```

Some decisions worth knowing about:

- **Validation and branching exist on both sides.** `frontend/src/lib/logic.ts` gives instant feedback. `backend/app/logic.py` is the authority. On submit the server replays the jump rules, so a required question that a jump skipped is not an error.
- **The builder API is granular.** One endpoint per question keeps each write small. The client updates optimistically and sends a PATCH after 600 ms of quiet, flushing on publish and on leaving the page.
- **Answers store the choice label.** Exports and summaries stay readable even if a choice is renamed later.
- **Auth is a single dependency.** `deps.current_user` turns the bearer token into a user and answers 401 if it is missing. Every creator route is scoped to that owner. The `ALLOW_ANON_DEMO=1` switch brings back a shared demo user and exists only for the test suite.
- **Landing content is data.** Testimonials and integrations are rows served by `GET /api/site/content`. The frontend ships the same copy as a static fallback, so the page still renders while the API is waking up.
- **Webhook delivery runs in the background** after a response is submitted, refuses private, loopback and link-local addresses, and only accepts `hooks.slack.com` for Slack and `zapier.com` for Zapier.

## Database schema

```
users(id PK, name, email UNIQUE, password_hash NULL)
auth_sessions(id PK, user_id FK users CASCADE, token_hash UNIQUE, created_at)
forms(id PK, owner_id FK users, title, slug UNIQUE, status[draft|published], theme JSON,
      welcome_enabled, welcome_title, welcome_description, welcome_button,
      thankyou_title, thankyou_description, views, created_at, updated_at, published_at)
questions(id PK, form_id FK forms CASCADE, position, type, title, description, required, settings JSON)
choices(id PK, question_id FK questions CASCADE, position, label)
logic_rules(id PK, question_id FK questions CASCADE, position, op, value,
            action[jump|end], target_question_id FK questions CASCADE NULL)
responses(id PK, form_id FK forms CASCADE, status[partial|completed], started_at, submitted_at)
answers(id PK, response_id FK responses CASCADE, question_id FK questions CASCADE, value JSON,
        UNIQUE(response_id, question_id))
file_uploads(id PK, response_id FK responses CASCADE, question_id FK questions CASCADE,
             filename, content_type, size, data BLOB, created_at)
webhooks(id PK, form_id FK forms CASCADE, kind[webhook|slack|zapier], url,
         last_status, last_at, created_at)
customer_stories(id PK, position, company, quote, logo)     -- landing testimonials
integration_apps(id PK, position, name, logo)               -- landing integrations marquee
contact_requests(id PK, kind[sales|newsletter], name, email, company, message, created_at)
```

The relationships are `users 1-* forms 1-* questions 1-* choices`, `questions 1-* logic_rules`, and `forms 1-* responses 1-* answers *-1 questions`. Foreign keys are enforced and deletes cascade, so removing a form, question or response leaves nothing orphaned. `settings` (placeholder, steps, min and max, allow-multiple) and `theme` are JSON columns because they differ per question type and are never queried relationally.

## API overview

The interactive OpenAPI docs are at `/docs`. All creator routes live under `/api` and need a bearer token.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/signup`, `/auth/login` | Returns `{token, user}`. 409 for a duplicate email, 401 for bad credentials. |
| GET | `/auth/me` | Current user |
| GET | `/site/content` | Landing testimonials and integrations |
| POST | `/contact-sales`, `/newsletter` | Stored in `contact_requests` |
| GET, POST | `/forms` | List with response counts, or create |
| GET, PATCH, DELETE | `/forms/{id}` | Read, update title, theme and screens, or delete |
| POST | `/forms/{id}/duplicate`, `/publish`, `/unpublish` | Publishing needs at least one question and no empty titles |
| POST | `/forms/{id}/questions` | Add a question (`type`, optional `index`) |
| PUT | `/forms/{id}/questions/order` | Reorder (`question_ids`) |
| PATCH, DELETE | `/questions/{id}` | Edit title, description, required, settings, choices, rules and type, or delete |
| POST | `/questions/{id}/duplicate` | Duplicate a question |
| GET | `/forms/{id}/responses?status=&limit=&offset=` | Paged responses |
| GET, DELETE | `/forms/{id}/responses/{rid}` | One response, or delete it |
| GET | `/forms/{id}/summary` | Stats and per-question aggregates |
| GET | `/forms/{id}/responses/export.csv` | CSV export |
| GET | `/forms/{id}/files/{file_id}` | Download an uploaded file, as an attachment |
| GET, POST | `/forms/{id}/webhooks` | List or add a Slack, Zapier or webhook connection |
| DELETE | `/webhooks/{id}` | Remove a connection |
| POST | `/webhooks/{id}/test` | Send a test payload |
| GET | `/ai/status` | Whether an LLM key is configured |
| POST | `/ai/generate-form` | Questions from a prompt |
| POST | `/ai/chat` | The landing page's Ask Ty (public, 30 requests per 10 minutes per IP) |

Public routes need no token:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/public/forms/{slug}` | A published form (404 for a draft). Counts a view. |
| POST | `/api/public/forms/{slug}/responses` | Start a response (partial) |
| POST | `/api/public/forms/{slug}/responses/{id}/submit` | Validate and store. Returns `422 {errors: {questionId: message}}` on failure. |

## Deployment

- **API on Render.** `render.yaml` is included (root directory `backend`, start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`). Set `CORS_ORIGINS` to the frontend URL, and `DATABASE_URL` to a Postgres connection string such as Neon's. Tables are created on startup.
- **Frontend on Vercel.** Import the repo, set the root directory to `frontend`, and set `NEXT_PUBLIC_API_URL` to the API's address.

## Assumptions and limits

- Auth is deliberately basic. There is no email verification, password reset or OAuth.
- The panels on the Workflow tab for scoring, tagging, outcome quizzes, variables and hidden fields are saved in the browser only. They do not change how responses are stored or scored. Only the logic jumps are real.
- Only Universal mode exists in the builder. Team sharing, payments and the billing screens are placeholders.
- Contact-sales and newsletter submissions are stored in the database and no email is sent.
- Logic jumps only go forward, and the first matching rule wins.
- Typeform's licensed fonts (TWK Lausanne, Tobias) are replaced by Hanken Grotesk and Newsreader, self-hosted through `@fontsource`. The builder uses Inter, Karla, Space Grotesk and Playfair Display from Google Fonts.
- The landing page uses Typeform's public marketing media (hero and section videos, posters, icons, logos) to reproduce the reference design for this exercise. The customer-logo marquee uses made-up company names. All code is original.
- The AI features need an API key to be live. Without one they fall back to built-in templates and canned answers.

## Original work

All the code here was written for this assignment, with AI assistance as the brief allows. No existing repository was copied.
