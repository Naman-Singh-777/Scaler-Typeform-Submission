// Client-side validation + branching. Mirrors backend/app/logic.py.
import type { Question, Rule } from './types';
import { makeT } from './formSettings';

export const END = -2;
export const MAX_UPLOAD = 5 * 1024 * 1024; // keep in sync with backend MAX_UPLOAD_BYTES
export const isEmpty = (v: any) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export function validateAnswer(q: Question, v: any, t: ReturnType<typeof makeT> = makeT()): string | null {
  if (isEmpty(v)) return q.required ? t(['multiple_choice', 'dropdown', 'yes_no', 'rating'].includes(q.type) ? 'err_selection' : 'err_required') : null;
  switch (q.type) {
    case 'email': return EMAIL_RE.test(String(v).trim()) ? null : t('err_email');
    case 'number': {
      const n = Number(v);
      if (String(v).trim() === '' || !Number.isFinite(n)) return t('err_number');
      const { min, max } = q.settings;
      const lo = typeof min === 'number' && n < min, hi = typeof max === 'number' && n > max;
      if (lo || hi) return typeof min === 'number' && typeof max === 'number' ? t('err_number_range', { min_value: min, max_value: max }) : lo ? t('err_number_low', { min_value: min }) : t('err_number_high', { max_value: max });
      return null;
    }
    case 'short_text': return String(v).length > 2000 ? 'That answer is too long' : null;
    case 'long_text': return String(v).length > 10000 ? 'That answer is too long' : null;
    case 'file_upload': return v && v.size > MAX_UPLOAD ? 'Files must be 5 MB or smaller' : null;
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
