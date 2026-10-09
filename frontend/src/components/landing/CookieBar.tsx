'use client';
import { useEffect, useState } from 'react';

const KEY = 'tf_cookie_choice';

/** Minimal consent banner (essential-only by default). Choice is remembered per browser. */
export default function CookieBar() {
  const [show, setShow] = useState(false);
  const [more, setMore] = useState(false);
  useEffect(() => { try { if (!localStorage.getItem(KEY)) setShow(true); } catch { setShow(true); } }, []);
  const choose = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* ignore */ } setShow(false); };
  if (!show) return null;
  return (
    <div className="cookie" role="dialog" aria-label="Cookie consent">
      <p>We use cookies to run this site and, with your permission, to understand how it is used.{' '}
        <button className="cookie__link" onClick={() => setMore(!more)}>{more ? 'Hide details' : 'Cookie settings'}</button></p>
      {more && <ul><li>Strictly necessary: always on</li><li>Analytics: only if you accept</li></ul>}
      <div className="cookie__btns">
        <button onClick={() => choose('essential')}>Reject all</button>
        <button className="is-primary" onClick={() => choose('all')}>Accept all</button>
      </div>
    </div>
  );
}
