'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '../Icon';
import QuestionInput, { letter } from './QuestionInput';
import { api, ApiError } from '@/lib/api';
import { END, isEmpty, nextIndex, validateAnswer } from '@/lib/logic';
import { RunnerCtx, makeT, resolveSettings } from '@/lib/formSettings';
import { themeVars } from '@/lib/themes';
import type { Form, Question } from '@/lib/types';

const WELCOME = -1;
const AUTO_ADVANCE_MS = 380;

interface Props { form: Form; mode: 'live' | 'preview'; onClose?: () => void }

export default function FormRunner({ form, mode, onClose }: Props) {
  const fs = useMemo(() => ({ s: resolveSettings(form), t: makeT(form.settings?.messages, form.settings?.language) }), [form.settings]);
  const { s: S0, t } = fs;
  const bold = (txt: string) => txt.split(/\*([^*]+)\*/).map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p));
  const [cookie, setCookie] = useState<string | null>('yes');
  const saveKey = `tf_save_${form.slug}`;
  const qs = useMemo(() => form.questions.map((q) => ({ ...q, choices: q.choices.filter((c) => c.label.trim()) })), [form.questions]);
  const firstScreen = form.welcome_enabled ? WELCOME : qs.length ? 0 : END;
  const [cur, setCur] = useState(firstScreen);
  const [prev, setPrev] = useState<number | null>(null);
  const [dir, setDir] = useState<'next' | 'back'>('next');
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [history, setHistory] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const respId = useRef<number | null>(null);
  const started = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const S = useRef({ cur, answers, history });
  S.current = { cur, answers, history };

  const go = useCallback((to: number, d: 'next' | 'back') => {
    setPrev(S.current.cur); setCur(to); setDir(d); setError(null);
    S.current.cur = to;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPrev(null), 560);
  }, []);

  const ensureStarted = useCallback(() => {
    if (mode !== 'live' || started.current) return;
    started.current = true;
    api.startResponse(form.slug).then((r) => (respId.current = r.id)).catch(() => (started.current = false));
  }, [mode, form.slug]);

  useEffect(() => { if (cur >= 0) ensureStarted(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(timer.current), []);

  const submit = useCallback(async (ans: Record<number, any>) => {
    if (mode === 'preview') { go(END, 'next'); return; }
    setSubmitting(true);
    const payload: Record<number, any> = {};
    for (const q of qs) {
      const v = ans[q.id];
      if (isEmpty(v)) continue;
      payload[q.id] = q.type === 'number' ? Number(v) : v;
    }
    try {
      if (respId.current == null) respId.current = (await api.startResponse(form.slug)).id;
      await api.submit(form.slug, respId.current, payload);
      go(END, 'next');
    } catch (e) {
      const err = e as ApiError;
      const idx = err.errors ? qs.findIndex((q) => err.errors![String(q.id)]) : -1;
      if (idx >= 0) { go(idx, 'back'); setError(err.errors![String(qs[idx].id)]); }
      else setError(err.message || t('err_server'));
    } finally { setSubmitting(false); }
  }, [mode, qs, form.slug, go, t]);

  const advance = useCallback((ans: Record<number, any> = S.current.answers, free = false) => {
    const i = S.current.cur;
    if (i === WELCOME) { ensureStarted(); go(qs.length ? 0 : END, 'next'); return; }
    if (i < 0) return;
    const q = qs[i];
    const err = free ? null : validateAnswer(q, ans[q.id], t);
    if (err) { setError(err); return; }
    const nxt = nextIndex(qs, i, ans);
    if (nxt === END) { if (!free) submit(ans); return; }
    setHistory((h) => [...h, i]);
    go(nxt, 'next');
  }, [qs, go, submit, ensureStarted, t]);

  const back = useCallback(() => {
    const { cur: i, history: h } = S.current;
    if (i < 0) return;
    if (h.length) { setHistory(h.slice(0, -1)); go(h[h.length - 1], 'back'); }
    else if (form.welcome_enabled) go(WELCOME, 'back');
  }, [go, form.welcome_enabled]);

  const setAnswer = useCallback((q: Question, v: any, auto?: boolean) => {
    const next = { ...S.current.answers, [q.id]: v };
    S.current.answers = next;
    setAnswers(next); setError(null);
    const isLast = qs[qs.length - 1]?.id === q.id;
    if (auto && !isLast) {
      const at = S.current.cur;
      setTimeout(() => { if (S.current.cur === at) advance(next); }, AUTO_ADVANCE_MS);
    }
  }, [qs, advance]);

  // Keyboard: Enter / arrows / letter shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement;
      const tag = el.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      const i = S.current.cur;
      if (e.key === 'Enter') {
        if (tag === 'BUTTON' || (tag === 'TEXTAREA' && e.shiftKey) || i === END) return;
        e.preventDefault(); advance(); return;
      }
      if (e.key === 'ArrowDown' && tag !== 'TEXTAREA' && i !== END) { e.preventDefault(); advance(); return; }
      if (e.key === 'ArrowUp' && tag !== 'TEXTAREA' && i !== END) { e.preventDefault(); back(); return; }
      if (typing || i < 0 || e.key.length !== 1) return;
      const q = qs[i], k = e.key.toUpperCase();
      if (q.type === 'multiple_choice') {
        const c = q.choices[k.charCodeAt(0) - 65];
        if (!c) return;
        const multi = !!q.settings.allow_multiple, cur: string[] = S.current.answers[q.id] || [];
        if (multi) setAnswer(q, cur.includes(c.label) ? cur.filter((x) => x !== c.label) : [...cur, c.label]);
        else setAnswer(q, c.label, true);
      } else if (q.type === 'yes_no' && (k === 'Y' || k === 'N')) setAnswer(q, k === 'Y', true);
      else if (q.type === 'rating' && /[0-9]/.test(k)) {
        const n = k === '0' ? 10 : Number(k);
        if (n <= (q.settings.steps || 5)) setAnswer(q, n, true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [qs, advance, back, setAnswer]);

  const live = mode === 'live';
  useEffect(() => { // cookie choice + resume saved progress
    if (!live) return;
    let c: string | null = null;
    try { c = localStorage.getItem('tf_cookie'); } catch {}
    setCookie(S0.cookie_consent ? c : 'yes');
    if (!S0.autosave || (S0.cookie_consent && c !== 'yes')) return;
    try {
      const d = JSON.parse(localStorage.getItem(saveKey) || 'null');
      if (d && d.cur >= 0 && d.cur < qs.length) {
        S.current = { cur: d.cur, answers: d.answers || {}, history: d.history || [] };
        setAnswers(S.current.answers); setHistory(S.current.history); setCur(d.cur); ensureStarted();
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!live || !S0.autosave || (S0.cookie_consent && cookie !== 'yes')) return;
    try {
      if (cur === END) { localStorage.removeItem(saveKey); return; }
      if (cur < 0 && !Object.keys(answers).length) return;
      const plain = Object.fromEntries(Object.entries(answers).filter(([, v]) => !(typeof File !== 'undefined' && v instanceof File)));
      localStorage.setItem(saveKey, JSON.stringify({ cur, answers: plain, history }));
    } catch {}
  }, [cur, answers, history, cookie]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (v: 'yes' | 'no') => { setCookie(v); try { localStorage.setItem('tf_cookie', v); if (v === 'no') localStorage.removeItem(saveKey); } catch {} };

  const total = qs.length;
  const pct = cur === END ? 100 : cur === WELCOME ? 0 : Math.round((history.length / Math.max(total, 1)) * 100);
  const restart = () => {
    clearTimeout(timer.current);
    setAnswers({}); setHistory([]); setPrev(null); setError(null); setCur(firstScreen); S.current = { cur: firstScreen, answers: {}, history: [] };
  };

  const renderScreen = (idx: number, live: boolean) => {
    if (idx === WELCOME) {
      return (
        <div className="tf-content">
          <h1 className="tf-title big">{form.welcome_title || form.title}</h1>
          {form.welcome_description && <p className="tf-desc">{form.welcome_description}</p>}
          <div className="tf-actions">
            <button className="tf-ok" onClick={() => advance()} disabled={!live}>{form.welcome_button || 'Start'}</button>
            <span className="tf-hint">{bold(t('enter_hint'))}</span>
          </div>
          <p className="tf-hint" style={{ marginTop: 22 }}>⏱ Takes {Math.max(1, Math.ceil(total / 4))} minute{total > 4 ? 's' : ''}</p>
        </div>
      );
    }
    if (idx === END) {
      return (
        <div className="tf-content center">
          <div className="tf-done"><Icon name="check" size={34} stroke={2.6} /></div>
          <h1 className="tf-title big">{form.thankyou_title || 'Thanks for completing this form!'}</h1>
          {form.thankyou_description && <p className="tf-desc">{form.thankyou_description}</p>}
          {mode === 'live' ? <Link href="/" className="tf-ok" style={{ textDecoration: 'none', marginTop: 28 }}>Create your own form</Link>
            : <button className="tf-ok" style={{ marginTop: 28 }} onClick={restart}>Restart preview</button>}
        </div>
      );
    }
    const q = qs[idx];
    const isLast = idx === total - 1 || nextIndex(qs, idx, answers) === END;
    const autoSingle = ['yes_no', 'rating', 'dropdown'].includes(q.type) || (q.type === 'multiple_choice' && !q.settings.allow_multiple);
    return (
      <div className="tf-content">
        <div className="tf-qhead">
          {S0.question_number && <span className="tf-num">{idx + 1}<Icon name="right" size={16} stroke={2.4} /></span>}
          <h1 className="tf-title">{q.title || 'Your question here'}{q.required && S0.asterisks && <span className="tf-req"> *</span>}</h1>
        </div>
        {q.description && <p className="tf-desc">{q.description}</p>}
        <div className="tf-answer">
          <QuestionInput q={q} value={answers[q.id]} active={live} onChange={(v, o) => setAnswer(q, v, o?.auto)} />
        </div>
        {live && error && <div className="tf-error" role="alert"><Icon name="x" size={14} stroke={2.6} />{error}</div>}
        {(!autoSingle || isLast) && (
          <div className="tf-actions">
            <button className="tf-ok" onClick={() => advance()} disabled={!live || submitting}>
              {isLast ? (submitting ? 'Submitting…' : t('submit_button')) : t('ok_button')}{!isLast && <Icon name="check" size={20} stroke={2.4} />}
            </button>
            <span className="tf-hint">
              {bold(q.type === 'long_text' ? t('line_break') : t('enter_hint'))}
            </span>
          </div>
        )}
        {q.type === 'multiple_choice' && q.settings.allow_multiple && <p className="tf-hint" style={{ marginTop: 14 }}>{t('multi_hint')}</p>}
      </div>
    );
  };

  if (live && S0.accepting === false) {
    return (
      <div className="tf-theme tf-runner" style={themeVars(form.theme)}>
        <div className="tf-stage"><div className="tf-layer in-first"><div className="tf-content center">
          <h1 className="tf-title big">This form is closed</h1>
          <p className="tf-desc">It is no longer accepting new responses.</p>
        </div></div></div>
      </div>
    );
  }

  return (
    <RunnerCtx.Provider value={fs}>
    <div className="tf-theme tf-runner" style={themeVars(form.theme)}>
      {mode === 'preview' && (
        <div className="tf-preview-bar">
          <span><Icon name="eye" size={16} /> Preview mode — responses are not saved</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <button onClick={restart}>Restart</button>
            <button onClick={onClose}><Icon name="x" size={14} /> Close</button>
          </span>
        </div>
      )}
      {S0.progress_bar && <div className="tf-progress"><div style={{ width: `${pct}%` }} /></div>}
      <div className="tf-stage" style={mode === 'preview' ? { top: 44 } : undefined}>
        {prev !== null && <div key={`p${prev}`} className={`tf-layer out-${dir}`} aria-hidden>{renderScreen(prev, false)}</div>}
        <div key={`c${cur}`} className={`tf-layer ${prev !== null ? `in-${dir}` : 'in-first'}`}>{renderScreen(cur, true)}</div>
      </div>
      <div className="tf-footer">
        <span className="tf-pct">{S0.progress_bar && cur >= 0 && cur !== END ? `${pct}% completed` : ''}</span>
        <div className="tf-nav">
          <span className="tf-brand">Made with Typeform Clone</span>
          {S0.nav_arrows && cur >= 0 && cur !== END && (
            <div className="tf-arrows">
              <button onClick={back} aria-label="Previous question" disabled={!history.length && !(form.welcome_enabled)}><Icon name="up" size={18} stroke={2.4} /></button>
              <button onClick={() => advance(undefined, S0.free_nav)} aria-label="Next question"><Icon name="down" size={18} stroke={2.4} /></button>
            </div>
          )}
        </div>
      </div>
      {live && S0.cookie_consent && cookie === null && (
        <div className="tf-cookie" role="dialog" aria-label="Cookie consent">
          <p>This form uses cookies to save your progress and let you pick up where you left off.</p>
          <span><button onClick={() => choose('no')}>Decline</button><button className="on" onClick={() => choose('yes')}>Accept</button></span>
        </div>
      )}
    </div>
    </RunnerCtx.Provider>
  );
}
