'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { useToast } from './Toast';
import { api } from '@/lib/api';
import { planFromPrompt } from '@/lib/aiBuild';
import { ApiError } from '@/lib/api';
import type { Builder } from '@/hooks/useBuilder';

type Msg = { who: 'me' | 'ai'; text: string };

/** "Ask Typeform AI" / "Chat to create": describe a form and its questions are added to the current form. */
export default function AiChat({ b, variant, placeholder, onAdded }: { b?: Builder; variant: 'rail' | 'bar'; placeholder: string; onAdded?: (firstId: number) => void }) {
  const toast = useToast();
  const router = useRouter();
  const [v, setV] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const rec = useRef<any>(null);
  const [listening, setListening] = useState(false);

  const send = async () => {
    const prompt = v.trim();
    if (!prompt || busy || (b && !b.form)) return;
    setV(''); setOpen(true); setBusy(true);
    setMsgs((m) => [...m, { who: 'me', text: prompt }]);
    await new Promise((r) => setTimeout(r, 700));
    let plan = planFromPrompt(prompt), note = '';
    try { // real LLM on the server; the built-in templates are only a fallback when no AI key is configured
      const r = await api.aiGenerate(prompt, b?.form?.questions.map((q) => q.title).filter(Boolean) || []);
      plan = { items: r.questions, intro: r.title ? `Here is “${r.title}”` : 'Here is a draft', title: r.title } as any;
    } catch (e: any) {
      if (!(e instanceof ApiError) || e.status === 401) { setBusy(false); return; }
      if (e.status !== 503) { setBusy(false); setMsgs((m) => [...m, { who: 'ai', text: e.message || 'Something went wrong. Please try again.' }]); return; }
      note = '\n(AI is not configured on this server yet, so I used a built-in template.)';
    }
    let first = 0, n = 0, fid = 0;
    if (!b) { // dashboard: create a new form from the prompt
      try { const t = ((plan as any).title || prompt.replace(/^(create|make|build|generate)\s+(me\s+)?(a|an)?\s*/i, '')).slice(0, 60); const f = await api.createForm(t.charAt(0).toUpperCase() + t.slice(1)); fid = f.id; for (const d of f.questions) await api.deleteQuestion(d.id).catch(() => {}); }
      catch (e: any) { setBusy(false); toast(e.message || 'Could not create the form', 'error'); return; }
    }
    for (const s of plan.items) {
      const q = b ? await b.addQuestion(s.type) : await api.addQuestion(fid, s.type).catch(() => null);
      if (!q) break;
      try {
        const u = await api.updateQuestion(q.id, { title: s.title, description: s.description || '', required: !!s.required, ...(s.choices ? { choices: s.choices.map((label) => ({ label })) } : {}) });
        b?.putQuestion(u);
      } catch { /* keep the default question */ }
      if (!first) first = q.id;
      n++;
    }
    setBusy(false);
    setMsgs((m) => [...m, { who: 'ai', text: n ? `${plan.intro} — I added ${n} question${n > 1 ? 's' : ''}:\n${plan.items.slice(0, n).map((s, i) => `${i + 1}. ${s.title}`).join('\n')}\nYou can edit, reorder or delete them in Content.${note}` : 'Sorry, I could not add questions just now. Please try again.' }]);
    if (first) onAdded?.(first);
    if (fid) router.push(`/forms/${fid}/edit`);
  };

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

  return (
    <div className={`aic aic--${variant}`}>
      {open && msgs.length > 0 && (
        <div className="aic__pop" role="log" aria-live="polite">
          <button className="aic__x" aria-label="Close chat" onClick={() => setOpen(false)}><Icon name="x" size={14} stroke={1.8} /></button>
          {msgs.slice(-4).map((m, i) => <div key={i} className={`aic__m ${m.who}`}>{m.text}</div>)}
          {busy && <div className="aic__m ai aic__dots"><i /><i /><i /></div>}
        </div>
      )}
      <div className="askai__in aic__in">
        <button className={`askai__mic ${listening ? 'on' : ''}`} aria-label="Voice input" onClick={mic}><Icon name="mic" size={16} stroke={1.6} /></button>
        <input placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} onFocus={() => msgs.length && setOpen(true)}
          onKeyDown={(e) => e.key === 'Enter' && send()} aria-label={placeholder} />
        <button className="askai__go" aria-label="Send" disabled={!v.trim() || busy} onClick={send}><Icon name="play" size={14} stroke={1.6} /></button>
      </div>
    </div>
  );
}
