'use client';
import { FormEvent, useState } from 'react';
import { FOOTER_COLS } from '@/lib/landingContent';
import { api } from '@/lib/api';

const SOCIAL: { label: string; d?: string; ig?: boolean }[] = [
  { label: 'Facebook', d: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
  { label: 'X', d: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
  { label: 'Instagram', ig: true },
  { label: 'YouTube', d: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
  { label: 'LinkedIn', d: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
];

function Ext() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 6.5L9 11.5L14 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function Footer({ onContact }: { onContact: () => void }) {
  const [news, setNews] = useState(false);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const sub = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg('Please enter a valid email address.');
    try { await api.newsletter(email); setMsg('done'); } catch (x: any) { setMsg(x.message || 'Something went wrong.'); }
  };
  return (
    <footer className="foot" data-nav="dark" id="pricing">
      <div className="foot__top">
        {FOOTER_COLS.map((c, ci) => (
          <div className="foot__col" key={c.h}>
            <h3>{c.h}</h3>
            {c.links.map((l) => (
              <a key={l.t} href="#" className={l.exp ? 'has-ext' : ''}
                onClick={(e) => { e.preventDefault(); if (l.t === 'Contact sales') onContact(); if (l.t === 'Newsletter') setNews(true); }}>
                {l.t}{l.exp && <Ext />}
              </a>
            ))}
            {ci === FOOTER_COLS.length - 1 && (
              <>
                <div className="foot__social">
                  {SOCIAL.map((s) => (
                    <a key={s.label} href="#" aria-label={s.label} onClick={(e) => e.preventDefault()}>
                      {s.ig ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d={s.d} /></svg>
                      )}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {news && (
        <div className="cs-overlay" onMouseDown={(e) => e.target === e.currentTarget && setNews(false)}>
          <div className="cs" role="dialog" aria-modal="true" aria-label="Newsletter">
            <button className="cs__x" onClick={() => setNews(false)} aria-label="Close">×</button>
            {msg === 'done' ? (
              <div className="cs__done"><h3>You are on the list!</h3><p>We will send product news to {email}.</p><button className="btn-solid" onClick={() => setNews(false)}>Close</button></div>
            ) : (
              <form onSubmit={sub} noValidate>
                <h3>Typeform newsletter</h3>
                <p className="cs__sub">Product news and tips, once in a while.</p>
                <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></label>
                {msg && <div className="cs__err">{msg}</div>}
                <button className="btn-solid">Subscribe</button>
              </form>
            )}
          </div>
        </div>
      )}
      <div className="foot__bottom">
        <a href="#" onClick={(e) => e.preventDefault()}>Cookie settings</a>
        <a href="#" onClick={(e) => e.preventDefault()}>Check our cookies policy to delete cookies</a>
        <a href="#" onClick={(e) => e.preventDefault()}>Report abuse</a>
        <span>© Typeform</span>
      </div>
    </footer>
  );
}
