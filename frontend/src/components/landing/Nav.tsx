'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { NAV_MENUS } from '@/lib/landingContent';
import { LogoIcon, LogoWord } from './Logo';

const HIDE_AT = 500; // scrollY past which the wordmark slides into the logo mark

function Chevron() {
  return (
    <svg className="chev" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 6L8 10.5L12.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  );
}

export default function Nav({ onContact, authed }: { onContact: () => void; authed: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [light, setLight] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [mobile, setMobile] = useState(false);
  const closeT = useRef<any>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > HIDE_AT);
      // flip text colour while the nav sits over a light section
      let isLight = false;
      document.querySelectorAll('[data-nav="light"]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= 44 && r.bottom > 44) isLight = true;
      });
      setLight(isLight);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { document.body.style.overflow = mobile ? 'hidden' : ''; }, [mobile]);

  const hover = (i: number | null) => {
    clearTimeout(closeT.current);
    if (i === null) closeT.current = setTimeout(() => setOpen(null), 120);
    else setOpen(i);
  };

  return (
    <header className={`tf-nav ${light ? 'is-light' : ''} ${open !== null || mobile ? 'is-open' : ''}`}>
      <div className="tf-nav__inner">
        <Link href="/" className={`tf-logo ${scrolled ? 'is-collapsed' : ''}`} aria-label="Back to home">
          <span className="tf-logo__icon"><LogoIcon /></span>
          <span className="tf-logo__word"><span className="tf-logo__wordin"><LogoWord /></span></span>
        </Link>

        <nav className="tf-nav__links" onMouseLeave={() => hover(null)}>
          {NAV_MENUS.map((m, i) => (
            <div key={m.label} className="tf-nav__item" onMouseEnter={() => hover(i)}>
              <button className={`tf-nav__btn ${open === i ? 'is-active' : ''}`} onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                {m.label}<Chevron />
              </button>
            </div>
          ))}
          <div className="tf-nav__item"><a className="tf-nav__btn" href="#pricing" onMouseEnter={() => hover(null)}>Pricing</a></div>

          {open !== null && (
            <div className="tf-mega" onMouseEnter={() => hover(open)} role="menu">
              <div className="tf-mega__cols">
                {NAV_MENUS[open].cols.map((c) => (
                  <div className="tf-mega__col" key={c.h}>
                    <div className="tf-mega__h">{c.h}</div>
                    {c.items.map((it) => (
                      <a href="#" key={it.t} className="tf-mega__it" onClick={(e) => e.preventDefault()}>
                        <span className="tf-mega__t">{it.t}{it.isNew && <em className="tf-new">NEW</em>}</span>
                        {it.d && <span className="tf-mega__d">{it.d}</span>}
                      </a>
                    ))}
                    {c.more && <a href="#" className="tf-mega__more" onClick={(e) => e.preventDefault()}>{c.more}</a>}
                  </div>
                ))}
              </div>
              {NAV_MENUS[open].promos && (
                <div className="tf-mega__promos">
                  {NAV_MENUS[open].promos!.map((p) => (
                    <div className="tf-promo" key={p.title}>
                      <span className="tf-promo__e">{p.eyebrow}</span>
                      <span className="tf-promo__t">{p.title}</span>
                      <span className="tf-promo__c">{p.cta}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="tf-nav__cta">
          {authed ? (
            <Link href="/dashboard" className="tf-btn tf-btn--ghost">Dashboard</Link>
          ) : (
            <Link href="/login" className="tf-btn tf-btn--text">Log in</Link>
          )}
          <button className="tf-btn tf-btn--outline" onClick={onContact}>Contact sales</button>
          <Link href={authed ? '/dashboard' : '/signup'} className="tf-btn tf-btn--solid">{authed ? 'Create form' : 'Sign up'}</Link>
        </div>

        <button className="tf-burger" aria-label="Menu" onClick={() => setMobile(!mobile)}>
          <span /><span />
        </button>
      </div>

      {mobile && (
        <div className="tf-mobile">
          {NAV_MENUS.map((m) => (
            <details key={m.label}>
              <summary>{m.label}<Chevron /></summary>
              {m.cols.flatMap((c) => c.items).map((it) => <a key={it.t} href="#" onClick={(e) => e.preventDefault()}>{it.t}</a>)}
            </details>
          ))}
          <a href="#pricing" onClick={() => setMobile(false)}>Pricing</a>
          <div className="tf-mobile__cta">
            <Link href="/login" className="tf-btn tf-btn--outline">Log in</Link>
            <button className="tf-btn tf-btn--outline" onClick={() => { setMobile(false); onContact(); }}>Contact sales</button>
            <Link href="/signup" className="tf-btn tf-btn--solid">Sign up</Link>
          </div>
        </div>
      )}
    </header>
  );
}
