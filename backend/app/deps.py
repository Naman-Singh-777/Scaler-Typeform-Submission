"""Shared dependencies.

Auth is deliberately light: a valid `Authorization: Bearer <token>` identifies the user; with no token the
seeded demo creator is used so the builder works without signing in (documented assumption).
"""
import hashlib
import random
import secrets
import string

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import AuthSession, Form, Question, User

DEFAULT_CREATOR_EMAIL = "creator@example.com"


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str | None) -> bool:
    if not stored or "$" not in stored:
        return False
    salt_hex, digest_hex = stored.split("$", 1)
    expected = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1)
    return secrets.compare_digest(expected.hex(), digest_hex)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    db.add(AuthSession(user_id=user.id, token_hash=token_hash(token)))
    db.commit()
    return token


def user_from_token(db: Session, authorization: str | None) -> User | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    sess = db.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash(authorization[7:].strip())))
    return db.get(User, sess.user_id) if sess else None


def current_user(db: Session = Depends(get_db), authorization: str | None = Header(default=None)) -> User:
    user = user_from_token(db, authorization)
    if user:
        return user
    user = db.scalar(select(User).where(User.email == DEFAULT_CREATOR_EMAIL))
    if not user:
        user = User(name="Demo Creator", email=DEFAULT_CREATOR_EMAIL)
        db.add(user)
        db.commit()
    return user


def get_owned_form(form_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)) -> Form:
    form = db.get(Form, form_id)
    if not form or form.owner_id != user.id:
        raise HTTPException(404, "Form not found")
    return form


def get_owned_question(question_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)) -> Question:
    q = db.get(Question, question_id)
    if not q or q.form.owner_id != user.id:
        raise HTTPException(404, "Question not found")
    return q


def new_slug(db: Session) -> str:
    alphabet = string.ascii_letters + string.digits
    while True:
        slug = "".join(random.choices(alphabet, k=8))
        if not db.scalar(select(Form.id).where(Form.slug == slug)):
            return slug
