"""Marketing-site endpoints: landing content, contact-sales and newsletter sign-ups."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ContactRequest, CustomerStory, IntegrationApp

router = APIRouter(prefix="/api", tags=["site"])


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    company: str = Field(default="", max_length=160)
    message: str = Field(default="", max_length=2000)


class NewsletterIn(BaseModel):
    email: EmailStr


@router.get("/site/content")
def content(db: Session = Depends(get_db)):
    stories = db.scalars(select(CustomerStory).order_by(CustomerStory.position)).all()
    apps = db.scalars(select(IntegrationApp).order_by(IntegrationApp.position)).all()
    return {
        "stories": [{"company": s.company, "quote": s.quote, "logo": s.logo} for s in stories],
        "integrations": [{"name": a.name, "logo": a.logo} for a in apps],
    }


@router.post("/contact-sales", status_code=201)
def contact_sales(body: ContactIn, db: Session = Depends(get_db)):
    db.add(ContactRequest(kind="sales", name=body.name.strip(), email=body.email.lower(), company=body.company.strip(), message=body.message.strip()))
    db.commit()
    return {"ok": True}


@router.post("/newsletter", status_code=201)
def newsletter(body: NewsletterIn, db: Session = Depends(get_db)):
    db.add(ContactRequest(kind="newsletter", email=body.email.lower()))
    db.commit()
    return {"ok": True}
