'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FEATURES, Feature, Integration, Story } from '@/lib/landingContent';
import { Words } from './useReveal';

function Icon({ name }: { name: string }) {
  const url = `url(/landing/${name}.svg)`;
  return <span className="ficon" style={{ WebkitMaskImage: url, maskImage: url }} aria-hidden />;
}

function TextMedia({ variant, theme, flip, eyebrow, isNew, title, body, cta, img, features, ctaHref }: {
  variant: 'a' | 'b' | 'c'; theme: 'light' | 'dark'; flip?: boolean; eyebrow: string; isNew?: boolean; title: string; body: string; cta: string; img: string; features: Feature[]; ctaHref: string;
}) {
  return (
    <section className={`tm tm--${theme} tm--${variant}`} data-nav={theme === 'light' ? 'light' : 'dark'}>
      <div className="tm__layout">
        <div className={`tm__top ${flip ? 'is-flip' : ''}`}>
          <div className="tm__text">
            <p className={`eyebrow ${theme === 'dark' ? 'eyebrow--dark' : ''} rv`}>{eyebrow}{isNew && <em className="tf-new tf-new--sm">NEW</em>}</p>
            <h2 className="h-48 rv-words"><Words text={title} step={0.05} /></h2>
            <p className="lead rv">{body}</p>
            <Link href={ctaHref} className="btn-solid rv">{cta}</Link>
          </div>
          <div className="tm__media rv">
            <img src={img} alt="" loading="lazy" />
          </div>
        </div>
        <div className="tm__feats">
          {features.map((f, i) => (
            <div className="feat rv" style={{ ['--d' as any]: `${0.08 * i}s` }} key={f.title}>
              <span className="icwrap"><Icon name={f.icon} /></span>
              <div><h3>{f.title}</h3><p>{f.desc}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Transition() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height))); // 0..1 through the viewport
      el.style.setProperty('--p', p.toFixed(3));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, []);
  return (
    <div className="trans" ref={ref} aria-hidden>
      <img src="/landing/transition.png" alt="" />
    </div>
  );
}

export function ProductSections({ authed }: { authed: boolean }) {
  const go = authed ? '/dashboard' : '/signup';
  return (
    <>
      <TextMedia variant="a" theme="light" eyebrow="INTELLIGENT FORMS" title="Build forms at the drop of a prompt"
        body="With over 48 million responses collected monthly, Typeform AI builds best-in-class forms proven to get 3.5x more data. Brand easily, customize everything."
        cta="Explore forms" img="/landing/intelligent.avif" features={FEATURES.forms} ctaHref={go} />

      <section className="shead" data-nav="dark">
        <h2 className="h-64 rv-words"><Words text={'When the form ends,\nthe flow begins...'} step={0.07} /></h2>
      </section>

      <TextMedia variant="b" theme="dark" flip eyebrow="GROWTH FLOW" isNew title={'Be proactive with\ncustomer data'}
        body="Set up automations that convert and keep customers for you. As opportunities arise, Growth Flow steps in to enrich leads, create segments, and send personalized messages."
        cta="Explore Growth Flow" img="/landing/growth.avif" features={FEATURES.growth} ctaHref={go} />

      <div className="shine" aria-hidden />

      <TextMedia variant="c" theme="dark" eyebrow="RESEARCH FLOW" isNew title={'Run fast research,\nmoderated by AI'}
        body="Make data-backed business decisions with Research Flow. It builds your research study, conducts 1000s of AI-moderated interviews at once, and analyzes the findings. Fast."
        cta="Explore Research Flow" img="/landing/research.avif" features={FEATURES.research} ctaHref={go} />
    </>
  );
}

const CUSTOMERS = ['Northwind', 'Lumen&Co', 'Brightside', 'Kitebox', 'Orbital', 'Fernhill', 'Quill', 'Marlow', 'Tidepool', 'Anvil'];

export function Customers() {
  const row = (rev: boolean) => (
    <div className={`crow ${rev ? 'is-rev' : ''}`}>
      <div className="crow__track">
        {[...CUSTOMERS, ...CUSTOMERS].map((c, i) => <div className="ctile" key={i}><span>{c}</span></div>)}
      </div>
    </div>
  );
  return (
    <section className="cust" data-nav="light">
      <h2 className="h-48 center rv-words"><Words text="Join 150,000+ businesses driving revenue with Typeform" step={0.04} /></h2>
      <div className="cust__rows rv">{row(false)}{row(true)}</div>
    </section>
  );
}

export function Stories({ stories }: { stories: Story[] }) {
  const n = stories.length;
  // each story appears three times so the strip always has slides to the right of the active one
  const list = [...stories, ...stories, ...stories];
  const [k, setK] = useState(0);
  const hold = useRef(false);
  useEffect(() => {
    const t = setInterval(() => { if (!hold.current) setK((x) => (x + 1) % list.length); }, 6000);
    return () => clearInterval(t);
  }, [list.length]);
  return (
    <section className="stor" data-nav="light" onMouseEnter={() => (hold.current = true)} onMouseLeave={() => (hold.current = false)}>
      <div className="stor__viewport rv">
        <div className="stor__track" style={{ ['--k' as any]: k }}>
          {list.map((s, i) => (
            <article className={`slide ${i === k ? 'is-on' : ''}`} key={i} onClick={() => setK(i)}>
              <img src={s.logo} alt={s.company} className="slide__logo" />
              <p className="slide__q">{s.quote}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="stor__dots">
        {list.map((_, i) => <button key={i} className={i === k ? 'is-on' : ''} aria-label={`Story ${i + 1}`} onClick={() => setK(i)} />)}
      </div>
      <div className="center"><a href="#" className="btn-solid" onClick={(e) => e.preventDefault()}>Read all customer stories</a></div>
    </section>
  );
}

const BRAND: Record<string, string> = { activecampaign: '#004CFF', calendly: '#6AB0FF', callrail: '#388AED', intercom: '#000000', klaviyo: '#EF6451', slack: '#4A154B', stripe: '#635BFF', webflow: '#4353FF', zapier: '#FF4F00' };

export function Integrations({ items }: { items: Integration[] }) {
  const row = (list: Integration[], rev: boolean) => (
    <div className={`irow ${rev ? 'is-rev' : ''}`}>
      <div className="irow__track">
        {[...list, ...list, ...list, ...list].map((it, i) => {
          const key = it.logo.replace(/.*int-|\.svg.*/g, '');
          return (
            <div className="itile" key={i} title={it.name} style={{ ['--brand' as any]: BRAND[key] || '#A057BB' }}>
              <span className="itile__bg" />
              <img src={it.logo} alt={it.name} />
            </div>
          );
        })}
      </div>
    </div>
  );
  return (
    <section className="lpint" id="integrations" data-nav="light">
      <div className="lpint__panel">
        <h2 className="h-36 center rv">Integrate with your tech stack</h2>
        <div className="lpint__rows rv">{row(items, false)}{row([...items].reverse(), true)}</div>
        <div className="center"><a href="#" className="btn-solid" onClick={(e) => e.preventDefault()}>View integrations</a></div>
      </div>
    </section>
  );
}

export function Cta({ authed }: { authed: boolean }) {
  return (
    <section className="cta" data-nav="dark">
      <video autoPlay muted loop playsInline preload="metadata">
        <source src="/landing/star-bg.webm" type="video/webm" />
        <source src="/landing/star-bg.mp4" type="video/mp4" />
      </video>
      <div className="cta__in">
        <h2 className="display rv-words"><Words text={'AI forms and automation.\nAll in Typeform.'} step={0.07} /></h2>
        <Link href={authed ? '/dashboard' : '/signup'} className="btn-light rv" style={{ ['--d' as any]: '0.3s' }}>Get started—it’s free</Link>
      </div>
    </section>
  );
}
