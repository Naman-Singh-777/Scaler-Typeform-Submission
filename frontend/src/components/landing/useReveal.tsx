'use client';
import { useEffect } from 'react';

/** Adds .is-in to every .rv / .rv-words element once it scrolls into view (and keeps it). */
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.rv, .rv-words');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

/** Splits text into word spans so CSS can stagger them (mirrors Typeform's GSAP split-word reveal). */
export function Words({ text, base = 0, step = 0.06 }: { text: string; base?: number; step?: number }) {
  let i = 0;
  return (
    <>
      {text.split('\n').map((line, li, arr) => (
        <span key={li} className="line">
          {line.split(' ').map((w, wi) => (
            <span key={wi}><span className="wd"><span style={{ ['--i' as any]: base + step * i++ }}>{w}</span></span>{' '}</span>
          ))}
          {li < arr.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}
