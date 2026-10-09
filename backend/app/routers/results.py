"""Creator-facing results: responses list, single response, summary stats, CSV export."""
import csv
import io
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import get_owned_form
from ..models import Answer, Form, Response
from ..schemas import ResponseOut, ResponsePage

router = APIRouter(prefix="/api/forms/{form_id}", tags=["results"])


def _out(r: Response) -> ResponseOut:
    return ResponseOut(id=r.id, status=r.status, started_at=r.started_at, submitted_at=r.submitted_at,
                       answers={a.question_id: a.value for a in r.answers})


def _query(form: Form, status: str | None):
    stmt = select(Response).where(Response.form_id == form.id).options(selectinload(Response.answers))
    if status in ("completed", "partial"):
        stmt = stmt.where(Response.status == status)
    return stmt.order_by(Response.started_at.desc())


@router.get("/responses", response_model=ResponsePage)
def list_responses(
    status: str | None = Query(None, pattern="^(completed|partial)$"),
    limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
    form: Form = Depends(get_owned_form), db: Session = Depends(get_db),
):
    base = _query(form, status)
    total = db.scalar(select(func.count()).select_from(base.order_by(None).options().subquery()))
    rows = db.scalars(base.limit(limit).offset(offset)).all()
    return ResponsePage(total=total, items=[_out(r) for r in rows])


@router.get("/responses/export.csv")
def export_csv(form: Form = Depends(get_owned_form), db: Session = Depends(get_db)):
    rows = db.scalars(_query(form, "completed")).all()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Response ID", "Submitted at (UTC)"] + [q.title or f"Question {i}" for i, q in enumerate(form.questions, 1)])

    def cell(v):
        if v is None:
            return ""
        if isinstance(v, bool):
            return "Yes" if v else "No"
        s = "; ".join(map(str, v)) if isinstance(v, list) else str(v)
        return "'" + s if s[:1] in ("=", "+", "-", "@") else s  # neutralise CSV/formula injection

    for r in rows:
        ans = {a.question_id: a.value for a in r.answers}
        w.writerow([r.id, r.submitted_at.isoformat(sep=" ", timespec="seconds") if r.submitted_at else ""]
                   + [cell(ans.get(q.id)) for q in form.questions])
    buf.seek(0)
    name = "".join(c if c.isalnum() else "_" for c in form.title)[:40] or "form"
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f'attachment; filename="{name}_responses.csv"'})


@router.get("/responses/{response_id}", response_model=ResponseOut)
def get_response(response_id: int, form: Form = Depends(get_owned_form), db: Session = Depends(get_db)):
    r = db.scalar(select(Response).where(Response.id == response_id, Response.form_id == form.id)
                  .options(selectinload(Response.answers)))
    if not r:
        raise HTTPException(404, "Response not found")
    return _out(r)


@router.delete("/responses/{response_id}", status_code=204)
def delete_response(response_id: int, form: Form = Depends(get_owned_form), db: Session = Depends(get_db)):
    r = db.scalar(select(Response).where(Response.id == response_id, Response.form_id == form.id))
    if not r:
        raise HTTPException(404, "Response not found")
    db.delete(r)
    db.commit()


@router.get("/summary")
def summary(form: Form = Depends(get_owned_form), db: Session = Depends(get_db)):
    started = db.scalar(select(func.count()).where(Response.form_id == form.id)) or 0
    completed = db.scalar(select(func.count()).where(Response.form_id == form.id, Response.status == "completed")) or 0
    durations = db.execute(
        select(Response.started_at, Response.submitted_at).where(Response.form_id == form.id, Response.status == "completed")
    ).all()
    secs = [(b - a).total_seconds() for a, b in durations if b]
    values: dict[int, list] = {q.id: [] for q in form.questions}
    for qid, val in db.execute(
        select(Answer.question_id, Answer.value).join(Response).where(Response.form_id == form.id, Response.status == "completed")
    ):
        values.setdefault(qid, []).append(val)

    questions = []
    for q in form.questions:
        vals, item = values.get(q.id, []), {"id": q.id, "title": q.title, "type": q.type}
        item["answered"], item["skipped"] = len(vals), max(completed - len(vals), 0)
        if q.type in ("multiple_choice", "dropdown"):
            flat = [x for v in vals for x in (v if isinstance(v, list) else [v])]
            c = Counter(flat)
            item["counts"] = [{"label": ch.label, "count": c.get(ch.label, 0)} for ch in q.choices]
        elif q.type == "yes_no":
            item["counts"] = [{"label": "Yes", "count": sum(1 for v in vals if v is True)},
                              {"label": "No", "count": sum(1 for v in vals if v is False)}]
        elif q.type == "rating":
            steps = q.settings.get("steps", 5)
            c = Counter(vals)
            item["counts"] = [{"label": str(i), "count": c.get(i, 0)} for i in range(1, steps + 1)]
            item["average"] = round(sum(vals) / len(vals), 2) if vals else None
        elif q.type == "number":
            item.update(average=round(sum(vals) / len(vals), 2) if vals else None,
                        min=min(vals) if vals else None, max=max(vals) if vals else None)
        else:
            item["latest"] = [str(v) for v in vals[-5:]][::-1]
        questions.append(item)
    return {
        "views": form.views, "starts": started, "completions": completed,
        "completion_rate": round(100 * completed / started) if started else 0,
        "avg_time_seconds": round(sum(secs) / len(secs)) if secs else None,
        "questions": questions,
    }
