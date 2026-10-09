'use client';
import { useCallback, useEffect, useState } from 'react';
import FormHeader from '@/components/FormHeader';
import Icon from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { useBuilder } from '@/hooks/useBuilder';
import { api } from '@/lib/api';
import { fmtAnswer, fmtDate, fmtDuration } from '@/lib/format';
import { TYPE_META } from '@/lib/questionTypes';
import type { Form, FormResponse, Summary } from '@/lib/types';

function SummaryView({ s, form }: { s: Summary; form: Form }) {
  const color = form.theme.answer;
  return (
    <>
      {s.questions.map((q, i) => {
        const total = q.counts?.reduce((a, c) => a + c.count, 0) || 0;
        return (
          <div className="qcard" key={q.id}>
            <h4><em>{i + 1}</em>{q.title || 'Untitled question'}</h4>
            <div className="meta">{TYPE_META[q.type].label} · {q.answered} answered · {q.skipped} skipped</div>
            {q.counts && q.counts.map((c) => (
              <div className="bar" key={c.label}>
                <span className="lbl" title={c.label}>{c.label}</span>
                <div className="track"><div className="fill" style={{ width: `${total ? (c.count / total) * 100 : 0}%`, background: color }} /></div>
                <span className="n">{c.count} · {total ? Math.round((c.count / total) * 100) : 0}%</span>
              </div>
            ))}
            {q.type === 'rating' && <p style={{ marginTop: 12 }}>Average rating: <b className="big-num" style={{ fontSize: 22 }}>{q.average ?? '—'}</b></p>}
            {q.type === 'number' && (
              <div className="row" style={{ gap: 40 }}>
                {[['Average', q.average], ['Min', q.min], ['Max', q.max]].map(([l, v]) => <div key={String(l)}><div className="muted">{l}</div><div className="big-num">{v ?? '—'}</div></div>)}
              </div>
            )}
            {q.latest && (q.latest.length ? <ul className="latest">{q.latest.map((t, j) => <li key={j}>{t}</li>)}</ul> : <p className="muted">No answers yet.</p>)}
          </div>
        );
      })}
    </>
  );
}

function Drawer({ form, items, index, onClose, onNav, onDelete }: {
  form: Form; items: FormResponse[]; index: number; onClose: () => void; onNav: (i: number) => void; onDelete: (r: FormResponse) => void;
}) {
  const r = items[index];
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <>
      <div className="drawer-ov" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Response details">
        <div className="drawer-head">
          <div style={{ flex: 1 }}><b>Response #{r.id}</b><div className="muted" style={{ fontSize: 12 }}>{r.status === 'completed' ? `Submitted ${fmtDate(r.submitted_at)}` : `Started ${fmtDate(r.started_at)} · not completed`}</div></div>
          <button className="icon-btn" disabled={index === 0} onClick={() => onNav(index - 1)} aria-label="Previous response"><Icon name="up" /></button>
          <button className="icon-btn" disabled={index === items.length - 1} onClick={() => onNav(index + 1)} aria-label="Next response"><Icon name="down" /></button>
          <button className="icon-btn" onClick={() => onDelete(r)} aria-label="Delete response"><Icon name="trash" /></button>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="drawer-body">
          {form.questions.map((q, i) => {
            const a = r.answers[String(q.id)];
            return (<div key={q.id}><div className="ans-q">{i + 1}. {q.title || 'Untitled question'}</div><div className={`ans-a ${a === undefined ? 'none' : ''}`}>{fmtAnswer(a)}</div></div>);
          })}
        </div>
      </aside>
    </>
  );
}

function ResponsesView({ form }: { form: Form }) {
  const toast = useToast();
  const [filter, setFilter] = useState<'' | 'completed' | 'partial'>('');
  const [items, setItems] = useState<FormResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async (offset = 0) => {
    setLoading(true);
    try {
      const p = await api.responses(form.id, filter || undefined, offset);
      setItems((x) => (offset ? [...x, ...p.items] : p.items)); setTotal(p.total);
    } catch (e: any) { toast(e.message, 'error'); }
    setLoading(false);
  }, [form.id, filter, toast]);
  useEffect(() => { load(0); }, [load]);

  const remove = async (r: FormResponse) => {
    try { await api.deleteResponse(form.id, r.id); setOpen(null); toast('Response deleted'); load(0); } catch (e: any) { toast(e.message, 'error'); }
  };
  const cols = form.questions;
  return (
    <>
      <div className="res-tabs" style={{ marginTop: -6 }}>
        <div className="seg">{([['', 'All'], ['completed', 'Completed'], ['partial', 'Partial']] as const).map(([k, l]) =>
          <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>)}</div>
        <span className="muted">{total} response{total !== 1 && 's'}</span>
        <span className="spacer" />
        <a className="btn sm" href={api.csvUrl(form.id)}><Icon name="download" size={14} />Export CSV</a>
      </div>
      {!loading && items.length === 0 ? (
        <div className="empty-state"><h3>No responses yet</h3><p>{form.status === 'published' ? 'Share your link to start collecting responses.' : 'Publish your form to start collecting responses.'}</p></div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>#</th><th>Status</th><th>Date</th>{cols.map((q) => <th key={q.id} title={q.title}>{q.title || 'Untitled'}</th>)}</tr></thead>
            <tbody>
              {items.map((r, i) => (
                <tr key={r.id} className="r" onClick={() => setOpen(i)}>
                  <td>{r.id}</td>
                  <td><span className={`pill ${r.status === 'completed' ? 'live' : ''}`}>{r.status === 'completed' ? 'Completed' : 'Partial'}</span></td>
                  <td>{fmtDate(r.submitted_at || r.started_at)}</td>
                  {cols.map((q) => <td key={q.id}>{fmtAnswer(r.answers[String(q.id)])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {items.length < total && <div style={{ textAlign: 'center', marginTop: 16 }}><button className="btn" disabled={loading} onClick={() => load(items.length)}>Load more</button></div>}
      {open !== null && items[open] && <Drawer form={form} items={items} index={open} onClose={() => setOpen(null)} onNav={setOpen} onDelete={remove} />}
    </>
  );
}

export default function ResultsPage({ params }: { params: { id: string } }) {
  const b = useBuilder(Number(params.id));
  const [tab, setTab] = useState<'summary' | 'responses'>('summary');
  const [s, setS] = useState<Summary | null>(null);
  const toast = useToast();
  useEffect(() => { api.summary(Number(params.id)).then(setS).catch((e) => toast(e.message, 'error')); }, [params.id, tab, toast]);
  const f = b.form;
  return (
    <>
      <FormHeader b={b} tab="results" />
      {f && (
        <div className="res">
          {s && (
            <div className="stats">
              <div className="stat"><span>Views</span><b>{s.views}</b></div>
              <div className="stat"><span>Starts</span><b>{s.starts}</b></div>
              <div className="stat"><span>Responses</span><b>{s.completions}</b></div>
              <div className="stat"><span>Completion rate</span><b>{s.completion_rate}%</b></div>
              <div className="stat"><span>Average time</span><b>{fmtDuration(s.avg_time_seconds)}</b></div>
            </div>
          )}
          <div className="res-tabs">
            <button className={tab === 'summary' ? 'on' : ''} onClick={() => setTab('summary')}>Summary</button>
            <button className={tab === 'responses' ? 'on' : ''} onClick={() => setTab('responses')}>Responses</button>
          </div>
          {tab === 'summary' ? (s ? (s.completions === 0 ? <div className="empty-state"><h3>No responses yet</h3><p>Summary stats appear here once people submit your form.</p></div> : <SummaryView s={s} form={f} />) : null) : <ResponsesView form={f} />}
        </div>
      )}
    </>
  );
}
