'use client';
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/newsreader';
import './auth.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { api, setToken } from '@/lib/api';
import { LogoIcon, LogoWord } from '../landing/Logo';

/** Shared log in / sign up screen (dark Typeform-style panel). */
export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const signup = mode === 'signup';
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (signup && !f.name.trim()) return setErr('Please enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Please enter a valid email address.');
    if (signup && f.password.length < 8) return setErr('Use at least 8 characters for your password.');
    if (!f.password) return setErr('Please enter your password.');
    setErr(''); setBusy(true);
    try {
      const r = signup ? await api.signup(f) : await api.login({ email: f.email, password: f.password });
      setToken(r.token);
      router.push('/dashboard');
    } catch (x: any) { setErr(x.message || 'Something went wrong.'); setBusy(false); }
  };

  return (
    <div className="au">
      <div className="au__side">
        <Link href="/" className="au__logo" aria-label="Home"><span><LogoIcon /></span><span><LogoWord /></span></Link>
        <h1>{signup ? <>Get started.<br />It’s free.</> : <>Welcome<br />back.</>}</h1>
        <p>AI forms and automation, all in one place.</p>
      </div>
      <div className="au__main">
        <form className="au__card" onSubmit={submit} noValidate>
          <h2>{signup ? 'Create your account' : 'Log in to your account'}</h2>
          {signup && <label>Full name<input value={f.name} onChange={set('name')} autoComplete="name" autoFocus /></label>}
          <label>Email<input type="email" value={f.email} onChange={set('email')} autoComplete="email" autoFocus={!signup} /></label>
          <label>Password<input type="password" value={f.password} onChange={set('password')} autoComplete={signup ? 'new-password' : 'current-password'} /></label>
          {err && <div className="au__err" role="alert">{err}</div>}
          <button className="au__btn" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create my free account' : 'Log in'}</button>
          <p className="au__alt">{signup ? <>Already have an account? <Link href="/login">Log in</Link></> : <>New here? <Link href="/signup">Sign up, it’s free</Link></>}</p>
          <p className="au__alt"><Link href="/dashboard">Continue as demo creator →</Link></p>
        </form>
      </div>
    </div>
  );
}
