'use client';
import { useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';
import Modal from './Modal';
import UserMenu from './UserMenu';
import { useToast } from './Toast';
import { publicUrl } from '@/lib/api';
import type { Builder } from '@/hooks/useBuilder';

const TABS = [['edit', 'Content'], ['workflow', 'Workflow'], ['connect', 'Connect'], ['results', 'Results']] as const;
type Tab = (typeof TABS)[number][0] | 'share';

export function CopyLink({ slug }: { slug: string }) {
  const toast = useToast();
  const url = publicUrl(slug);
  return (
    <div className="linkbar">
      <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Public link" />
      <button className="btn primary" onClick={() => { navigator.clipboard?.writeText(url); toast('Link copied to clipboard'); }}><Icon name="copy" size={16} />Copy</button>
    </div>
  );
}

export default function FormHeader({ b, tab }: { b: Builder; tab: Tab }) {
  const { form } = b;
  const toast = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!form) return <div className="fh" />;

  const doPublish = async () => {
    setBusy(true);
    if (await b.publish()) setShareOpen(true);
    setBusy(false);
  };
  const label = { idle: '', saving: 'Saving…', saved: 'All changes saved', error: 'Not saved' }[b.status];

  return (
    <>
      <header className="fh">
        <div className="fh-left">
          <Link href="/dashboard" className="fh-crumb" title="Back to workspace"><Icon name="forms" size={18} stroke={1.6} />Forms</Link>
          <Icon name="chevright" size={14} stroke={1.8} className="fh-sep" />
          <input className="fh-title" value={form.title} maxLength={200} aria-label="Form name" size={Math.min(Math.max(form.title.length, 6), 32)}
            onChange={(e) => b.updateForm({ title: e.target.value })}
            onBlur={() => !form.title.trim() && b.updateForm({ title: 'Untitled form' })} />
        </div>
        <nav className="fh-tabs">
          {TABS.map(([k, l]) => k === 'workflow'
            ? <button key={k} onClick={() => toast('Workflows are coming soon', 'info')}>{l}</button>
            : <Link key={k} href={`/forms/${form.id}/${k}`} className={tab === k ? 'on' : ''}>{l}</Link>)}
        </nav>
        <div className="fh-right">
          <span className="saving">{label}</span>
          <Link href={`/forms/${form.id}/share`} className={`btn ${tab === 'share' ? 'primary' : ''}`}><Icon name="send" size={16} stroke={1.6} />Share</Link>
          <span className="fh-divider" />
          {form.status === 'published'
            ? <button className="btn" onClick={b.unpublish}>Unpublish</button>
            : <button className="btn green" disabled={busy} onClick={doPublish}>{busy ? 'Publishing…' : 'Publish'}</button>}
          <button className="icon-btn" aria-label="Help" onClick={() => toast('Help center is coming soon', 'info')}><Icon name="help" size={20} stroke={1.5} /></button>
          <UserMenu />
        </div>
      </header>
      {shareOpen && (
        <Modal title="🎉 Your form is live!" onClose={() => setShareOpen(false)} footer={
          <><a className="btn" href={`/to/${form.slug}`} target="_blank" rel="noreferrer"><Icon name="external" size={16} />Open form</a>
            <button className="btn primary" onClick={() => setShareOpen(false)}>Done</button></>}>
          <p className="muted">Anyone with this link can fill in your form — no login required.</p>
          <CopyLink slug={form.slug} />
        </Modal>
      )}
    </>
  );
}
