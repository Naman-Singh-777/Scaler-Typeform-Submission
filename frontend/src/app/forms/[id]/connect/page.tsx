'use client';
import { useMemo, useState } from 'react';
import { useBuilder } from '@/hooks/useBuilder';
import FormHeader from '@/components/FormHeader';
import Icon from '@/components/Icon';
import { useToast } from '@/components/Toast';

// Placeholder catalogue (the assignment allows integrations/webhooks to be "Coming soon").
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
          <div className="cn-wrap"><div className="cn-card" style={{ gridColumn: '1/-1' }}>
            <h3>Webhooks <span className="pill soon">Coming soon</span></h3>
            <p>Send each new response to your own endpoint as a signed HTTP POST. This is a placeholder in this version.</p>
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
                  <button className="btn" onClick={() => toast('Zapier AI is coming soon', 'info')}>Generate flow</button></div>
              </div>
              {shown.map((a) => (
                <div className="cn-card cn-app" key={a.n}>
                  <span className="cn-app__ic" style={{ background: a.col }}><Icon name={a.ic} size={22} stroke={1.5} /></span>
                  <div><h3>{a.n}</h3><p>{a.d}</p></div>
                  <button className="btn" onClick={() => toast(`${a.n} is coming soon`, 'info')}>Connect</button>
                </div>
              ))}
              {shown.length === 0 && <div className="cn-card"><p>No integrations match your search.</p></div>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
