"""Connect: webhooks (generic, Slack incoming-webhook and Zapier catch-hook). New completed responses are POSTed as JSON."""
import ipaddress
import socket
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import SessionLocal, get_db
from ..deps import get_owned_form
from ..models import Form, Response, Webhook, utcnow

router = APIRouter(prefix="/api", tags=["integrations"])

HOSTS = {"slack": "hooks.slack.com", "zapier": "zapier.com"}


class WebhookIn(BaseModel):
    kind: str = Field(default="webhook", pattern="^(webhook|slack|zapier)$")
    url: str = Field(min_length=8, max_length=1000)


def _check_url(kind: str, url: str) -> str:
    u = urlparse(url.strip())
    if u.scheme not in ("http", "https") or not u.hostname:
        raise HTTPException(422, "Enter a full http(s) URL")
    host = u.hostname.lower()
    need = HOSTS.get(kind)
    if need and not (host == need or host.endswith("." + need)):
        raise HTTPException(422, f"A {kind.title()} URL must be on {need}")
    try:  # SSRF guard: never call loopback / private / link-local addresses
        for info in socket.getaddrinfo(host, u.port or (443 if u.scheme == "https" else 80)):
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                raise HTTPException(422, "That address is not allowed")
    except socket.gaierror:
        raise HTTPException(422, "Could not resolve that host")
    return u.geturl()


def _out(w: Webhook) -> dict:
    return {"id": w.id, "kind": w.kind, "url": w.url, "last_status": w.last_status, "last_at": w.last_at}


def _payload(kind: str, form_title: str, form_id: int, response_id: int, rows: list[dict], at) -> dict:
    if kind == "slack":
        lines = "\n".join(f"*{r['question']}*: {r['answer']}" for r in rows) or "_No answers_"
        return {"text": f":incoming_envelope: New response to *{form_title}*\n{lines}"}
    return {"event": "form_response", "form": {"id": form_id, "title": form_title}, "response_id": response_id,
            "submitted_at": at.isoformat() if at else None, "answers": rows}


def _post(w: Webhook, body: dict) -> str:
    try:
        r = httpx.post(w.url, json=body, timeout=8, follow_redirects=False)
        return f"{r.status_code} {r.reason_phrase}"
    except Exception as e:  # network errors must never break a respondent's submit
        return f"failed: {type(e).__name__}"


def _rows(form: Form, resp: Response) -> list[dict]:
    by_q = {a.question_id: a.value for a in resp.answers}
    out = []
    for q in sorted(form.questions, key=lambda q: q.position):
        if q.id in by_q:
            v = by_q[q.id]
            if isinstance(v, dict) and "name" in v:
                v = v["name"]
            out.append({"question": q.title, "type": q.type, "answer": ", ".join(map(str, v)) if isinstance(v, list) else v})
    return out


def deliver_response(form_id: int, response_id: int) -> None:
    """Background task run after a respondent submits."""
    with SessionLocal() as db:
        form, resp = db.get(Form, form_id), db.get(Response, response_id)
        if not form or not resp:
            return
        rows = _rows(form, resp)
        for w in db.scalars(select(Webhook).where(Webhook.form_id == form_id)).all():
            w.last_status, w.last_at = _post(w, _payload(w.kind, form.title, form.id, resp.id, rows, resp.submitted_at)), utcnow()
        db.commit()


@router.get("/forms/{form_id}/webhooks")
def list_webhooks(form=Depends(get_owned_form), db: Session = Depends(get_db)):
    return [_out(w) for w in db.scalars(select(Webhook).where(Webhook.form_id == form.id).order_by(Webhook.id)).all()]


@router.post("/forms/{form_id}/webhooks", status_code=201)
def add_webhook(body: WebhookIn, form=Depends(get_owned_form), db: Session = Depends(get_db)):
    if len(db.scalars(select(Webhook.id).where(Webhook.form_id == form.id)).all()) >= 10:
        raise HTTPException(422, "You can add up to 10 connections per form")
    w = Webhook(form_id=form.id, kind=body.kind, url=_check_url(body.kind, body.url))
    db.add(w)
    db.commit()
    return _out(w)


def _owned_webhook(webhook_id: int, db: Session, user) -> Webhook:
    w = db.get(Webhook, webhook_id)
    if not w or db.get(Form, w.form_id).owner_id != user.id:
        raise HTTPException(404, "Connection not found")
    return w


from ..deps import current_user  # noqa: E402


@router.delete("/webhooks/{webhook_id}", status_code=204)
def delete_webhook(webhook_id: int, db: Session = Depends(get_db), user=Depends(current_user)):
    db.delete(_owned_webhook(webhook_id, db, user))
    db.commit()


@router.post("/webhooks/{webhook_id}/test")
def test_webhook(webhook_id: int, db: Session = Depends(get_db), user=Depends(current_user)):
    w = _owned_webhook(webhook_id, db, user)
    form = db.get(Form, w.form_id)
    sample = [{"question": "Sample question", "type": "short_text", "answer": "Sample answer"}]
    w.last_status, w.last_at = _post(w, _payload(w.kind, form.title, form.id, 0, sample, utcnow())), utcnow()
    db.commit()
    return _out(w)
