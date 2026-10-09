// Client-side validation + branching. Mirrors backend/app/logic.py.
import type { Question, Rule } from './types';

export const END = -2;
export const isEmpty = (v: any) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export function validateAnswer(q: Question, v: any): string | null {
  if (isEmpty(v)) return q.required ? 'Please fill this in' : null;
  switch (q.type) {
    case 'email': return EMAIL_RE.test(String(v).trim()) ? null : 'Hmm... that email address looks invalid';
    case 'number': {
      const n = Number(v);
      if (String(v).trim() === '' || !Number.isFinite(n)) return 'Numbers only please!';
      const { min, max } = q.settings;
      if (typeof min === 'number' && n < min) return `Must be ${min} or greater`;
      if (typeof max === 'number' && n > max) return `Must be ${max} or less`;
      return null;
    }
    case 'short_text': return String(v).length > 2000 ? 'That answer is too long' : null;
    case 'long_text': return String(v).length > 10000 ? 'That answer is too long' : null;
    default: return null;
  }
}

const asStrings = (v: any): string[] => (typeof v === 'boolean' ? [v ? 'yes' : 'no'] : Array.isArray(v) ? v.map((x) => String(x).toLowerCase()) : [String(v).toLowerCase()]);

export function ruleMatches(r: Pick<Rule, 'op' | 'value'>, v: any): boolean {
  if (isEmpty(v)) return false;
  const t = r.value.trim().toLowerCase(), vals = asStrings(v);
  switch (r.op) {
    case 'equals': return vals.includes(t);
    case 'not_equals': return !vals.includes(t);
    case 'contains': return vals.some((x) => x.includes(t));
    default: {
      const a = parseFloat(vals[0]), b = parseFloat(t);
      if (Number.isNaN(a) || Number.isNaN(b)) return false;
      return r.op === 'greater_than' ? a > b : a < b;
    }
  }
}

/** Index of the next question to show after `i`, or END. */
export function nextIndex(qs: Question[], i: number, answers: Record<number, any>): number {
  for (const r of qs[i].rules) {
    if (!ruleMatches(r, answers[qs[i].id])) continue;
    if (r.action === 'end') return END;
    const t = qs.findIndex((x) => x.id === r.target_question_id);
    if (t > i) return t; // only forward jumps — keeps the flow acyclic
  }
  return i + 1 >= qs.length ? END : i + 1;
}
