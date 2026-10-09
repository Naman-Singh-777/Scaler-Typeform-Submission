'use client';
import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { LogoIcon } from './Logo';
import { api, ApiError } from '@/lib/api';

type Msg = { from: 'bot' | 'me'; text: string; cta?: { label: string; href?: string; contact?: boolean } };

const GREETING = 'Hi there! I’m Ty from Typeform. We help teams capture richer data and automate workflows with AI. What kind of data or workflows are you looking to improve today?';
const CHIPS = ['Build a form', 'Pricing', 'Integrations', 'Talk to sales'];

/** Offline fallback used only when the server's AI is unavailable. */
function answer(q: string, authed: boolean): Msg {
  const t = q.toLowerCase();
  const start = authed ? { label: 'Go to your workspace', href: '/dashboard' } : { label: 'Get started — it’s free', href: '/signup' };
  if (/(price|pricing|cost|plan|free|pay)/.test(t)) return { from: 'bot', text: 'You can start for free and collect responses without a card. Paid plans add more responses, logic and branding. Want to jump in?', cta: start };
  if (/(sales|demo|enterprise|contact|team)/.test(t)) return { from: 'bot', text: 'Happy to connect you with our team. They can walk you through a demo and talk about your use case.', cta: { label: 'Contact sales', contact: true } };
  if (/(integrat|zapier|slack|hubspot|webhook|connect)/.test(t)) return { from: 'bot', text: 'Typeform connects with 120+ apps like Slack, HubSpot, Zapier and Google Sheets, so responses land where your team already works.', cta: start };
  if (/(research|interview|study|survey)/.test(t)) return { from: 'bot', text: 'Research Flow builds a study, runs AI-moderated interviews at scale and summarises the findings. Great for fast, confident decisions.', cta: start };
  if (/(lead|growth|segment|follow|email|revenue)/.test(t)) return { from: 'bot', text: 'Growth Flow segments new leads with AI and sends personalised follow-ups automatically, so no lead goes cold.', cta: start };
  if (/(form|build|create|quiz|feedback|ai)/.test(t)) return { from: 'bot', text: 'Describe what you need and Typeform AI drafts the form for you. Then edit questions, reorder them, add logic and publish with one click.', cta: start };
  return { from: 'bot', text: 'Good question! I can help with building forms, pricing, integrations or connecting you with sales. What would you like to know?' };
}

export default function TyChat({ authed, onContact }: { authed: boolean; onContact: () => void }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'bot', text: GREETING }]);
  const [v, setV] = useState('');
  const [typing, setTyping] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' }); }, [msgs, typing, open]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || typing) return;
    const history = [...msgs, { from: 'me' as const, text: q }];
    setMsgs(history); setV(''); setTyping(true);
    let reply: Msg;
    try { // real LLM (backend /api/ai/chat); falls back to canned answers if the AI is not configured or unreachable
      const r = await api.aiChat(history.slice(1).map((m) => ({ role: m.from === 'me' ? 'user' as const : 'assistant' as const, content: m.text })).slice(-12));
      const t = r.reply.toLowerCase();
      reply = { from: 'bot', text: r.reply, cta: /contact sales|talk to (our )?sales/.test(t) ? { label: 'Contact sales', contact: true } : /sign up|get started|free/.test(t) ? (authed ? { label: 'Go to your workspace', href: '/dashboard' } : { label: 'Get started — it’s free', href: '/signup' }) : undefined };
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) reply = { from: 'bot', text: e.message };
      else reply = answer(q, authed);
    }
    setMsgs((m) => [...m, reply]); setTyping(false);
  };
  const submit = (e: FormEvent) => { e.preventDefault(); send(v); };

  return (
    <div className="ty">
      {open && (
        <section className="ty__panel" role="dialog" aria-label="Chat with Ty">
          <header><span className="ty__avatar"><LogoIcon /></span><b>Ty</b><small>Typeform assistant</small>
            <button onClick={() => setOpen(false)} aria-label="Close chat">×</button></header>
          <div className="ty__list" ref={list} aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`ty__row ${m.from}`}>
                <div className="ty__bub">{m.text}</div>
                {m.cta && (m.cta.contact
                  ? <button className="ty__cta" onClick={() => { setOpen(false); onContact(); }}>{m.cta.label}</button>
                  : <Link className="ty__cta" href={m.cta.href!}>{m.cta.label}</Link>)}
              </div>
            ))}
            {typing && <div className="ty__row bot"><div className="ty__bub ty__dots"><i /><i /><i /></div></div>}
            {msgs.length === 1 && <div className="ty__chips">{CHIPS.map((c) => <button key={c} onClick={() => send(c)}>{c}</button>)}</div>}
          </div>
          <form onSubmit={submit}>
            <input value={v} onChange={(e) => setV(e.target.value)} placeholder="Ask Ty anything" aria-label="Message Ty" autoFocus maxLength={300} />
            <button type="submit" disabled={!v.trim() || typing} aria-label="Send">➤</button>
          </form>
        </section>
      )}
      {!open && !seen && <button className="ty__msg" onClick={() => { setOpen(true); setSeen(true); }}>{GREETING}</button>}
      <button className="ty__btn" onClick={() => { setOpen((o) => !o); setSeen(true); }} aria-expanded={open}><LogoIcon />Ask Ty</button>
    </div>
  );
}
