'use client';
import { useEffect, useMemo, useState } from 'react';
import { useBuilder } from '@/hooks/useBuilder';
import FormHeader from '@/components/FormHeader';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import { api, type Webhook } from '@/lib/api';
import { useToast } from '@/components/Toast';

// Each card sends new responses to a real URL: Slack uses an incoming-webhook URL, everything else goes through a Zapier "Catch Hook" or a plain webhook.
const KIND: Record<string, 'slack' | 'zapier' | 'webhook'> = { Slack: 'slack', Zapier: 'zapier' };
const HELP = {
  slack: 'Create an Incoming Webhook in your Slack workspace (api.slack.com/messaging/webhooks) and paste its URL. Each new response is posted to that channel.',
  zapier: 'In Zapier, start a Zap with the “Webhooks by Zapier → Catch Hook” trigger and paste the webhook URL here. Zapier can then forward responses to 6,000+ apps.',
  webhook: 'We send each new response as a JSON POST to this URL (event, form, response id, answers).',
};
const APPS = [
  { n: 'Typeform contacts', d: 'Save respondents as contacts in your workspace.', c: 'Marketing', ic: 'contacts', col: '#ddd6fa' },
  { n: 'Google Sheets', d: 'Send every response to a spreadsheet row.', c: 'Analytics & reporting', ic: 'insights', col: '#cdeac8' },
  { n: 'Slack', d: 'Get a message in a channel for each new response.', c: 'Communication', ic: 'send', col: '#f8cdd8' },
  { n: 'Zapier', d: 'Connect to 6,000+ apps with automated workflows.', c: 'Automation', ic: 'automations', col: '#fedcb4' },
  { n: 'Notion', d: 'Add responses to a Notion database.', c: 'Productivity', ic: 'pages', col: '#e4e1e7' },
  { n: 'Mailchimp', d: 'Subscribe respondents to your audience.', c: 'Marketing', ic: 'userplus', col: '#fef0b5' },
];

export default function ConnectPage({ params }: { params: { id: string } }) {
  const b = useBuilder(Number(params.id));
  const toast = useToast();
  const [tab, setTab] = useState<'integrations' | 'webhooks'>('integrations');
  const [q, setQ] = useState('');
  const [hooks, setHooks] = useState<Webhook[]>([]);
  const [adding, setAdding] = useState<null | { kind: 'slack' | 'zapier' | 'webhook'; app: string }>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const fid = b.form?.id;
  useEffect(() => { if (fid) api.listWebhooks(fid).then(setHooks).catch(() => {}); }, [fid]);
  const add = async () => {
    if (!fid || !adding) return;
    setBusy(true);
    try { const w = await api.addWebhook(fid, adding.kind, url.trim()); setHooks((h) => [...h, w]); setAdding(null); setUrl(''); toast('Connected — new responses will be sent there'); }
    catch (e: any) { toast(e.message || 'Could not connect', 'error'); }
    setBusy(false);
  };
  const test = async (id: number) => { try { const w = await api.testWebhook(id); setHooks((h) => h.map((x) => (x.id === id ? w : x))); toast(`Test sent: ${w.last_status}`); } catch (e: any) { toast(e.message, 'error'); } };
  const remove = async (id: number) => { try { await api.deleteWebhook(id); setHooks((h) => h.filter((x) => x.id !== id)); toast('Connection removed'); } catch (e: any) { toast(e.message, 'error'); } };
  const list = (
    <div className="cn-card">
      <h3>Connected</h3>
      {hooks.length === 0 ? <p>Nothing connected yet. Connect an app or add a webhook to send each new response somewhere.</p> : hooks.map((w) => (
        <div className="cn-hook" key={w.id}>
          <div><b>{w.kind === 'webhook' ? 'Webhook' : w.kind[0].toUpperCase() + w.kind.slice(1)}</b><span>{w.url.replace(/^(https?:\/\/[^/]+\/).*$/, '$1…')}</span>
            {w.last_status && <em>Last delivery: {w.last_status}</em>}</div>
          <button className="btn" onClick={() => test(w.id)}>Send test</button>
          <button className="btn" onClick={() => remove(w.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
  const [cat, setCat] = useState('All');
  const cats = useMemo(() => ['All', ...Array.from(new Set(APPS.map((a) => a.c)))], []);
  const shown = APPS.filter((a) => (cat === 'All' || a.c === cat) && a.n.toLowerCase().includes(q.toLowerCase()));
  const count = (c: string) => (c === 'All' ? APPS.length : APPS.filter((a) => a.c === c).length);

  return (
    <>
      <FormHeader b={b} tab="connect" />
      <div className="cn">
        <div className="cn-tabs">
          <button className={tab === 'integrations' ? 'on' : ''} onClick={() => setTab('integrations')}>Integrations</button>
          <button className={tab === 'webhooks' ? 'on' : ''} onClick={() => setTab('webhooks')}>Webhooks</button>
        </div>
        {tab === 'webhooks' ? (
          <div className="cn-wrap"><div className="cn-main" style={{ gridColumn: '1/-1' }}>
            <div className="cn-card">
              <h3>Webhooks</h3>
              <p>Send each new response to your own endpoint as a JSON POST.</p>
              <div className="cn-row" style={{ marginTop: 16 }}><span /><button className="btn primary" onClick={() => { setUrl(''); setAdding({ kind: 'webhook', app: 'Webhook' }); }}>Add webhook</button></div>
            </div>
            {list}
          </div></div>
        ) : (
          <div className="cn-wrap">
            <aside className="cn-side">
              <h1>Connect Typeform to your favorite apps</h1>
              <p>Create automated, efficient workflows that work for you.</p>
              <label className="cn-search"><Icon name="search" size={18} stroke={1.6} />
                <input placeholder="Search integrations" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search integrations" />
                {q && <button aria-label="Clear" onClick={() => setQ('')}><Icon name="x" size={14} stroke={1.8} /></button>}
              </label>
              <h4>Categories</h4>
              {cats.map((c) => (
                <button key={c} className={`cn-cat ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}><span>{c}</span><em>{count(c)}</em></button>
              ))}
            </aside>
            <div className="cn-main">
              <div className="cn-card">
                <h3><Icon name="sparkle" size={18} stroke={1.5} />Generate a custom flow with Zapier AI</h3>
                <p>Describe what you want to do with your data</p>
                <textarea placeholder="E.g. When the typeform is submitted, check if leads exist in Salesforce and send details to Slack" aria-label="Describe your flow" />
                <div className="cn-row"><span>Powered by <b>_zapier</b></span>
                  <button className="btn" onClick={() => { setUrl(''); setAdding({ kind: 'zapier', app: 'Zapier' }); }}>Connect Zapier</button></div>
              </div>
              {list}
              {shown.map((a) => (
                <div className="cn-card cn-app" key={a.n}>
                  <span className="cn-app__ic" style={{ background: a.col }}><Icon name={a.ic} size={22} stroke={1.5} /></span>
                  <div><h3>{a.n}</h3><p>{a.d}</p></div>
                  <button className="btn" onClick={() => { setUrl(''); setAdding({ kind: KIND[a.n] || 'zapier', app: a.n }); }}>Connect</button>
                </div>
              ))}
              {shown.length === 0 && <div className="cn-card"><p>No integrations match your search.</p></div>}
            </div>
          </div>
        )}
      </div>
      {adding && (
        <Modal title={`Connect ${adding.app}`} onClose={() => setAdding(null)} footer={<><button className="btn" onClick={() => setAdding(null)}>Cancel</button>
          <button className="btn primary" disabled={busy || url.trim().length < 8} onClick={add}>{busy ? 'Connecting…' : 'Connect'}</button></>}>
          <p className="muted" style={{ marginBottom: 12 }}>{HELP[adding.kind]}{!KIND[adding.app] && adding.kind === 'zapier' && adding.app !== 'Zapier' ? ` Then add a ${adding.app} action to that Zap.` : ''}</p>
          <input className="field" autoFocus placeholder={adding.kind === 'slack' ? 'https://hooks.slack.com/services/…' : adding.kind === 'zapier' ? 'https://hooks.zapier.com/hooks/catch/…' : 'https://your-server.com/hook'}
            value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} aria-label="Webhook URL" />
        </Modal>
      )}
    </>
  );
}
