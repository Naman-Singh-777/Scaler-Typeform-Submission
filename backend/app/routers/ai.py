"""AI: (1) generate form questions from a prompt, (2) the public 'Ty' chat assistant. Both call a real LLM.

Configure ONE of these on the server:
  ANTHROPIC_API_KEY [+ ANTHROPIC_MODEL]                       -> Anthropic Messages API
  LLM_API_KEY [+ LLM_BASE_URL, LLM_MODEL]                      -> any OpenAI-compatible API (default: Google Gemini's free tier)
Without a key the endpoints answer 503 and the frontend falls back to its built-in templates.
"""
import json
import os
import re
import time
from collections import defaultdict, deque

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from ..deps import current_user

router = APIRouter(prefix="/api/ai", tags=["ai"])

TYPES = ["short_text", "long_text", "multiple_choice", "dropdown", "email", "number", "yes_no", "rating", "file_upload"]


def provider() -> str | None:
    if os.getenv("ANTHROPIC_API_KEY"):
        return "anthropic"
    if os.getenv("LLM_API_KEY"):
        return "openai-compatible"
    return None


def ask_llm(system: str, messages: list[dict], max_tokens: int = 1200, temperature: float = 0.5) -> str:
    kind = provider()
    if not kind:
        raise HTTPException(503, "AI is not configured on the server")
    try:
        if kind == "anthropic":
            r = httpx.post("https://api.anthropic.com/v1/messages", timeout=40, headers={
                "x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01"}, json={
                "model": os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5"), "max_tokens": max_tokens, "temperature": temperature,
                "system": system, "messages": messages})
            r.raise_for_status()
            return "".join(b.get("text", "") for b in r.json()["content"])
        base = os.getenv("LLM_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai").rstrip("/")
        r = httpx.post(f"{base}/chat/completions", timeout=40, headers={"Authorization": f"Bearer {os.environ['LLM_API_KEY']}"}, json={
            "model": os.getenv("LLM_MODEL", "gemini-3.5-flash-lite"), "max_tokens": max_tokens, "temperature": temperature,
            "messages": [{"role": "system", "content": system}, *messages]})
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    except HTTPException:
        raise
    except Exception as e:
        # surface the upstream reason (never the key) so a bad key / model name is diagnosable
        why = ""
        resp = getattr(e, "response", None)
        if resp is not None:
            why = f" (upstream {resp.status_code}: {resp.text[:200]})"
        else:
            why = f" ({type(e).__name__})"
        print("LLM error" + why, flush=True)
        raise HTTPException(502, "The AI service did not respond. Please try again." + why)


@router.get("/status")
def status():
    return {"configured": provider() is not None, "provider": provider()}


# ---------------------------------------------------------------- form generation
class GenerateIn(BaseModel):
    prompt: str = Field(min_length=3, max_length=1200)
    existing: list[str] = Field(default_factory=list, max_length=40)


FORM_SYSTEM = f"""You design forms for a Typeform-style form builder. Reply with ONE JSON object and nothing else:
{{"title": "<short form title>", "questions": [{{"type": one of {TYPES}, "title": "<question, max 120 chars>", "description": "<optional helper text or empty>", "required": true|false, "choices": ["..."]}}]}}
Rules: 3-12 questions unless the user asks for a number; conversational, specific wording; "choices" only for multiple_choice and dropdown (3-8 short options);
use email for emails, number for quantities, rating for 1-5 satisfaction, yes_no for binary questions, file_upload only when a file is needed; first questions easy, sensitive ones last.
Never include markdown or commentary. Do not repeat questions the form already has."""


def _json_from(text: str) -> dict:
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    m = re.search(r"\{.*\}", text, re.S)
    return json.loads(m.group(0) if m else text)


def clean_questions(raw: list) -> list[dict]:
    out = []
    for q in raw[:15]:
        if not isinstance(q, dict) or q.get("type") not in TYPES or not str(q.get("title", "")).strip():
            continue
        item = {"type": q["type"], "title": str(q["title"]).strip()[:200], "description": str(q.get("description") or "").strip()[:300],
                "required": bool(q.get("required"))}
        if q["type"] in ("multiple_choice", "dropdown"):
            ch = [str(c).strip()[:120] for c in (q.get("choices") or []) if str(c).strip()][:10]
            item["choices"] = ch if len(ch) >= 2 else ["Option 1", "Option 2", "Option 3"]
        out.append(item)
    return out


@router.post("/generate-form")
def generate_form(body: GenerateIn, _user=Depends(current_user)):
    ctx = f"\nThe form already has these questions: {json.dumps(body.existing)}" if body.existing else ""
    text = ask_llm(FORM_SYSTEM, [{"role": "user", "content": body.prompt + ctx}], max_tokens=2000, temperature=0.4)
    try:
        data = _json_from(text)
        qs = clean_questions(data.get("questions", []))
    except Exception:
        raise HTTPException(502, "The AI returned something I could not read. Please try again.")
    if not qs:
        raise HTTPException(502, "The AI did not produce any usable questions. Try rephrasing.")
    return {"title": str(data.get("title") or "")[:120], "questions": qs}


# ---------------------------------------------------------------- Ty chat (public, rate-limited)
class Msg(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=1000)


class ChatIn(BaseModel):
    messages: list[Msg] = Field(min_length=1, max_length=14)


TY_SYSTEM = """You are Ty, the friendly assistant on the Typeform-clone landing page. This product lets people build conversational forms
(one question at a time) with 9 question types (short text, long text, multiple choice, dropdown, email, number, yes/no, rating, file upload),
drag-and-drop reordering, required toggles, logic jumps, themes and dark mode, a live preview, publishing to a shareable link, results with a
response table, per-question stats, completion rate and CSV export, plus an AI helper that drafts forms from a prompt. Signing up is free.
Answer in 1-4 short sentences, plainly. If asked something unrelated, answer briefly and steer back. Never invent prices or features not listed;
for pricing or enterprise questions say you are not sure and suggest "Contact sales". Do not claim to be human."""

_hits: dict[str, deque] = defaultdict(deque)


@router.post("/chat")
def chat(body: ChatIn, request: Request):
    ip = request.client.host if request.client else "?"
    q, now = _hits[ip], time.time()
    while q and now - q[0] > 600:
        q.popleft()
    if len(q) >= 30:
        raise HTTPException(429, "You are sending messages too quickly. Please wait a moment.")
    q.append(now)
    msgs = [{"role": m.role, "content": m.content} for m in body.messages]
    if msgs[0]["role"] != "user":
        msgs = msgs[1:] or msgs
    return {"reply": ask_llm(TY_SYSTEM, msgs, max_tokens=400, temperature=0.6).strip()}
