'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Post-signup loading screen ("Setting you up…"), measured frame-by-frame from the real one:
 * the left block of the mark shrinks while the right pill grows (total width constant), then mark + text fade
 * out, a short blank beat, and the workspace fades in. Only CSS keyframes drive the motion so it runs at the
 * display refresh rate (60fps+).
 */
export default function Welcome() {
  const router = useRouter();
  const [go, setGo] = useState(false);
  useEffect(() => {
    router.prefetch('/dashboard');
    const t1 = setTimeout(() => setGo(true), 550);          // hold the mark while the workspace loads
    const t2 = setTimeout(() => router.replace('/dashboard'), 550 + 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [router]);
  return (
    <main className={`wl ${go ? 'go' : ''}`} aria-busy="true">
      <div className="wl__mark" aria-hidden><i /><i /></div>
      <p className="wl__txt">Setting you up to collect responses and connect with your contacts</p>
    </main>
  );
}
