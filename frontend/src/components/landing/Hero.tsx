'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { HERO_TABS } from '@/lib/landingContent';
import { Words } from './useReveal';

/** Hero: split-word headline, 3 tab cards whose progress bar tracks the video, auto-advancing on `ended`. */
export default function Hero({ authed }: { authed: boolean }) {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const vids = useRef<(HTMLVideoElement | null)[]>([]);
  const cards = useRef<HTMLDivElement>(null);
  const visible = useRef(true);

  // play only the active video, rewind the others
  useEffect(() => {
    vids.current.forEach((v, i) => {
      if (!v) return;
      if (i === active) {
        v.currentTime = 0;
        setProgress(0);
        if (visible.current) v.play().catch(() => {});
      } else v.pause();
    });
    // keep the active card in view on small screens (horizontal swiper)
    const el = cards.current?.children[active] as HTMLElement | undefined;
    if (el && cards.current && cards.current.scrollWidth > cards.current.clientWidth + 2) {
      cards.current.scrollTo({ left: el.offsetLeft - 24, behavior: 'smooth' });
    }
  }, [active]);

  // pause videos while the hero is off screen
  useEffect(() => {
    const wrap = document.getElementById('hero-media');
    if (!wrap || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      const v = vids.current[active];
      if (!v) return;
      if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
    }, { threshold: 0.1 });
    io.observe(wrap);
    return () => io.disconnect();
  }, [active]);

  return (
    <section className="hero" data-nav="dark">
      <div className="hero__pad" />
      <div className="hero__head">
        <p className="eyebrow eyebrow--dark rv">AI FORMS &amp; AUTOMATION</p>
        <h2 className="display rv-words"><Words text={'Your favorite forms.\nNow with AI automation.'} base={0.1} step={0.07} /></h2>
        <p className="hero__lead rv" style={{ ['--d' as any]: '0.45s' }}>
          Combine AI forms and automated workflows to drive revenue growth. Run in-depth research and manage the entire customer lifecycle. All in Typeform.
        </p>
        <Link href={authed ? '/dashboard' : '/signup'} className="btn-light rv" style={{ ['--d' as any]: '0.55s' }}>Get started—it’s free</Link>
      </div>

      <div className="hero__tabs rv" style={{ ['--d' as any]: '0.65s' }} ref={cards}>
        {HERO_TABS.map((t, i) => (
          <button key={t.k} className={`hcard ${i === active ? 'is-active' : ''}`} onClick={() => setActive(i)} aria-pressed={i === active}>
            <span className="hcard__k">{t.k}</span>
            <span className="hcard__t">{t.title}{t.isNew && <em className="tf-new tf-new--sm">NEW</em>}</span>
            <span className="hcard__d">{t.desc}</span>
            <span className="hcard__bar"><span style={{ transform: `scaleX(${i === active ? progress : 0})` }} /></span>
          </button>
        ))}
      </div>

      <div className="hero__media" id="hero-media">
       <div className="hero__vbox">
        {HERO_TABS.map((t, i) => (
          <video
            key={t.k}
            ref={(el) => { vids.current[i] = el; }}
            className={i === active ? 'is-on' : ''}
            src={t.video}
            muted
            playsInline
            preload={i === 0 ? 'auto' : 'metadata'}
            onTimeUpdate={(e) => { if (i === active && e.currentTarget.duration) setProgress(e.currentTarget.currentTime / e.currentTarget.duration); }}
            onEnded={() => setActive((a) => (a + 1) % HERO_TABS.length)}
          />
        ))}
       </div>
      </div>
    </section>
  );
}
