"""Public (no auth) respondent API."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..logic import compute_path, validate_answer
from ..models import Answer, FileUpload, Form, Response, utcnow
from ..schemas import AnswersIn, FormOut

router = APIRouter(prefix="/api/public", tags=["public"])


def _published(slug: str, db: Session) -> Form:
    form = db.scalar(select(Form).where(Form.slug == slug, Form.status == "published"))
    if not form:
        raise HTTPException(404, "This form is not available")
    return form


@router.get("/forms/{slug}", response_model=FormOut)
def get_public_form(slug: str, db: Session = Depends(get_db)):
    form = _published(slug, db)
    form.views += 1
    db.commit()
    return form


@router.post("/forms/{slug}/responses", status_code=201)
def start_response(slug: str, db: Session = Depends(get_db)):
    """Called when the respondent starts — lets the creator track partial responses."""
    form = _published(slug, db)
    r = Response(form_id=form.id)
    db.add(r)
    db.commit()
    return {"id": r.id}


@router.post("/forms/{slug}/responses/{response_id}/submit", status_code=201)
def submit_response(slug: str, response_id: int, body: AnswersIn, db: Session = Depends(get_db)):
    form = _published(slug, db)
    resp = db.scalar(select(Response).where(Response.id == response_id, Response.form_id == form.id))
    if not resp:
        raise HTTPException(404, "Response not found")
    if resp.status == "completed":
        raise HTTPException(409, "This response was already submitted")

    errors, clean = {}, {}
    for q in compute_path(form.questions, body.answers):  # only validate questions the respondent actually saw
        value, err = validate_answer(q, body.answers.get(q.id))
        if err:
            errors[q.id] = err
        elif value is not None:
            clean[q.id] = value
    if errors:
        raise HTTPException(422, detail={"message": "Some answers need your attention", "errors": errors})

    types = {q.id: q.type for q in form.questions}
    for qid, value in clean.items():
        if types.get(qid) == "file_upload":  # keep the bytes in file_uploads, the answer holds a small reference
            up = FileUpload(response_id=resp.id, question_id=qid, filename=value["name"], content_type=value["type"],
                            size=len(value["raw"]), data=value["raw"])
            db.add(up)
            db.flush()
            value = {"file_id": up.id, "name": up.filename, "size": up.size, "type": up.content_type}
        resp.answers.append(Answer(question_id=qid, value=value))
    resp.status, resp.submitted_at = "completed", utcnow()
    db.commit()
    return {"id": resp.id, "status": resp.status}
