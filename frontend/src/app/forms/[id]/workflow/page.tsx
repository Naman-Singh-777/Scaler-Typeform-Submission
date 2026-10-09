'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import AiChat from '@/components/AiChat';
import FormHeader from '@/components/FormHeader';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import FormRunner from '@/components/runner/FormRunner';
import { useToast } from '@/components/Toast';
import { useBuilder } from '@/hooks/useBuilder';
import { TYPE_META } from '@/lib/questionTypes';
import type { Question } from '@/lib/types';

type TagRule = { tag: string; qid: number | null; op: string; value: string };
type TagGroup = { id: number; name: string; rules: TagRule[]; other: string };
type Outcome = { id: number; title: string; min: number; max: number };
type Local = { tags: TagGroup[]; scores: Record<string, number>; outcomes: Outcome[]; vars: { name: string; value: string }[]; hidden: string[]; labels: boolean };
const EMPTY: Local = { tags: [{ id: 1, name: 'Lead quality', rules: [{ tag: 'High', qid: null, op: 'equals', value: '' }], other: 'Low' }], scores: {}, outcomes: [], vars: [{ name: 'score', value: '0' }], hidden: [], labels: true };

const ENG = (f: string) => (
  <span className="wf-app">
    {f === 'sheets' && <svg width="18" height="18" viewBox="0 0 24 24"><path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#0f9d58" /><path d="M8 11h8v7H8zM8 14.500h8M12 11v7" stroke="#fff" strokeWidth="1.300" fill="none" /></svg>}
    {f === 'excel' && <svg width="18" height="18" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="#1d6f42" /><path d="m8 8 8 8m0-8-8 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>}
    {f === 'zap' && <svg width="18" height="18" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="4" fill="#ff4a00" /><path d="M12 6v12M6 12h12M7.800 7.800l8.400 8.400m0-8.400-8.400 8.400" stroke="#fff" strokeWidth="1.700" strokeLinecap="round" /></svg>}
  </span>
);
const NODE_W = 340, NODE_H = 56, GAP = 56;

export default function WorkflowPage({ params }: { params: { id: string } }) {
  const b = useBuilder(Number(params.id));
  const toast = useToast();
  const { form } = b;
  const key = `tf_wf_${params.id}`;
  const [local, setLocal] = useState<Local>(EMPTY);
  const [modal, setModal] = useState<null | 'tag' | 'score' | 'outcome' | 'vars' | 'hidden' | 'settings'>(null);
  const [zoom, setZoom] = useState(1);
  const [hand, setHand] = useState(false);
  const [preview, setPreview] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { try { const s = localStorage.getItem(key); if (s) setLocal({ ...EMPTY, ...JSON.parse(s) }); } catch {} }, [key]);
  const save = (n: Local) => { setLocal(n); try { localStorage.setItem(key, JSON.stringify(n)); } catch {} };
  useEffect(() => { if (form) document.title = `${form.title} — Workflow`; }, [form?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  const qs = form?.questions || [];
  const hasQ = qs.length > 0;
  const start = !!form?.welcome_enabled;
  // vertical chain: [welcome?] q1..qn [thank you]
  const nodes = useMemo(() => {
    const list: { key: string; label: string; sub: string; icon: string; q?: Question }[] = [];
    if (start) list.push({ key: 'welcome', label: form!.welcome_title || 'Welcome screen', sub: 'Welcome screen', icon: 'welcome' });
    qs.forEach((q, i) => list.push({ key: `q${q.id}`, label: q.title || 'Untitled question', sub: `${i + 1}`, icon: TYPE_META[q.type]?.icon || 'short', q }));
    list.push({ key: 'end', label: form?.thankyou_title || 'Thank you', sub: 'Thank you screen', icon: 'flag' });
    return list;
  }, [qs, start, form?.welcome_title, form?.thankyou_title]); // eslint-disable-line react-hooks/exhaustive-deps
  const idx = (k: string) => nodes.findIndex((n) => n.key === k);
  const y = (i: number) => 40 + i * (NODE_H + GAP);
  const H = y(nodes.length) + 20, W = 640, CX = 120;

  const arcs = nodes.flatMap((n, i) => (n.q ? n.q.rules.map((r, j) => ({ i, j, to: r.action === 'end' ? nodes.length - 1 : idx(`q${r.target_question_id}`), label: `${r.op.replace('_', ' ')} “${r.value}”` })) : [])).filter((a) => a.to >= 0);

  const togglePan = () => setHand((h) => !h);
  const drag = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const onDown = (e: React.MouseEvent) => { if (!hand || !box.current) return; drag.current = { x: e.clientX, y: e.clientY, sl: box.current.scrollLeft, st: box.current.scrollTop }; };
  const onMove = (e: React.MouseEvent) => { const d = drag.current; if (!d || !box.current) return; box.current.scrollLeft = d.sl - (e.clientX - d.x); box.current.scrollTop = d.st - (e.clientY - d.y); };

  if (b.loadError) return <div className="center-page"><div><h2>Form not found</h2><a className="btn primary" href="/dashboard">Back to workspace</a></div></div>;

  return (
    <>
      <FormHeader b={b} tab="workflow" />
      <div className="wf">
        <section className="wf-main">
          <div className="wf-bar">
            <button className="wf-t on" disabled={!hasQ}>Logic</button>
            <button className="wf-t" disabled={!hasQ} onClick={() => setModal('score')}>Scoring</button>
            <button className="wf-t" onClick={() => setModal('tag')}>Tagging</button>
            <button className="wf-t" onClick={() => setModal('outcome')}>Outcome quiz</button>
            <span className="tb-sep" />
            <button className="tb-ico" aria-label="Preview form" title="Preview" onClick={() => hasQ ? setPreview(true) : toast('Add a question to preview', 'info')}><Icon name="play" size={18} stroke={1.6} /></button>
            <span className="tb-sep" />
            <button className="tb-ico" aria-label="Variables" title="Variables" onClick={() => setModal('vars')}><Icon name="fx" size={18} stroke={1.6} /></button>
            <button className="tb-ico" aria-label="Hidden fields" title="Hidden fields" onClick={() => setModal('hidden')}><Icon name="cycle" size={18} stroke={1.6} /></button>
            <button className="tb-ico" aria-label="Workflow settings" title="Settings" onClick={() => setModal('settings')}><Icon name="settings" size={18} stroke={1.6} /></button>
          </div>
          <div className={`wf-canvas ${hand ? 'pan' : ''}`} ref={box} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={() => (drag.current = null)} onMouseLeave={() => (drag.current = null)}>
            {hasQ ? (
              <div className="wf-stage" style={{ width: W * zoom, height: H * zoom }}>
                <div style={{ width: W, height: H, transform: `scale(${zoom})`, transformOrigin: '0 0', position: 'relative' }}>
                  <svg width={W} height={H} className="wf-svg">
                    <defs><marker id="wfa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1l8 4-8 4z" fill="#8a8590" /></marker>
                      <marker id="wfb" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1l8 4-8 4z" fill="#7a5af8" /></marker></defs>
                    {nodes.slice(0, -1).map((_, i) => <path key={i} d={`M${CX + NODE_W / 2} ${y(i) + NODE_H} V${y(i + 1)}`} stroke="#8a8590" strokeWidth="1.5" fill="none" markerEnd="url(#wfa)" />)}
                    {arcs.map((a, k) => {
                      const x0 = CX + NODE_W, y0 = y(a.i) + NODE_H / 2, y1 = y(a.to) + NODE_H / 2, bend = 50 + a.j * 22 + Math.min(Math.abs(a.to - a.i) * 8, 60);
                      return <g key={k}><path d={`M${x0} ${y0} C${x0 + bend} ${y0} ${x0 + bend} ${y1} ${x0} ${y1}`} stroke="#7a5af8" strokeWidth="1.5" strokeDasharray="5 4" fill="none" markerEnd="url(#wfb)" />
                        {local.labels && <text x={x0 + bend + 6} y={(y0 + y1) / 2} fontSize="11" fill="#6b4fd8">{a.label}</text>}</g>;
                    })}
                  </svg>
                  {nodes.map((n, i) => (
                    <Link key={n.key} href={`/forms/${form!.id}/edit`} className={`wf-node ${n.key === 'end' ? 'end' : ''} ${n.q ? '' : 'sys'}`} style={{ left: CX, top: y(i), width: NODE_W, height: NODE_H }} title="Edit in Content">
                      <span className="wf-ni"><Icon name={n.icon} size={16} stroke={1.6} /></span>
                      <span className="wf-nt"><b>{n.q ? `${n.sub} →` : n.sub}</b> {n.q ? n.label : (n.key === 'end' ? n.label : '')}</span>
                      {n.q && n.q.rules.length > 0 && <span className="wf-nr"><Icon name="branch" size={12} stroke={1.8} />{n.q.rules.length}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            ) : <p className="wf-empty">Add questions in <Link href={`/forms/${params.id}/edit`}>Content</Link> or describe your form below to build your logic map.</p>}
          </div>
          <div className="wf-chat"><AiChat b={b} variant="bar" placeholder="Chat to create" /></div>
          <div className="wf-zoom">
            <button aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}><Icon name="zoomout" size={18} stroke={1.6} /></button>
            <button aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))}><Icon name="zoomin" size={18} stroke={1.6} /></button>
            <button aria-label="Fit to screen" onClick={() => setZoom(1)}><Icon name="fit" size={18} stroke={1.6} /></button>
            <button aria-label="Pan mode" className={hand ? 'on' : ''} onClick={togglePan}><Icon name="hand" size={18} stroke={1.6} /></button>
          </div>
        </section>

        <aside className="wf-act">
          <h3>Actions</h3>
          <div className="wf-cards">
            <Link href={`/forms/${params.id}/connect`} className="wf-card">
              <Icon name="apps" size={22} stroke={1.5} /><b>Connect</b>
              <span className="wf-apps">{ENG('sheets')}{ENG('excel')}{ENG('zap')}<i className="wf-plus"><Icon name="plus" size={14} stroke={1.8} /></i></span>
            </Link>
            <Link href={`/forms/${params.id}/connect`} className="wf-card">
              <Icon name="automations" size={22} stroke={1.5} /><b>Automations <em>New</em></b>
              <p>Activate automations based on submissions to this form.</p>
              <span className="wf-apps"><i className="wf-ic"><Icon name="envelope" size={16} stroke={1.5} /></i><i className="wf-ic"><Icon name="webhook" size={16} stroke={1.5} /></i><i className="wf-plus"><Icon name="plus" size={14} stroke={1.8} /></i></span>
            </Link>
            <Link href={`/forms/${params.id}/connect`} className="wf-card">
              <Icon name="contacts" size={22} stroke={1.5} /><b>Contacts</b>
              <p>Map form responses to create or update your contacts.</p>
            </Link>
          </div>
        </aside>
      </div>

      {modal === 'tag' && <TagModal local={local} save={save} qs={qs} onClose={() => setModal(null)} />}
      {modal === 'score' && (
        <Modal title="Scoring" width={720} onClose={() => setModal(null)} footer={<button className="btn primary" onClick={() => setModal(null)}>Done</button>}>
          <p className="muted" style={{ marginBottom: 12 }}>Assign points to questions to calculate a score for each respondent.</p>
          {qs.map((q, i) => <label key={q.id} className="wf-row"><span>{i + 1}. {q.title}</span><input type="number" className="field" style={{ width: 90 }} value={local.scores[q.id] ?? 0} onChange={(e) => save({ ...local, scores: { ...local.scores, [q.id]: Number(e.target.value) } })} aria-label={`Points for question ${i + 1}`} /></label>)}
        </Modal>
      )}
      {modal === 'outcome' && (
        <Modal title="Outcome quiz" width={720} onClose={() => setModal(null)} footer={<button className="btn primary" onClick={() => setModal(null)}>Done</button>}>
          <p className="muted" style={{ marginBottom: 12 }}>Show respondents a different ending depending on their score.</p>
          {local.outcomes.map((o) => (
            <div key={o.id} className="wf-row">
              <input className="field" value={o.title} aria-label="Outcome name" onChange={(e) => save({ ...local, outcomes: local.outcomes.map((x) => (x.id === o.id ? { ...x, title: e.target.value } : x)) })} />
              <input type="number" className="field" style={{ width: 80 }} value={o.min} aria-label="From score" onChange={(e) => save({ ...local, outcomes: local.outcomes.map((x) => (x.id === o.id ? { ...x, min: Number(e.target.value) } : x)) })} />
              <span>to</span>
              <input type="number" className="field" style={{ width: 80 }} value={o.max} aria-label="To score" onChange={(e) => save({ ...local, outcomes: local.outcomes.map((x) => (x.id === o.id ? { ...x, max: Number(e.target.value) } : x)) })} />
              <button className="icon-btn" aria-label="Delete outcome" onClick={() => save({ ...local, outcomes: local.outcomes.filter((x) => x.id !== o.id) })}><Icon name="trash" size={16} stroke={1.6} /></button>
            </div>
          ))}
          <button className="btn" onClick={() => save({ ...local, outcomes: [...local.outcomes, { id: Date.now(), title: `Outcome ${local.outcomes.length + 1}`, min: 0, max: 10 }] })}><Icon name="plus" size={16} stroke={1.8} />Add outcome</button>
        </Modal>
      )}
      {(modal === 'vars' || modal === 'hidden') && <ListModal kind={modal} local={local} save={save} onClose={() => setModal(null)} />}
      {modal === 'settings' && (
        <Modal title="Workflow settings" width={480} onClose={() => setModal(null)} footer={<button className="btn primary" onClick={() => setModal(null)}>Done</button>}>
          <label className="wf-row"><span>Show rule labels on the canvas</span><input type="checkbox" checked={local.labels} onChange={(e) => save({ ...local, labels: e.target.checked })} /></label>
        </Modal>
      )}
      {preview && form && <div className="tf-fullscreen"><FormRunner key={Date.now()} form={form} mode="preview" onClose={() => setPreview(false)} /></div>}
    </>
  );
}

function ListModal({ kind, local, save, onClose }: { kind: 'vars' | 'hidden'; local: Local; save: (l: Local) => void; onClose: () => void }) {
  const [v, setV] = useState('');
  const vars = kind === 'vars';
  const add = () => {
    const name = v.trim().replace(/\s+/g, '_'); if (!name) return;
    save(vars ? { ...local, vars: [...local.vars, { name, value: '0' }] } : { ...local, hidden: [...local.hidden, name] }); setV('');
  };
  return (
    <Modal title={vars ? 'Variables' : 'Hidden fields'} width={520} onClose={onClose} footer={<button className="btn primary" onClick={onClose}>Done</button>}>
      <p className="muted" style={{ marginBottom: 12 }}>{vars ? 'Variables store values such as scores that you can use in your logic.' : 'Hidden fields carry extra information in the form URL, like a source or user id.'}</p>
      {(vars ? local.vars.map((x) => x.name) : local.hidden).map((n, i) => (
        <div key={n + i} className="wf-row"><code>{vars ? `{{var:${n}}}` : `#${n}`}</code>
          {!(vars && n === 'score') && <button className="icon-btn" aria-label={`Remove ${n}`} onClick={() => save(vars ? { ...local, vars: local.vars.filter((x) => x.name !== n) } : { ...local, hidden: local.hidden.filter((x) => x !== n) })}><Icon name="trash" size={16} stroke={1.6} /></button>}</div>
      ))}
      <div className="wf-row"><input className="field" placeholder={vars ? 'New variable name' : 'New hidden field name'} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn" onClick={add}><Icon name="plus" size={16} stroke={1.8} />Add</button></div>
    </Modal>
  );
}

function TagModal({ local, save, qs, onClose }: { local: Local; save: (l: Local) => void; qs: Question[]; onClose: () => void }) {
  const [sel, setSel] = useState(local.tags[0]?.id ?? 0);
  const g = local.tags.find((t) => t.id === sel);
  const up = (patch: Partial<TagGroup>) => save({ ...local, tags: local.tags.map((t) => (t.id === sel ? { ...t, ...patch } : t)) });
  const addGroup = () => { const id = Date.now(); save({ ...local, tags: [...local.tags, { id, name: `Tag group ${local.tags.length + 1}`, rules: [{ tag: '', qid: null, op: 'equals', value: '' }], other: '' }] }); setSel(id); };
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wf-tagm" role="dialog" aria-modal="true" aria-label="Tagging">
        <div className="wf-tagh"><div><h2>Tagging</h2><p>Create groups of tags to help with segmenting respondents, triggering personalized messages, and analyzing results.</p></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button></div>
        <div className="wf-tagb">
          <aside><div className="wf-tagg"><b>Tag groups</b><button aria-label="Add tag group" onClick={addGroup}><Icon name="plus" size={16} stroke={1.8} /></button></div>
            {local.tags.map((t) => <button key={t.id} className={t.id === sel ? 'on' : ''} onClick={() => setSel(t.id)}>{t.name}</button>)}</aside>
          {g ? (
            <div className="wf-tagp">
              <input className="wf-tagn" value={g.name} onChange={(e) => up({ name: e.target.value })} aria-label="Group name" />
              {g.rules.map((r, i) => (
                <div key={i} className="wf-tagr">
                  <label><em>Tag as<i>*</i></em><input className="field" value={r.tag} placeholder="e.g. High" onChange={(e) => up({ rules: g.rules.map((x, j) => (j === i ? { ...x, tag: e.target.value } : x)) })} /></label>
                  <label><em>When<i>*</i></em>
                    <select className="field" value={r.qid ?? ''} onChange={(e) => up({ rules: g.rules.map((x, j) => (j === i ? { ...x, qid: e.target.value ? Number(e.target.value) : null } : x)) })}>
                      <option value="">Select a condition</option>{qs.map((q, n) => <option key={q.id} value={q.id}>{n + 1}. {q.title}</option>)}</select></label>
                  {r.qid != null && <label><em />  <span className="wf-cond">
                    <select className="field" value={r.op} onChange={(e) => up({ rules: g.rules.map((x, j) => (j === i ? { ...x, op: e.target.value } : x)) })}><option value="equals">is</option><option value="not_equals">is not</option><option value="contains">contains</option><option value="greater_than">is greater than</option><option value="less_than">is less than</option></select>
                    <input className="field" value={r.value} placeholder="value" onChange={(e) => up({ rules: g.rules.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} /></span></label>}
                  <button className="wf-del" onClick={() => up({ rules: g.rules.filter((_, j) => j !== i) })}><Icon name="trash" size={16} stroke={1.6} />Delete rule</button>
                </div>
              ))}
              <button className="btn" onClick={() => up({ rules: [...g.rules, { tag: '', qid: null, op: 'equals', value: '' }] })}><Icon name="plus" size={16} stroke={1.8} />Add rule</button>
              <label className="wf-other"><em>All other cases tag as</em><input className="field" value={g.other} onChange={(e) => up({ other: e.target.value })} /></label>
            </div>
          ) : <div className="wf-tagp muted">Create a tag group to get started.</div>}
        </div>
      </div>
    </div>
  );
}
