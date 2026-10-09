'use client';
import { useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';
import Modal from './Modal';
import FormRunner from './runner/FormRunner';
import { useToast } from './Toast';
import { publicUrl } from '@/lib/api';
import type { Builder } from '@/hooks/useBuilder';

const TABS = [['edit', 'Create'], ['connect', 'Connect'], ['share', 'Share'], ['results', 'Results']] as const;

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

export default function FormHeader({ b, tab }: { b: Builder; tab: (typeof TABS)[number][0] }) {
  const { form } = b;
  const toast = useToast();
  const [preview, setPreview] = useState(false);
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
          <Link href="/dashboard" className="icon-btn" aria-label="Back to workspace" title="Back to workspace"><Icon name="left" /></Link>
          <input className="fh-title" value={form.title} maxLength={200} aria-label="Form name" size={Math.min(Math.max(form.title.length, 6), 32)}
            onChange={(e) => b.updateForm({ title: e.target.value })}
            onBlur={() => !form.title.trim() && b.updateForm({ title: 'Untitled form' })} />
          <span className={`pill ${form.status === 'published' ? 'live' : ''}`}>{form.status === 'published' ? 'Published' : 'Draft'}</span>
        </div>
        <nav className="fh-tabs">
          {TABS.map(([k, l]) => <Link key={k} href={`/forms/${form.id}/${k}`} className={tab === k ? 'on' : ''}>{l}</Link>)}
        </nav>
        <div className="fh-right">
          <span className="saving">{label}</span>
          <button className="btn" onClick={() => form.questions.length ? setPreview(true) : toast('Add a question to preview', 'info')}><Icon name="eye" size={16} />Preview</button>
          {form.status === 'published'
            ? <><button className="btn" onClick={() => setShareOpen(true)}><Icon name="link" size={16} />Link</button>
                <button className="btn" onClick={b.unpublish}>Unpublish</button></>
            : <button className="btn primary" disabled={busy} onClick={doPublish}>{busy ? 'Publishing…' : 'Publish'}</button>}
        </div>
      </header>
      {preview && <div className="tf-fullscreen"><FormRunner key={Date.now()} form={form} mode="preview" onClose={() => setPreview(false)} /></div>}
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
