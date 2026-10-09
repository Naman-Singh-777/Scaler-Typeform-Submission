import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, SessionLocal, engine
from .routers import ai, auth, forms, integrations, public, results, site
from .seed import ensure_demo_account, seed_if_empty, seed_site_content


def _add_missing_columns() -> None:
    """create_all never alters existing tables, so older SQLite files get the new users.password_hash column here."""
    if not str(engine.url).startswith("sqlite"):
        return
    with engine.begin() as conn:
        cols = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(users)")}
        if cols and "password_hash" not in cols:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(engine)
    _add_missing_columns()
    with SessionLocal() as db:
        seed_if_empty(db)
        ensure_demo_account(db)
        seed_site_content(db)
    yield


app = FastAPI(title="Typeform Clone API", version="1.0.0", lifespan=lifespan)
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])

app.include_router(auth.router)
app.include_router(site.router)
app.include_router(forms.router)
app.include_router(results.router)
app.include_router(public.router)
app.include_router(integrations.router)
app.include_router(ai.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
