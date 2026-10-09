'use client';
import { useBuilder } from '@/hooks/useBuilder';
import FormHeader from '@/components/FormHeader';

const ITEMS = [['Google Sheets', 'GS'], ['Slack', 'Sl'], ['Webhooks', '{ }'], ['Zapier', 'Z'], ['Notion', 'N'], ['Mailchimp', 'Mc']];

export default function ConnectPage({ params }: { params: { id: string } }) {
  const b = useBuilder(Number(params.id));
  return (
    <>
      <FormHeader b={b} tab="connect" />
      <div className="share-box" style={{ maxWidth: 860 }}>
        <h2>Connect</h2>
        <p className="muted">Send responses to the tools you already use. Integrations and webhooks are placeholders in this version.</p>
        <div className="integ">
          {ITEMS.map(([n, ic]) => (
            <div className="it" key={n}><div className="ic">{ic}</div><div style={{ flex: 1 }}><b>{n}</b><div><span className="pill soon">Coming soon</span></div></div></div>
          ))}
        </div>
      </div>
    </>
  );
}
