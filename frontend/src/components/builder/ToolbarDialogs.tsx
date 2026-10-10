'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { useToast } from '../Toast';
import { api } from '@/lib/api';
import type { Builder } from '@/hooks/useBuilder';
import type { Form } from '@/lib/types';

/* ---------- Accessibility checker (draggable panel) ---------- */
const lum = (hex: string) => {
  const h = hex.replace('#', ''); const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

type Issue = { text: React.ReactNode; qid?: number };
type Section = { key: string; title: string; intro?: string; ok: { text: React.ReactNode }[]; issues: Issue[] };

export function a11ySections(form: Form): Section[] {
  const t = form.theme, qs = form.questions;
  const chk = (label: React.ReactNode, ratio: number, min: number): { ok: boolean; text: React.ReactNode } =>
    ({ ok: ratio >= min, text: ratio >= min ? label : <>{label} <em>(contrast {ratio.toFixed(1)}:1, needs {min}:1)</em></> });
  const colorChecks = [
    chk(<><b>Questions</b> have enough color contrast with <b>background</b>.</>, contrast(t.text, t.background), 4.5),
    chk(<><b>Answers</b> have enough color contrast with <b>background</b>.</>, contrast(t.answer, t.background), 3),
    chk(<><b>Buttons</b> have enough color contrast with <b>background</b>.</>, contrast(t.button, t.background), 3),
    chk(<><b>Button text</b> has enough color contrast with <b>button background</b>.</>, contrast(t.buttonText, t.button), 4.5),
  ];
  const content: Issue[] = [], other: Issue[] = [];
  const seen = new Map<string, number>();
  qs.forEach((q, i) => {
    const n = i + 1, title = q.title.trim();
    if (!title) content.push({ qid: q.id, text: <>Question {n} has no title.</> });
    else {
      if (seen.has(title.toLowerCase())) content.push({ qid: q.id, text: <>Question {n} repeats the title of question {seen.get(title.toLowerCase())}.</> });
      seen.set(title.toLowerCase(), n);
      if (title.length > 150) content.push({ qid: q.id, text: <>Question {n}’s title is very long. Shorter questions are easier to read.</> });
    }
    if (['multiple_choice', 'dropdown'].includes(q.type)) {
      if (q.choices.length < 2) other.push({ qid: q.id, text: <>Question {n} offers fewer than two choices.</> });
      const labels = q.choices.map((c) => c.label.trim().toLowerCase());
      if (new Set(labels).size !== labels.length) other.push({ qid: q.id, text: <>Question {n} has two choices with the same label.</> });
    }
  });
  if (form.welcome_enabled && !form.welcome_button.trim()) other.push({ text: <>The welcome screen button has no label.</> });
  if (!qs.length) other.push({ text: <>The form has no questions yet.</> });
  return [
    { key: 'color', title: 'Color', intro: 'Contrast between text, button, and background ensures your content is readable. Contrast ratio of 3:1 for graphics and large text, and 4.5 for small text.', ok: colorChecks.filter((c) => c.ok), issues: colorChecks.filter((c) => !c.ok) },
    { key: 'alt', title: 'Alt text', intro: 'Alternative text (Alt text) describes all non-text content for people with visual impairments.', ok: [], issues: [] },
    { key: 'content', title: 'Content', intro: 'Ensure your content is clear for everyone.', ok: [], issues: content },
    { key: 'other', title: 'Other', ok: [], issues: other },
  ];
}

export function AccessibilityPanel({ form, onClose, onSelect }: { form: Form; onClose: () => void; onSelect: (qid: number) => void }) {
  const [open, setOpen] = useState<string | null>('color');
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const secs = a11ySections(form);
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  const down = (e: React.PointerEvent) => { const r = box.current!.getBoundingClientRect(); drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); };
  const move = (e: React.PointerEvent) => { const d = drag.current; if (!d) return; setPos({ x: Math.max(0, Math.min(innerWidth - 120, e.clientX - d.dx)), y: Math.max(0, Math.min(innerHeight - 60, e.clientY - d.dy)) }); };
  return (
    <div ref={box} className="a11y" role="dialog" aria-label="Accessibility" style={pos ? { left: pos.x, top: pos.y, transform: 'none' } : undefined}>
      <header onPointerDown={down} onPointerMove={move} onPointerUp={() => (drag.current = null)}>
        <span className="grip" aria-hidden><Icon name="drag" size={16} stroke={1.5} /></span><b>Accessibility</b>
        <button aria-label="Close" onPointerDown={(e) => e.stopPropagation()} onClick={onClose}><Icon name="x" size={18} stroke={1.6} /></button>
      </header>
      <div className="a11y-body">
        {secs.map((s) => {
          const n = s.issues.length, on = open === s.key;
          return (
            <section key={s.key} className={on ? 'on' : ''}>
              <button className="a11y-h" aria-expanded={on} onClick={() => setOpen(on ? null : s.key)}>
                <span>{s.title}</span><i className={n ? 'bad' : ''}>{n ? `${n} issue${n > 1 ? 's' : ''}` : 'All clear!'}</i>
                <Icon name={on ? 'down' : 'up'} size={18} stroke={1.8} />
              </button>
              {on && (
                <div className="a11y-c">
                  {s.intro && <p>{s.intro}</p>}
                  {s.ok.map((o, i) => <div key={i} className="a11y-i ok"><Icon name="check" size={16} stroke={2} /><span>{o.text}</span></div>)}
                  {s.issues.map((o, i) => (
                    <button key={i} className="a11y-i bad" disabled={o.qid == null} onClick={() => o.qid != null && onSelect(o.qid)}>
                      <Icon name="info" size={16} stroke={1.8} /><span>{o.text}</span>
                    </button>
                  ))}
                  {!n && !s.ok.length && <p className="a11y-none">No issues found. Well done!</p>}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Version History ---------- */
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export function VersionHistory({ b, onClose }: { b: Builder; onClose: () => void }) {
  const toast = useToast();
  const id = b.form!.id;
  const [rows, setRows] = useState<{ id: number; created_at: string; title: string; question_count: number }[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  useEffect(() => { api.versions(id).then(setRows).catch(() => setRows([])); }, [id]);
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  const restore = async (vid: number) => {
    if (busy) return;
    setBusy(vid);
    try { await b.flushAll(); const f = await api.restoreVersion(id, vid); b.replaceForm(f); toast('Version restored'); onClose(); }
    catch (e: any) { setBusy(null); toast(e.message || 'Could not restore this version', 'error'); }
  };
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vh" role="dialog" aria-modal="true" aria-label="Version History">
        <header><h2>Version History</h2><button className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="x" size={20} stroke={1.6} /></button></header>
        <div className="vh-body">
          {rows === null ? <p className="vh-empty muted">Loading…</p> : rows.length === 0 ? (
            <div className="vh-empty"><Icon name="cycle" size={28} stroke={1.4} /><b>Go back in time with version history</b><span>Load recently published versions of your form, whenever you need</span></div>
          ) : (
            <ul className="vh-list">
              {rows.map((v, i) => (
                <li key={v.id}>
                  <div><b>{when(v.created_at)}</b>{i === 0 && <em>Latest</em>}<span>{v.title || 'Untitled'} · {v.question_count} question{v.question_count === 1 ? '' : 's'}</span></div>
                  <button className="btn sm" disabled={busy != null} onClick={() => restore(v.id)}>{busy === v.id ? 'Restoring…' : 'Restore'}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Translations (a paid-plan feature in the original; same gate here) ---------- */
export function TranslationsDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tr" role="dialog" aria-modal="true" aria-label="Translations">
        <header><h2>Translations</h2><button className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="x" size={20} stroke={1.6} /></button></header>
        <div className="tr-body">
          <svg width="150" height="90" viewBox="0 0 150 90" fill="none" stroke="#2b2b2b" strokeWidth="1.4" aria-hidden><path d="M40 78V14l44-6v70z" fill="#bfe5d8" /><path d="M84 8l20 6v64l-20 0" /><circle cx="62" cy="40" r="9" fill="#fff" /><path d="M56 40h12M62 31c-3 5-3 13 0 18M62 31c3 5 3 13 0 18" /><path d="M112 22l10-5M114 34h14M112 46l10 5" /></svg>
          <h3>Translate forms automatically with AI, or upload your own translations</h3>
          <p>Allow people to view and respond to any form in their own language.</p>
          <button className="btn tr-up" onClick={() => toast('Plans and billing are not part of this project', 'info')}><Icon name="diamond" size={16} stroke={1.8} />Upgrade plan</button>
          <small>Available on these plans: Business, Talent, Growth Flow, Growth Custom</small>
        </div>
      </div>
    </div>
  );
}
