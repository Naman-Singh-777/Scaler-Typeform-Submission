"""Database engine / session setup (SQLite by default)."""
import os

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./typeform.db")
_is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if _is_sqlite else {}
)


@event.listens_for(engine, "connect")
def _enable_sqlite_fk(dbapi_conn, _record):
    # SQLite ignores FOREIGN KEY constraints (and ON DELETE CASCADE) unless asked.
    if _is_sqlite:
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
