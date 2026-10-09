'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, setToken, type AuthUser } from '@/lib/api';
import { applyMode, getMode, type Mode } from '@/lib/colorMode';

/** Pink initials avatar (top-right in every admin page) with a log-in / log-out menu. */
export default function UserMenu() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('light');
  useEffect(() => { setMode(getMode()); }, []);
  const flip = () => { const m: Mode = mode === 'dark' ? 'light' : 'dark'; applyMode(m); setMode(m); };
  useEffect(() => { api.me().then(setUser).catch(() => {}); }, []);
  const name = user?.name || 'Demo Creator';
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const signedIn = !!getToken();
  return (
    <div style={{ position: 'relative' }}>
      <button className="avatar" title={name} onClick={() => setOpen(!open)} aria-label="Account menu">{initials}</button>
      {open && (
        <div className="user-menu" onMouseLeave={() => setOpen(false)}>
          <div className="um-name">{name}<small>{user?.email}</small></div>
          <button onClick={flip} role="switch" aria-checked={mode === 'dark'}>{mode === 'dark' ? 'Light mode' : 'Dark mode'}</button>
          {signedIn
            ? <button onClick={() => { setToken(null); router.push('/'); }}>Log out</button>
            : <button onClick={() => router.push('/login')}>Log in</button>}
        </div>
      )}
    </div>
  );
}

/** Account name shown next to the logo (e.g. "nsingh1_be23" in the real app). */
export function useAccountName() {
  const [name, setName] = useState('Demo Creator');
  useEffect(() => { api.me().then((u) => u?.name && setName(u.name)).catch(() => {}); }, []);
  return name;
}
