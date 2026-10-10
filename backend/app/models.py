"""SQLAlchemy models.

users 1─* forms 1─* questions 1─* choices
                 │            └─* logic_rules (jump_to -> questions)
                 └─* responses 1─* answers (-> questions)
"""
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, Integer, LargeBinary, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)  # null for the seeded demo creator
    forms: Mapped[list["Form"]] = relationship(back_populates="owner")


class AuthSession(Base):
    """Bearer-token session. Only the sha256 of the token is stored."""
    __tablename__ = "auth_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class CustomerStory(Base):
    """Marketing site: testimonial slider content."""
    __tablename__ = "customer_stories"
    id: Mapped[int] = mapped_column(primary_key=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    company: Mapped[str] = mapped_column(String(120))
    quote: Mapped[str] = mapped_column(String(300))
    logo: Mapped[str] = mapped_column(String(300))


class IntegrationApp(Base):
    """Marketing site: integrations marquee content."""
    __tablename__ = "integration_apps"
    id: Mapped[int] = mapped_column(primary_key=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    name: Mapped[str] = mapped_column(String(120))
    logo: Mapped[str] = mapped_column(String(300))


class ContactRequest(Base):
    """Marketing site: 'Contact sales' and newsletter sign-ups (kind = sales | newsletter)."""
    __tablename__ = "contact_requests"
    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(12), default="sales")
    name: Mapped[str] = mapped_column(String(120), default="")
    email: Mapped[str] = mapped_column(String(255))
    company: Mapped[str] = mapped_column(String(160), default="")
    message: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Form(Base):
    __tablename__ = "forms"
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200), default="My new form")
    slug: Mapped[str] = mapped_column(String(16), unique=True, index=True)  # public link id
    status: Mapped[str] = mapped_column(String(12), default="draft")  # draft | published
    theme: Mapped[dict] = mapped_column(JSON, default=dict)
    welcome_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    welcome_title: Mapped[str] = mapped_column(String(300), default="")
    welcome_description: Mapped[str] = mapped_column(Text, default="")
    welcome_button: Mapped[str] = mapped_column(String(60), default="Start")
    thankyou_title: Mapped[str] = mapped_column(String(300), default="Thanks for completing this form!")
    thankyou_description: Mapped[str] = mapped_column(Text, default="Now create your own — it's free.")
    views: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    owner: Mapped[User] = relationship(back_populates="forms")
    questions: Mapped[list["Question"]] = relationship(
        back_populates="form", cascade="all, delete-orphan", order_by="Question.position"
    )
    responses: Mapped[list["Response"]] = relationship(
        back_populates="form", cascade="all, delete-orphan", order_by="Response.started_at.desc()"
    )


class FormVersion(Base):
    """A snapshot of a form taken each time it is published (Version History in the builder)."""
    __tablename__ = "form_versions"
    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    snapshot: Mapped[dict] = mapped_column(JSON, default=dict)


class Question(Base):
    __tablename__ = "questions"
    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    type: Mapped[str] = mapped_column(String(24))
    title: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(Text, default="")
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    settings: Mapped[dict] = mapped_column(JSON, default=dict)  # placeholder, steps, min, max, allow_multiple

    form: Mapped[Form] = relationship(back_populates="questions")
    choices: Mapped[list["Choice"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="Choice.position"
    )
    rules: Mapped[list["LogicRule"]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="LogicRule.position",
        foreign_keys="LogicRule.question_id",
    )


class Choice(Base):
    __tablename__ = "choices"
    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    label: Mapped[str] = mapped_column(String(300))
    question: Mapped[Question] = relationship(back_populates="choices")


class LogicRule(Base):
    """'If this question's answer <op> <value>, then jump to <target> (or end the form)'."""

    __tablename__ = "logic_rules"
    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    op: Mapped[str] = mapped_column(String(20))  # equals | not_equals | contains | greater_than | less_than
    value: Mapped[str] = mapped_column(String(300), default="")
    action: Mapped[str] = mapped_column(String(8), default="jump")  # jump | end
    target_question_id: Mapped[int | None] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), nullable=True
    )
    question: Mapped[Question] = relationship(back_populates="rules", foreign_keys=[question_id])


class Response(Base):
    __tablename__ = "responses"
    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(12), default="partial")  # partial | completed
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    form: Mapped[Form] = relationship(back_populates="responses")
    answers: Mapped[list["Answer"]] = relationship(back_populates="response", cascade="all, delete-orphan")


class Answer(Base):
    __tablename__ = "answers"
    __table_args__ = (UniqueConstraint("response_id", "question_id"), Index("ix_answers_question", "question_id"))
    id: Mapped[int] = mapped_column(primary_key=True)
    response_id: Mapped[int] = mapped_column(ForeignKey("responses.id", ondelete="CASCADE"))
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"))
    value: Mapped[object] = mapped_column(JSON)  # str | number | bool | list[str]
    response: Mapped[Response] = relationship(back_populates="answers")


class FileUpload(Base):
    """A file attached to a file_upload answer. Bytes live in the DB so no extra storage service is needed."""
    __tablename__ = "file_uploads"
    id: Mapped[int] = mapped_column(primary_key=True)
    response_id: Mapped[int] = mapped_column(ForeignKey("responses.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"))
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100), default="application/octet-stream")
    size: Mapped[int] = mapped_column(Integer)
    data: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Webhook(Base):
    """Connect: where a form's new responses are POSTed (kind = webhook | slack | zapier)."""
    __tablename__ = "webhooks"
    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(12), default="webhook")
    url: Mapped[str] = mapped_column(String(1000))
    last_status: Mapped[str] = mapped_column(String(120), default="")
    last_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
