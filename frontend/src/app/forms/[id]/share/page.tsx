'use client';
import { useBuilder } from '@/hooks/useBuilder';
import FormHeader, { CopyLink } from '@/components/FormHeader';
import { useState } from 'react';

export default function SharePage({ params }: { params: { id: string } }) {
  const b = useBuilder(Number(params.id));
  const [busy, setBusy] = useState(false);
  const f = b.form;
  return (
    <>
      <FormHeader b={b} tab="share" />
      {f && (
        <div className="share-box">
          <h2>Share your form</h2>
          {f.status === 'published' ? (
            <>
              <p className="muted">Your form is live. Anyone with the link can respond — no account needed.</p>
              <CopyLink slug={f.slug} />
              <div className="row" style={{ marginBottom: 28 }}>
                <a className="btn" href={`/to/${f.slug}`} target="_blank" rel="noreferrer">Open live form</a>
                <button className="btn" onClick={b.unpublish}>Unpublish</button>
              </div>
              <label className="label">Embed code</label>
              <textarea className="field" readOnly rows={3} onFocus={(e) => e.target.select()}
                value={`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/to/${f.slug}" width="100%" height="600" style="border:0" allowfullscreen></iframe>`} />
            </>
          ) : (
            <>
              <p className="muted" style={{ marginBottom: 18 }}>This form is a draft. Publish it to get a shareable public link.</p>
              <button className="btn primary" disabled={busy} onClick={async () => { setBusy(true); await b.publish(); setBusy(false); }}>Publish form</button>
            </>
          )}
          <div className="soon-box" style={{ marginTop: 36, textAlign: 'left' }}>
            <b style={{ color: 'var(--ink)' }}>Access settings</b> <span className="pill soon">Coming soon</span>
            <p style={{ marginTop: 6 }}>Password protection, response limits, close date, team collaboration and sharing.</p>
          </div>
        </div>
      )}
    </>
  );
}
