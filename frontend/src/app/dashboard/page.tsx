'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import UserMenu, { useAccountName } from '@/components/UserMenu';
import AskAi from '@/components/AskAi';
import { api, publicUrl } from '@/lib/api';
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

type Sort = 'created' | 'updated' | 'name';
const SORTS: [Sort, string][] = [['created', 'Date created'], ['updated', 'Last updated'], ['name', 'Name']];
const SOON_TABS = [['contacts', 'Contacts', 'Contacts'], ['automations', 'Automations', 'Automations'], ['insights', 'Insights', 'Insights'], ['pages', 'Pages', 'Pages'], ['research', 'Research Flow', 'Research Flow']] as const;

export default function Dashboard() {
  const router = useRouter();
  const toast = useToast();
  const account = useAccountName();
  const [forms, setForms] = useState<FormListItem[] | null>(null);
  const [q, setQ] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [sort, setSort] = useState<Sort>('created');
  const [sortOpen, setSortOpen] = useState(false);
  const [promo, setPromo] = useState(true);
  const [tip, setTip] = useState(true);
  const [modal, setModal] = useState<null | { kind: 'create' } | { kind: 'rename' | 'delete'; f: FormListItem }>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.listForms().then(setForms).catch((e) => { toast(e.message, 'error'); setForms([]); });
  }, [toast]);
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { const v = localStorage.getItem('dash-view'); if (v === 'grid' || v === 'list') setView(v); } catch {} }, []);
  const setViewP = (v: 'list' | 'grid') => { setView(v); try { localStorage.setItem('dash-view', v); } catch {} };

  const shown = useMemo(() => {
    const list = (forms || []).filter((f) => f.title.toLowerCase().includes(q.toLowerCase()));
    if (sort === 'name') return [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'updated') return [...list].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
    return [...list].sort((a, b) => b.id - a.id); // newest created first (ids grow with creation time)
  }, [forms, q, sort]);
  const totalResponses = (forms || []).reduce((n, f) => n + f.response_count, 0);

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
  const newForm = () => { setName(''); setModal({ kind: 'create' }); };
  const soon = (what: string) => toast(`${what} is coming soon`, 'info');

  const open = (f: FormListItem) => router.push(`/forms/${f.id}/edit`);
  const menu = (f: FormListItem) => (
    <RowMenu f={f}
      onRename={() => { setName(f.title); setModal({ kind: 'rename', f }); }}
      onDuplicate={() => run(() => api.duplicateForm(f.id), 'Form duplicated')}
      onDelete={() => setModal({ kind: 'delete', f })} />
  );
  const status = (f: FormListItem) => <span className={`pill ${f.status === 'published' ? 'live' : ''}`}>{f.status === 'published' ? 'Published' : 'Draft'}</span>;
  const rate = (f: FormListItem) => (f.started_count ? `${Math.round((f.response_count / f.started_count) * 100)}%` : '-');

  return (
    <div className="adm">
      <header className="adm-top">
        <Link href="/" className="adm-logo" aria-label="Typeform clone home"><i /></Link>
        <button className="adm-ws" onClick={() => soon('Switching accounts')}>
          <span className="adm-ws__chip">{account[0]?.toUpperCase()}</span>
          <span>{account}</span><Icon name="chevdown" size={16} stroke={1.6} />
        </button>
        <span className="spacer" />
        <button className="adm-link" onClick={() => router.push('/forms/' + (forms?.[0]?.id ?? '') + '/connect')} disabled={!forms?.length}><Icon name="apps" size={16} stroke={1.6} />Integrations</button>
        <button className="adm-link" onClick={() => soon('Brand kit')}><Icon name="brand" size={16} stroke={1.6} />Brand kit</button>
        <button className="icon-btn" aria-label="Help" onClick={() => soon('The help center')}><Icon name="help" size={20} stroke={1.5} /></button>
        <UserMenu />
      </header>

      {promo && (
        <div className="adm-promo">
          <Icon name="diamond" size={18} stroke={1.6} />
          <span>You can collect <b>unlimited form responses</b> this month for free.</span>
          <button className="adm-promo__cta" onClick={() => soon('Plans')}>Get more responses</button>
          <button className="icon-btn adm-promo__x" aria-label="Dismiss" onClick={() => setPromo(false)}><Icon name="x" size={16} stroke={1.6} /></button>
        </div>
      )}

      <nav className="adm-tabs" aria-label="Workspace sections">
        <button className="on"><Icon name="forms" size={16} stroke={1.6} />Forms</button>
        {SOON_TABS.map(([k, l, w], i) => (
          <span key={k} style={{ display: 'contents' }}>
            {k === 'research' && <span className="adm-tabs__div" />}
            <button onClick={() => soon(w)}>
              <Icon name={k} size={16} stroke={1.6} />{l}
              {k === 'insights' && <span className="adm-gem"><Icon name="diamond" size={11} stroke={1.8} /></span>}
              {k === 'pages' && <span className="adm-beta">Beta</span>}
            </button>
          </span>
        ))}
      </nav>

      <div className="adm-body">
        <aside className="adm-side">
          <div className="adm-side__sec"><button className="adm-create" onClick={newForm}><Icon name="plus" size={16} stroke={1.8} />Create form</button></div>
          <label className="adm-side__sec adm-search"><Icon name="search" size={18} stroke={1.6} /><input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search forms" /></label>
          <div className="adm-side__sec adm-ws-list">
            <div className="adm-ws-list__h"><span>Workspaces</span><button className="plus-btn" aria-label="New workspace" onClick={() => soon('Creating workspaces')}><Icon name="plus" size={16} stroke={1.8} /></button></div>
            <div className="adm-ws-list__grp"><Icon name="chevdown" size={14} stroke={1.8} />Private</div>
            <button className="adm-ws-list__it on"><span>My workspace</span><em>{forms?.length ?? 0}</em></button>
          </div>
          <div className="adm-side__sec adm-usage">
            <div>Responses collected</div>
            <div className="adm-usage__bar"><i style={{ width: `${Math.min(100, (totalResponses / 1000) * 100)}%` }} /></div>
            <div className="adm-usage__n"><b>{totalResponses}</b><span> / 1000</span></div>
            <button className="adm-usage__btn" onClick={() => soon('Plans')}>Increase response limit</button>
          </div>
          <AskAi />
        </aside>

        <main className="adm-main">
          <div className="adm-main__head">
            <h1>My workspace</h1>
            <button className="icon-btn" aria-label="Workspace options" onClick={() => soon('Workspace settings')}><Icon name="dots" size={18} /></button>
            <button className="adm-link" onClick={() => soon('Inviting teammates')}><Icon name="userplus" size={16} stroke={1.6} />Invite</button>
            <span className="adm-gem adm-gem--lg"><Icon name="diamond" size={12} stroke={1.8} /></span>
            <span className="spacer" />
            <div className="rel">
              <button className="btn" onClick={() => setSortOpen(!sortOpen)} aria-haspopup="menu" aria-expanded={sortOpen}>
                <Icon name="calendar" size={16} stroke={1.6} />{SORTS.find(([k]) => k === sort)![1]}<Icon name="chevdown" size={16} stroke={1.6} />
              </button>
              {sortOpen && (
                <div className="menu" onMouseLeave={() => setSortOpen(false)}>
                  {SORTS.map(([k, l]) => <button key={k} onClick={() => { setSort(k); setSortOpen(false); }}>{l}{k === sort && <Icon name="check" size={14} stroke={2} className="grow-end" />}</button>)}
                </div>
              )}
            </div>
            <div className="adm-seg" role="group" aria-label="View">
              <button className={view === 'list' ? 'on' : ''} onClick={() => setViewP('list')}><Icon name="list" size={16} stroke={1.6} />List</button>
              <button className={view === 'grid' ? 'on' : ''} onClick={() => setViewP('grid')}><Icon name="grid" size={16} stroke={1.6} />Grid</button>
            </div>
          </div>

          {tip && (
            <div className="adm-tip">
              <span className="adm-tip__ic"><Icon name="sparkle" size={16} stroke={1.6} /></span>
              <div><p>Gather attendee details and preferences to boost engagement and future lead generation.</p><button className="adm-usage__btn" onClick={newForm}>Create form</button></div>
              <button className="icon-btn" aria-label="Dismiss" onClick={() => setTip(false)}><Icon name="x" size={16} stroke={1.6} /></button>
            </div>
          )}

          {forms === null && [1, 2, 3].map((i) => <div key={i} className="skeleton" />)}
          {forms && shown.length === 0 && (
            <div className="empty-state">
              <h3>{q ? 'No forms match your search' : 'No forms yet'}</h3>
              <p>{q ? 'Try a different name.' : 'Create your first form to get started.'}</p>
            </div>
          )}
          {forms && shown.length > 0 && view === 'list' && (
            <div className="adm-list">
              <div className="adm-row head"><span>Form</span><span>Responses</span><span>Completed</span><span>Updated</span><span>Integrations</span><span>Actions</span></div>
              {shown.map((f) => (
                <div key={f.id} className="adm-row" onClick={() => open(f)}>
                  <span className="adm-row__form"><Thumb theme={f.theme} /><span className="adm-row__t">{f.title}</span>{status(f)}</span>
                  <Link href={`/forms/${f.id}/results`} onClick={(e) => e.stopPropagation()}>{f.response_count || '-'}</Link>
                  <span>{rate(f)}</span>
                  <span>{timeAgo(f.updated_at)}</span>
                  <span><button className="adm-ibtn" aria-label="Integrations" onClick={(e) => { e.stopPropagation(); router.push(`/forms/${f.id}/connect`); }}><Icon name="apps" size={14} stroke={1.6} /></button></span>
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
                      <div className="form-sub" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>{status(f)}{f.response_count} responses</div>
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
    </div>
  );
}
