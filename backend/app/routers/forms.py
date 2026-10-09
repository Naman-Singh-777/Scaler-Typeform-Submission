"""Creator-facing CRUD: forms and their questions."""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import current_user, get_owned_form, get_owned_question, new_slug
from ..logic import CHOICE_TYPES, clean_settings
from ..models import Choice, Form, LogicRule, Question, Response as FormResponse, User, utcnow
from ..schemas import (
    FormCreate, FormListItem, FormOut, FormPatch, QuestionCreate, QuestionOut, QuestionPatch, ReorderIn,
)

router = APIRouter(prefix="/api", tags=["forms"])

DEFAULT_THEME = {
    "preset": "classic", "background": "#FFFFFF", "text": "#262627", "answer": "#0445AF",
    "button": "#0445AF", "buttonText": "#FFFFFF", "font": "Karla",
}


# ---------- helpers ----------
def _new_question(form: Form, qtype: str, position: int) -> Question:
    q = Question(form=form, position=position, type=qtype, title="", description="", required=False,
                 settings=clean_settings(qtype, {}))
    if qtype in CHOICE_TYPES:
        q.choices = [Choice(position=i, label=f"Choice {i + 1}") for i in range(3)]
    return q


def _renumber(form: Form) -> None:
    for i, q in enumerate(sorted(form.questions, key=lambda x: x.position)):
        q.position = i


def _copy_question(src: Question, dst_form: Form, position: int) -> Question:
    q = Question(form=dst_form, position=position, type=src.type, title=src.title,
                 description=src.description, required=src.required, settings=dict(src.settings))
    q.choices = [Choice(position=c.position, label=c.label) for c in src.choices]
    return q


# ---------- forms ----------
@router.get("/forms", response_model=list[FormListItem])
def list_forms(db: Session = Depends(get_db), user: User = Depends(current_user)):
    forms = db.scalars(select(Form).where(Form.owner_id == user.id).order_by(Form.updated_at.desc())).all()
    counts = dict(db.execute(
        select(FormResponse.form_id, func.count()).where(FormResponse.status == "completed").group_by(FormResponse.form_id)
    ).all())
    started = dict(db.execute(select(FormResponse.form_id, func.count()).group_by(FormResponse.form_id)).all())
    return [FormListItem(id=f.id, title=f.title, slug=f.slug, status=f.status, question_count=len(f.questions),
                         response_count=counts.get(f.id, 0), started_count=started.get(f.id, 0),
                         theme=f.theme, updated_at=f.updated_at) for f in forms]


@router.post("/forms", response_model=FormOut, status_code=201)
def create_form(body: FormCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    form = Form(owner=user, title=body.title.strip() or "My new form", slug=new_slug(db), theme=DEFAULT_THEME)
    _new_question(form, "short_text", 0)
    db.add(form)
    db.commit()
    return form


@router.get("/forms/{form_id}", response_model=FormOut)
def get_form(form: Form = Depends(get_owned_form)):
    return form


@router.patch("/forms/{form_id}", response_model=FormOut)
def update_form(body: FormPatch, form: Form = Depends(get_owned_form), db: Session = Depends(get_db)):
    for key, val in body.model_dump(exclude_unset=True).items():
        if val is not None:
            setattr(form, key, val)
    form.updated_at = utcnow()
    db.commit()
    return form


@router.delete("/forms/{form_id}", status_code=204)
def delete_form(form: Form = Depends(get_owned_form), db: Session = Depends(get_db)):
    db.delete(form)
    db.commit()
    return Response(status_code=204)


@router.post("/forms/{form_id}/duplicate", response_model=FormOut, status_code=201)
def duplicate_form(form: Form = Depends(get_owned_form), db: Session = Depends(get_db)):
    copy = Form(
        owner_id=form.owner_id, title=f"{form.title} (copy)"[:200], slug=new_slug(db), status="draft",
        theme=dict(form.theme), welcome_enabled=form.welcome_enabled, welcome_title=form.welcome_title,
        welcome_description=form.welcome_description, welcome_button=form.welcome_button,
        thankyou_title=form.thankyou_title, thankyou_description=form.thankyou_description,
    )
    id_map: dict[int, Question] = {}
    for q in form.questions:
        id_map[q.id] = _copy_question(q, copy, q.position)
    db.add(copy)
    db.flush()
    for q in form.questions:  # re-create logic rules, pointing at the copied questions
        for r in q.rules:
            tgt = id_map.get(r.target_question_id)
            db.add(LogicRule(question_id=id_map[q.id].id, position=r.position, op=r.op, value=r.value,
                             action=r.action, target_question_id=tgt.id if tgt else None))
    db.commit()
    return copy


@router.post("/forms/{form_id}/publish", response_model=FormOut)
def publish_form(form: Form = Depends(get_owned_form), db: Session = Depends(get_db)):
    if not form.questions:
        raise HTTPException(422, "Add at least one question before publishing")
    for i, q in enumerate(form.questions, 1):
        if not q.title.strip():
            raise HTTPException(422, f"Question {i} needs a title before you can publish")
        if q.type in CHOICE_TYPES and not any(c.label.strip() for c in q.choices):
            raise HTTPException(422, f"Question {i} needs at least one choice")
    form.status = "published"
    form.published_at = form.published_at or utcnow()
    db.commit()
    return form


@router.post("/forms/{form_id}/unpublish", response_model=FormOut)
def unpublish_form(form: Form = Depends(get_owned_form), db: Session = Depends(get_db)):
    form.status = "draft"
    db.commit()
    return form


# ---------- questions ----------
@router.post("/forms/{form_id}/questions", response_model=QuestionOut, status_code=201)
def add_question(body: QuestionCreate, form: Form = Depends(get_owned_form), db: Session = Depends(get_db)):
    idx = len(form.questions) if body.index is None else max(0, min(body.index, len(form.questions)))
    for q in form.questions:
        if q.position >= idx:
            q.position += 1
    q = _new_question(form, body.type, idx)
    db.add(q)
    db.commit()
    return q


@router.patch("/questions/{question_id}", response_model=QuestionOut)
def update_question(body: QuestionPatch, q: Question = Depends(get_owned_question), db: Session = Depends(get_db)):
    data = body.model_dump(exclude_unset=True)
    for key in ("title", "description", "required"):
        if data.get(key) is not None:
            setattr(q, key, data[key])
    if data.get("type"):
        q.type = data["type"]
        if q.type in CHOICE_TYPES and not q.choices and "choices" not in data:
            q.choices = [Choice(position=i, label=f"Choice {i + 1}") for i in range(3)]
    if "settings" in data and data["settings"] is not None or "type" in data:
        q.settings = clean_settings(q.type, data.get("settings") or q.settings)
    if data.get("choices") is not None:
        q.choices = [Choice(position=i, label=c["label"]) for i, c in enumerate(c for c in data["choices"] if c["label"].strip())]
    if data.get("rules") is not None:
        valid_ids = {x.id for x in q.form.questions if x.id != q.id}
        q.rules = [
            LogicRule(position=i, op=r["op"], value=r["value"], action=r["action"],
                      target_question_id=r["target_question_id"] if r["action"] == "jump" else None)
            for i, r in enumerate(data["rules"])
            if r["action"] == "end" or r["target_question_id"] in valid_ids
        ]
    q.form.updated_at = utcnow()
    db.commit()
    return q


@router.delete("/questions/{question_id}", status_code=204)
def delete_question(q: Question = Depends(get_owned_question), db: Session = Depends(get_db)):
    form = q.form
    db.delete(q)
    db.flush()
    db.refresh(form)
    _renumber(form)
    form.updated_at = utcnow()
    db.commit()
    return Response(status_code=204)


@router.post("/questions/{question_id}/duplicate", response_model=QuestionOut, status_code=201)
def duplicate_question(q: Question = Depends(get_owned_question), db: Session = Depends(get_db)):
    form = q.form
    for other in form.questions:
        if other.position > q.position:
            other.position += 1
    copy = _copy_question(q, form, q.position + 1)
    db.add(copy)
    db.commit()
    return copy


@router.put("/forms/{form_id}/questions/order", response_model=list[QuestionOut])
def reorder_questions(body: ReorderIn, form: Form = Depends(get_owned_form), db: Session = Depends(get_db)):
    current = {q.id: q for q in form.questions}
    if sorted(body.question_ids) != sorted(current):
        raise HTTPException(422, "question_ids must contain every question of the form exactly once")
    for pos, qid in enumerate(body.question_ids):
        current[qid].position = pos
    form.updated_at = utcnow()
    db.commit()
    db.refresh(form)
    return form.questions
