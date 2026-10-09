'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import FormRunner from './runner/FormRunner';
import { useToast } from './Toast';
import { api, ApiError, type AiQuestion } from '@/lib/api';
import { planFromPrompt } from '@/lib/aiBuild';
import { letter } from './runner/QuestionInput';
import { DEFAULT_THEME } from '@/lib/themes';
import { TYPE_META } from '@/lib/questionTypes';
import type { Builder } from '@/hooks/useBuilder';
import type { Form, Question } from '@/lib/types';

type Msg = { who: 'me' | 'ai'; text?: string; did?: string[] };

/**
 * The Typeform AI dialog (Chat to create / Ask Typeform AI): a chat on the left, the questions it
 * suggests on the right ("Suggested changes" or a live "Preview"), and nothing touches the form
 * until the creator presses Apply.
 */
export default function AiStudio({ b, initial, onClose, onAdded }: { b?: Builder; initial: string; onClose: () => void; onAdded?: (firstId: number) => void }) {
  const toast = useToast();
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [items, setItems] = useState<AiQuestion[]>([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [tab, setTab] = useState<'changes' | 'preview'>('changes');
  const [v, setV] = useState('');
  const [listening, setListening] = useState(false);
  const rec = useRef<any>(null);
  const log = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const itemsRef = useRef<AiQuestion[]>([]);
  itemsRef.current = items;

  const ask = async (prompt: string) => {
    setMsgs((m) => [...m, { who: 'me', text: prompt }]);
    setBusy(true);
    const have = [...(b?.form?.questions.map((q) => q.title) || []), ...itemsRef.current.map((q) => q.title)].filter(Boolean);
    let got: AiQuestion[] = [], t = '', note = '';
    try { // real LLM on the server; built-in templates are only the fallback when no AI key is configured
      const r = await api.aiGenerate(prompt, have);
      got = r.questions; t = r.title;
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 503) { got = planFromPrompt(prompt).items as AiQuestion[]; note = 'AI is not configured on this server yet, so I used a built-in template.'; }
      else { setBusy(false); setMsgs((m) => [...m, { who: 'ai', text: e?.message || 'Something went wrong. Please try again.' }]); return; }
    }
    setBusy(false);
    if (!got.length) { setMsgs((m) => [...m, { who: 'ai', text: 'I could not come up with questions for that. Try describing the form in a bit more detail.' }]); return; }
    setItems((x) => [...x, ...got]);
    if (t && !title) setTitle(t);
    setTab('changes');
    setMsgs((m) => [...m, { who: 'ai', did: got.map((q) => q.title), text: [note, 'Review the suggested questions, then press Apply. You can keep chatting to add more.'].filter(Boolean).join(' ') }]);
  };

  useEffect(() => { if (started.current) return; started.current = true; ask(initial); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' }); }, [msgs, busy]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && !applying && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [applying, onClose]);

  const send = () => { const p = v.trim(); if (!p || busy) return; setV(''); ask(p); };

  const mic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast('Voice input is not supported in this browser', 'info'); return; }
    if (listening) { rec.current?.stop(); return; }
    const r = new SR(); rec.current = r; r.lang = 'en-US'; r.interimResults = false;
    r.onresult = (e: any) => setV((x) => (x ? x + ' ' : '') + e.results[0][0].transcript);
    r.onend = () => setListening(false);
    r.onerror = () => { setListening(false); toast('Could not hear anything', 'info'); };
    setListening(true); r.start();
  };

  const apply = async () => {
    if (!items.length || applying) return;
    setApplying(true);
    let first = 0, fid = 0;
    if (!b) { // dashboard: the suggestions become a brand-new form
      try {
        const t = (title || initial.replace(/^(create|make|build|generate)\s+(me\s+)?(a|an)?\s*/i, '')).slice(0, 60);
        const f = await api.createForm(t.charAt(0).toUpperCase() + t.slice(1));
        fid = f.id;
        for (const d of f.questions) await api.deleteQuestion(d.id).catch(() => {});
      } catch (e: any) { setApplying(false); toast(e.message || 'Could not create the form', 'error'); return; }
    }
    let n = 0;
    for (const s of items) {
      const q = b ? await b.addQuestion(s.type) : await api.addQuestion(fid, s.type).catch(() => null);
      if (!q) break;
      try {
        const u = await api.updateQuestion(q.id, { title: s.title, description: s.description || '', required: !!s.required, ...(s.choices ? { choices: s.choices.map((label) => ({ label })) } : {}) });
        b?.putQuestion(u);
      } catch { /* keep the default question */ }
      if (!first) first = q.id;
      n++;
    }
    setApplying(false);
    if (!n) { toast('Could not add the questions. Please try again.', 'error'); return; }
    toast(`Added ${n} question${n > 1 ? 's' : ''}`);
    if (first) onAdded?.(first);
    onClose();
    if (fid) router.push(`/forms/${fid}/edit`);
  };

  // the suggestions as a throw-away form, so "Preview" runs the real respondent component
  const previewForm = useMemo<Form>(() => ({
    id: 0, title: title || 'Preview', slug: '', status: 'draft', theme: b?.form?.theme || DEFAULT_THEME,
    welcome_enabled: false, welcome_title: '', welcome_description: '', welcome_button: 'Start',
    thankyou_title: '', thankyou_description: '', created_at: '', updated_at: '', published_at: null,
    questions: items.map((s, i): Question => ({
      id: -(i + 1), form_id: 0, position: i, type: s.type, title: s.title, description: s.description || '', required: !!s.required,
      settings: s.type === 'rating' ? { steps: 5 } : {}, rules: [],
      choices: (s.choices || []).map((label, j) => ({ id: -(j + 1), label })),
    })),
  }), [items, title, b?.form?.theme]);

  const wide = items.length > 0;
  return (
    <div className="ais-back" onMouseDown={(e) => e.target === e.currentTarget && !applying && onClose()}>
      <div className={`ais ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label="Typeform AI">
        <section className="ais__chat">
          <header className="ais__head">
            <Icon name="aistar" size={22} stroke={1.5} />
            <b>Typeform AI</b><span className="ais__beta">Beta</span>
            {!wide && <button className="ais__close" aria-label="Close" onClick={onClose}><Icon name="collapse" size={18} stroke={1.6} /></button>}
          </header>
          <div className="ais__log" ref={log} role="log" aria-live="polite">
            {msgs.map((m, i) => m.who === 'me'
              ? <div key={i} className="ais__me">{m.text}</div>
              : (
                <div key={i} className="ais__ai">
                  {m.did && (
                    <>
                      <p>Here’s what we did:</p>
                      <div className="ais__did">
                        {m.did.slice(0, 6).map((t, j) => <div key={j}><Icon name="check" size={18} stroke={1.8} /><span>Added “{t}”</span></div>)}
                        {m.did.length > 6 && <div><Icon name="check" size={18} stroke={1.8} /><span>and {m.did.length - 6} more</span></div>}
                      </div>
                    </>
                  )}
                  {m.text && <p>{m.text}</p>}
                </div>
              ))}
            {busy && <div className="ais__ai ais__dots"><i /><i /><i /></div>}
          </div>
          <div className="ais__box">
            <textarea rows={1} placeholder="Chat to create" value={v} aria-label="Chat to create" onChange={(e) => setV(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <div className="ais__tools">
              <button className={`ais__ic ${listening ? 'on' : ''}`} aria-label="Voice input" onClick={mic}><Icon name="mic" size={18} stroke={1.6} /></button>
              <span className="grow" />
              <button className="ais__send" aria-label="Send" disabled={!v.trim() || busy} onClick={send}><Icon name="play" size={14} stroke={1.6} /></button>
            </div>
          </div>
        </section>

        {wide && (
          <section className="ais__side">
            <div className="ais__top">
              <div className="ais__tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'changes'} className={tab === 'changes' ? 'on' : ''} onClick={() => setTab('changes')}>Suggested changes</button>
                <button role="tab" aria-selected={tab === 'preview'} className={tab === 'preview' ? 'on' : ''} onClick={() => setTab('preview')}><Icon name="play" size={16} stroke={1.6} />Preview</button>
              </div>
              <button className="ais__x" aria-label="Close" onClick={onClose}><Icon name="x" size={22} stroke={1.6} /></button>
            </div>
            {tab === 'changes' ? (
              <div className="ais__changes">
                <p className="ais__lead">Questions to be set:</p>
                {items.map((q, i) => {
                  const meta = TYPE_META[q.type];
                  return (
                    <div className="ais__q" key={i}>
                      <div className="ais__qh">
                        <span className="ais__chip" style={{ background: meta.color }}><Icon name={meta.icon} size={16} stroke={1.6} />{(b?.form?.questions.length || 0) + i + 1}</span>
                        <span className="ais__qt">{q.title}{q.required && <em> *</em>}</span>
                        <button className="ais__rm" aria-label="Remove suggestion" onClick={() => setItems((x) => x.filter((_, k) => k !== i))}><Icon name="x" size={16} stroke={1.8} /></button>
                      </div>
                      {q.description && <p className="ais__qd">{q.description}</p>}
                      {q.choices && <ul className="ais__ch">{q.choices.map((c, j) => <li key={j}><b>{letter(j)}</b>{c}</li>)}</ul>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="ais__prev"><FormRunner key={items.length + title} form={previewForm} mode="preview" onClose={() => setTab("changes")} /></div>
            )}
            <div className="ais__foot">
              <button className="ais__apply" disabled={!items.length || applying} onClick={apply}>{applying ? 'Applying…' : 'Apply'}</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
