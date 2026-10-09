'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { api, publicUrl, getToken, setToken, type AuthUser } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { DEFAULT_THEME } from '@/lib/themes';
import type { Form, FormListItem } from '@/lib/types';

type ThemeLite = Form['theme'];

function Thumb({ theme, card }: { theme?: ThemeLite; card?: boolean }) {
  const t = theme || DEFAULT_THEME;
  return (
    <div className={card ? 'cover' : 'thumb'} style={{ background: t.background, color: t.answer }}>
      <i /><i />{card && <i />}
    </div>
  );
}

function UserMenu() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  useEffect(() => { api.me().then(setUser).catch(() => {}); }, []);
  const name = user?.name || 'Demo Creator';
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const signedIn = !!getToken();
  return (
    <div style={{ position: 'relative' }}>
      <button className="avatar" title={name} onClick={() => setOpen(!open)} aria-label="Account menu" style={{ border: 0, cursor: 'pointer' }}>{initials}</button>
      {open && (
        <div className="user-menu" onMouseLeave={() => setOpen(false)}>
          <div className="um-name">{name}<small>{user?.email}</small></div>
          {signedIn
            ? <button onClick={() => { setToken(null); router.push('/'); }}>Log out</button>
            : <button onClick={() => router.push('/login')}>Log in</button>}
        </div>
      )}
    </div>
  );
}

function RowMenu({ f, onRename, onDuplicate, onDelete }: { f: FormListItem; onRename: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toast = useToast();
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const act = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); setOpen(false); fn(); };
  return (
    <div className="rel" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button className="icon-btn" aria-label="More actions" onClick={() => setOpen((o) => !o)}><Icon name="dots" /></button>
      {open && (
        <div className="menu">
          <button onClick={act(onRename)}>Rename</button>
          <button onClick={act(onDuplicate)}><Icon name="copy" size={16} />Duplicate</button>
          {f.status === 'published' && (
            <button onClick={act(() => { navigator.clipboard?.writeText(publicUrl(f.slug)); toast('Link copied to clipboard'); })}><Icon name="link" size={16} />Copy link</button>
          )}
          <hr />
          <button className="danger" onClick={act(onDelete)}><Icon name="trash" size={16} />Delete</button>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const toast = useToast();
  const [forms, setForms] = useState<FormListItem[] | null>(null);
  const [q, setQ] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [modal, setModal] = useState<null | { kind: 'create' } | { kind: 'rename' | 'delete'; f: FormListItem }>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.listForms().then(setForms).catch((e) => { toast(e.message, 'error'); setForms([]); });
  }, [toast]);
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { const v = localStorage.getItem('dash-view'); if (v === 'grid' || v === 'list') setView(v); } catch {} }, []);
  const setViewP = (v: 'list' | 'grid') => { setView(v); try { localStorage.setItem('dash-view', v); } catch {} };

  const shown = useMemo(() => (forms || []).filter((f) => f.title.toLowerCase().includes(q.toLowerCase())), [forms, q]);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try { await fn(); toast(okMsg); setModal(null); load(); }
    catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };
  const create = async () => {
    setBusy(true);
    try { const f = await api.createForm(name.trim() || undefined); router.push(`/forms/${f.id}/edit`); }
    catch (e: any) { toast(e.message, 'error'); setBusy(false); }
  };

  const open = (f: FormListItem) => router.push(`/forms/${f.id}/edit`);
  const menu = (f: FormListItem) => (
    <RowMenu f={f}
      onRename={() => { setName(f.title); setModal({ kind: 'rename', f }); }}
      onDuplicate={() => run(() => api.duplicateForm(f.id), 'Form duplicated')}
      onDelete={() => setModal({ kind: 'delete', f })} />
  );

  return (
    <>
      <header className="topbar">
        <Link href="/" className="logo"><i />typeform<span style={{ fontWeight: 500, color: '#888' }}>clone</span></Link>
        <span className="spacer" />
        <span className="pill soon">Free plan</span>
        <UserMenu />
      </header>
      <div className="dash">
        <aside className="side">
          <a className="active" href="/dashboard"><Icon name="grid" size={18} />My workspace</a>
          <h6>Coming soon</h6>
          <div className="item"><Icon name="sparkle" size={18} />Templates</div>
          <div className="item"><Icon name="link" size={18} />Integrations</div>
          <div className="item"><Icon name="settings" size={18} />Team &amp; sharing</div>
        </aside>
        <main className="dash-main">
          <div className="dash-head">
            <h1>My workspace</h1>
            <div className="search"><Icon name="search" size={18} /><input placeholder="Search forms" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search forms" /></div>
            <div className="seg" role="group" aria-label="View">
              <button className={view === 'list' ? 'on' : ''} onClick={() => setViewP('list')} aria-label="List view"><Icon name="list" size={16} /></button>
              <button className={view === 'grid' ? 'on' : ''} onClick={() => setViewP('grid')} aria-label="Grid view"><Icon name="grid" size={16} /></button>
            </div>
            <button className="btn primary" onClick={() => { setName(''); setModal({ kind: 'create' }); }}><Icon name="plus" size={18} stroke={2.4} />Create form</button>
          </div>

          {forms === null && [1, 2, 3].map((i) => <div key={i} className="skeleton" />)}
          {forms && shown.length === 0 && (
            <div className="empty-state">
              <h3>{q ? 'No forms match your search' : 'No forms yet'}</h3>
              <p>{q ? 'Try a different name.' : 'Create your first form to get started.'}</p>
            </div>
          )}
          {forms && shown.length > 0 && view === 'list' && (
            <div className="form-list">
              <div className="form-row head"><span /><span>Name</span><span className="hide-sm">Status</span><span className="hide-sm">Responses</span><span className="hide-sm">Updated</span><span /></div>
              {shown.map((f) => (
                <div key={f.id} className="form-row" onClick={() => open(f)}>
                  <Thumb theme={f.theme} />
                  <div><div className="form-title">{f.title}</div><div className="form-sub">{f.question_count} question{f.question_count !== 1 && 's'}</div></div>
                  <span className="hide-sm"><span className={`pill ${f.status === 'published' ? 'live' : ''}`}>{f.status === 'published' ? 'Published' : 'Draft'}</span></span>
                  <Link className="hide-sm" href={`/forms/${f.id}/results`} onClick={(e) => e.stopPropagation()} style={{ fontWeight: 600, textDecoration: 'none' }}>{f.response_count} response{f.response_count !== 1 && 's'}</Link>
                  <span className="hide-sm muted">{timeAgo(f.updated_at)}</span>
                  {menu(f)}
                </div>
              ))}
            </div>
          )}
          {forms && shown.length > 0 && view === 'grid' && (
            <div className="cards">
              {shown.map((f) => (
                <div key={f.id} className="card" onClick={() => open(f)}>
                  <Thumb theme={f.theme} card />
                  <div className="body">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="form-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</div>
                      <div className="form-sub" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                        <span className={`pill ${f.status === 'published' ? 'live' : ''}`}>{f.status === 'published' ? 'Published' : 'Draft'}</span>
                        {f.response_count} responses
                      </div>
                    </div>
                    {menu(f)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {modal?.kind === 'create' && (
        <Modal title="Create a new form" onClose={() => setModal(null)}
          footer={<><button className="btn" onClick={() => setModal(null)}>Cancel</button><button className="btn primary" disabled={busy} onClick={create}>Create form</button></>}>
          <label className="label" htmlFor="nf">Form name</label>
          <input id="nf" className="field" autoFocus placeholder="e.g. Customer feedback" value={name} maxLength={200}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
          <p className="muted" style={{ marginTop: 14 }}>Start from scratch. <span className="pill soon">Templates &amp; AI — coming soon</span></p>
        </Modal>
      )}
      {modal?.kind === 'rename' && (
        <Modal title="Rename form" onClose={() => setModal(null)}
          footer={<><button className="btn" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn primary" disabled={busy || !name.trim()} onClick={() => run(() => api.updateForm(modal.f.id, { title: name.trim() }), 'Form renamed')}>Save</button></>}>
          <input className="field" autoFocus value={name} maxLength={200} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && run(() => api.updateForm(modal.f.id, { title: name.trim() }), 'Form renamed')} />
        </Modal>
      )}
      {modal?.kind === 'delete' && (
        <Modal title="Delete this form?" onClose={() => setModal(null)}
          footer={<><button className="btn" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn danger" disabled={busy} onClick={() => run(() => api.deleteForm(modal.f.id), 'Form deleted')}>Delete</button></>}>
          <p><b>{modal.f.title}</b> and its {modal.f.response_count} response{modal.f.response_count !== 1 && 's'} will be permanently deleted. This can’t be undone.</p>
        </Modal>
      )}
    </>
  );
}
