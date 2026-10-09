'use client';
import { useEffect, useRef } from 'react';

declare global { interface Window { _wq?: any[]; Wistia?: any } }

let scriptAdded = false;
/** Load Wistia's player script once (same script typeform.com uses). */
export function loadWistia() {
  if (scriptAdded || typeof document === 'undefined') return;
  scriptAdded = true;
  const s = document.createElement('script');
  s.src = 'https://fast.wistia.com/assets/external/E-v1.js';
  s.async = true;
  document.head.appendChild(s);
}

/**
 * Embeds one of typeform.com's own Wistia videos by media id. The media's saved player settings
 * (autoplay, muted, loop, no controls, rounded) come from Wistia, exactly as on typeform.com.
 * `ratio` = video width / height. `onTime` / `onLoop` are used by the hero tab progress bars.
 */
export default function WistiaVideo({ id, ratio, onTime, onLoop, lazy = false, className }: {
  id: string; ratio: number; onTime?: (t: number, d: number) => void; onLoop?: () => void; lazy?: boolean; className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const cb = useRef({ onTime, onLoop });
  cb.current = { onTime, onLoop };

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let video: any = null, dead = false, started = false, io: IntersectionObserver | null = null;

    const start = () => {
      if (started || dead) return;
      started = true;
      loadWistia();
      el.innerHTML = '';
      const embed = document.createElement('div');
      embed.className = `wistia_embed wistia_async_${id} videoFoam=true`;
      embed.style.cssText = 'height:100%;width:100%';
      el.appendChild(embed);
      window._wq = window._wq || [];
      window._wq.push({
        id,
        onReady: (v: any) => {
          if (dead) { try { v.remove(); } catch {} return; }
          video = v;
          let prev = 0, fired = false;
          v.bind('timechange', (t: number) => {
            const d = v.duration() || 0;
            if (prev - t > 1 && !fired) { fired = true; cb.current.onLoop?.(); }
            prev = t;
            if (d) cb.current.onTime?.(t, d);
          });
          v.bind('end', () => { if (!fired) { fired = true; cb.current.onLoop?.(); } });
        },
      });
    };

    if (lazy && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { start(); io?.disconnect(); } }, { rootMargin: '200px 0px' });
      io.observe(el);
    } else start();

    return () => {
      dead = true; io?.disconnect();
      try { video?.remove(); } catch {}
      if (el) el.innerHTML = '';
    };
  }, [id, lazy]);

  return (
    <div className={`wvid ${className || ''}`} style={{ ['--wr' as any]: ratio }}>
      <div className="wvid__inner" ref={host} />
    </div>
  );
}
