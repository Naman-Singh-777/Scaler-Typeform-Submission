"""Sign up / log in / me. Passwords are hashed with scrypt; sessions are opaque bearer tokens."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import create_session, current_user, hash_password, verify_password
from ..models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignupIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


def _out(user: User, token: str | None = None) -> dict:
    data = {"id": user.id, "email": user.email, "name": user.name}
    return {"token": token, "user": data} if token else data


@router.post("/signup", status_code=201)
def signup(body: SignupIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(409, "An account with this email already exists")
    user = User(name=body.name.strip(), email=email, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    return _out(user, create_session(db, user))


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")
    return _out(user, create_session(db, user))


@router.get("/me")
def me(user: User = Depends(current_user)):
    return _out(user)
