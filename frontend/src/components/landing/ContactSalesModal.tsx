'use client';
import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ContactSalesModal({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ name: '', email: '', company: '', message: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return setErr('Please tell us your name.');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Please enter a valid work email.');
    setErr(''); setBusy(true);
    try { await api.contactSales(f); setSent(true); } catch (x: any) { setErr(x.message || 'Something went wrong.'); }
    setBusy(false);
  };
  return (
    <div className="cs-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cs" role="dialog" aria-modal="true" aria-label="Contact sales">
        <button className="cs__x" onClick={onClose} aria-label="Close">×</button>
        {sent ? (
          <div className="cs__done"><h3>Thanks, {f.name.split(' ')[0]}!</h3><p>Our team will reach out to {f.email} shortly.</p><button className="btn-solid" onClick={onClose}>Close</button></div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h3>Talk to our sales team</h3>
            <p className="cs__sub">Tell us a little about your needs and we will get back to you.</p>
            <label>Full name<input value={f.name} onChange={set('name')} autoFocus /></label>
            <label>Work email<input type="email" value={f.email} onChange={set('email')} /></label>
            <label>Company<input value={f.company} onChange={set('company')} /></label>
            <label>How can we help?<textarea rows={3} value={f.message} onChange={set('message')} /></label>
            {err && <div className="cs__err">{err}</div>}
            <button className="btn-solid" disabled={busy}>{busy ? 'Sending…' : 'Contact sales'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
