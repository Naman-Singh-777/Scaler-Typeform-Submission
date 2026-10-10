"""Answer validation + branching logic (mirrors frontend/src/lib/logic.ts)."""
import base64
import binascii
import re
from typing import Any

from .models import Question

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")
CHOICE_TYPES = ("multiple_choice", "dropdown")
DEFAULT_SETTINGS: dict[str, dict[str, Any]] = {
    "short_text": {"placeholder": "Type your answer here..."},
    "long_text": {"placeholder": "Type your answer here..."},
    "email": {"placeholder": "name@example.com"},
    "number": {"placeholder": "Type a number here..."},
    "multiple_choice": {"allow_multiple": False},
    "dropdown": {"placeholder": "Type or select an option"},
    "rating": {"steps": 5},
    "yes_no": {},
    "file_upload": {},
}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB per file


def clean_settings(qtype: str, raw: dict[str, Any] | None) -> dict[str, Any]:
    """Keep only the settings keys that make sense for the type."""
    raw = raw or {}
    out = dict(DEFAULT_SETTINGS.get(qtype, {}))
    if "placeholder" in out and isinstance(raw.get("placeholder"), str):
        out["placeholder"] = raw["placeholder"][:200]
    if qtype == "multiple_choice":
        out["allow_multiple"] = bool(raw.get("allow_multiple", False))
    if qtype == "rating":
        steps = raw.get("steps", 5)
        out["steps"] = steps if isinstance(steps, int) and 3 <= steps <= 10 else 5
    if qtype == "number":
        for k in ("min", "max"):
            v = raw.get(k)
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                out[k] = v
    return out


def validate_answer(q: Question, value: Any) -> tuple[Any, str | None]:
    """Return (clean_value, error). `clean_value` is None when the answer is empty."""
    empty = value is None or value == "" or value == []
    if empty:
        return None, ("This field is required" if q.required else None)

    t = q.type
    if t in ("short_text", "long_text"):
        if not isinstance(value, str):
            return None, "Please enter text"
        value = value.strip()
        if not value:
            return None, "This field is required" if q.required else None
        if len(value) > (10000 if t == "long_text" else 2000):
            return None, "That answer is too long"
        return value, None
    if t == "email":
        if not isinstance(value, str) or not EMAIL_RE.match(value.strip()):
            return None, "Hmm... that email address looks invalid"
        return value.strip(), None
    if t == "number":
        if isinstance(value, bool):
            return None, "Numbers only please!"
        try:
            num = float(value)
        except (TypeError, ValueError):
            return None, "Numbers only please!"
        if num != num or num in (float("inf"), float("-inf")):
            return None, "Numbers only please!"
        lo, hi = q.settings.get("min"), q.settings.get("max")
        if lo is not None and num < lo:
            return None, f"Must be {lo} or greater"
        if hi is not None and num > hi:
            return None, f"Must be {hi} or less"
        return (int(num) if num.is_integer() else num), None
    if t == "yes_no":
        if not isinstance(value, bool):
            return None, "Please choose Yes or No"
        return value, None
    if t == "rating":
        steps = q.settings.get("steps", 5)
        if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= steps:
            return None, f"Please pick a rating from 1 to {steps}"
        return value, None
    if t in CHOICE_TYPES:
        labels = {c.label for c in q.choices}
        if t == "multiple_choice" and q.settings.get("allow_multiple"):
            vals = value if isinstance(value, list) else [value]
            if not all(isinstance(v, str) and v in labels for v in vals):
                return None, "Please choose from the options"
            return list(dict.fromkeys(vals)), None
        if not isinstance(value, str) or value not in labels:
            return None, "Please choose from the options"
        return value, None
    if t == "file_upload":
        # the respondent sends {name, type, data(base64)}; submit stores the bytes and replaces it by a file reference
        if not isinstance(value, dict):
            return None, "Please choose a file"
        if "file_id" in value:
            return value, None
        name = str(value.get("name") or "file")[:255]
        try:
            raw = base64.b64decode(str(value.get("data") or ""), validate=True)
        except (binascii.Error, ValueError):
            return None, "That file could not be read"
        if not raw:
            return None, "That file is empty"
        if len(raw) > MAX_UPLOAD_BYTES:
            return None, "Files must be 5 MB or smaller"
        return {"name": name, "type": str(value.get("type") or "application/octet-stream")[:100], "raw": raw}, None
    return None, "Unsupported question type"


def _as_strings(value: Any) -> list[str]:
    if isinstance(value, bool):
        return ["yes" if value else "no"]
    if isinstance(value, list):
        return [str(v).lower() for v in value]
    return [str(value).lower()]


def rule_matches(rule, value: Any) -> bool:
    if value is None:
        return False
    target = rule.value.strip().lower()
    vals = _as_strings(value)
    if rule.op == "equals":
        return target in vals
    if rule.op == "not_equals":
        return target not in vals
    if rule.op == "contains":
        return any(target in v for v in vals)
    try:
        num, ref = float(vals[0]), float(target)
    except ValueError:
        return False
    return num > ref if rule.op == "greater_than" else num < ref


def compute_path(questions: list[Question], answers: dict[int, Any]) -> list[Question]:
    """Questions a respondent would have seen given `answers`, following jump rules."""
    by_id = {q.id: i for i, q in enumerate(questions)}
    path, seen, i = [], set(), 0
    while i < len(questions) and i not in seen:
        seen.add(i)
        q = questions[i]
        path.append(q)
        nxt = i + 1
        for r in q.rules:
            if rule_matches(r, answers.get(q.id)):
                nxt = len(questions) if r.action == "end" else by_id.get(r.target_question_id, nxt)
                break
        i = nxt
    return path


BOOL_SETTINGS = ("nav_arrows", "progress_bar", "question_number", "asterisks", "letters", "autosave", "free_nav",
                 "cookie_consent", "accepting", "notify")


def clean_form_settings(raw: dict[str, Any] | None) -> dict[str, Any]:
    """Keep only the flags and system messages the Form settings dialog knows about."""
    raw = raw or {}
    out: dict[str, Any] = {k: bool(raw[k]) for k in BOOL_SETTINGS if k in raw}
    msgs = raw.get("messages")
    if isinstance(msgs, dict):
        out["messages"] = {str(k)[:40]: str(v)[:300] for k, v in list(msgs.items())[:40] if re.fullmatch(r"[a-z_]+", str(k))}
    return out
