'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import AiChat from '@/components/AiChat';
import FormHeader from '@/components/FormHeader';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import LogicModal from '@/components/workflow/LogicModal';
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
type P = { x: number; y: number };
const NW = 264, NH = 84, GAP = 110, START_W = 188, START_H = 64;
const OPLBL: Record<string, string> = { equals: 'is', not_equals: 'is not', contains: 'contains', greater_than: '>', less_than: '<' };

export default function WorkflowPage({ params }: { params: { id: string } }) {
  const b = useBuilder(Number(params.id));
  const toast = useToast();
  const { form } = b;
  const key = `tf_wf_${params.id}`;
  const [local, setLocal] = useState<Local>(EMPTY);
  const [modal, setModal] = useState<null | 'tag' | 'score' | 'outcome' | 'vars' | 'hidden' | 'settings'>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [hand, setHand] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [logicFor, setLogicFor] = useState<number | null>(null);
  const [pos, setPos] = useState<Record<string, P>>({});
  const [preview, setPreview] = useState(false);
  const vp = useRef<HTMLDivElement>(null);

  useEffect(() => { try { const s = localStorage.getItem(key); if (s) setLocal({ ...EMPTY, ...JSON.parse(s) }); const p = localStorage.getItem(`tf_wfpos_${params.id}`); if (p) setPos(JSON.parse(p)); } catch {} }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = (n: Local) => { setLocal(n); try { localStorage.setItem(key, JSON.stringify(n)); } catch {} };
  useEffect(() => { if (form) document.title = `${form.title} — Workflow`; }, [form?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  const qs = form?.questions || [];
  const hasQ = qs.length > 0;
  const start = !!form?.welcome_enabled;
  // horizontal chain: [Pull data in] [welcome?] q1..qn [thank you]
  const nodes = useMemo(() => {
    const list: { key: string; label: string; sub: string; icon: string; color: string; num: number; q?: Question }[] = [];
    if (start) list.push({ key: 'welcome', label: form!.welcome_title || 'Welcome screen', sub: 'Welcome screen', icon: 'welcome', color: '#8a8590', num: 0 });
    qs.forEach((q, i) => list.push({ key: `q${q.id}`, label: q.title || 'Your question here', sub: `${i + 1}`, icon: TYPE_META[q.type]?.icon || 'short', color: TYPE_META[q.type]?.color || '#8a8590', num: i + 1, q }));
    list.push({ key: 'end', label: form?.thankyou_title || 'Thank you screen', sub: 'Thank you screen', icon: 'flag', color: '#8a8590', num: 0 });
    return list;
  }, [qs, start, form?.welcome_title, form?.thankyou_title]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = (key: string): P => key === 'start' ? { x: 0, y: (NH - START_H) / 2 } : { x: START_W + GAP + nodes.findIndex((n) => n.key === key) * (NW + GAP), y: 0 };
  const rect = (key: string): P => pos[key] || base(key);
  const selNode = nodes.find((n) => n.key === sel);

  const edge = (a: string, b2: string, aw: number, ah: number, bh: number) => {
    const A = rect(a), B = rect(b2), ax = A.x + aw, ay = A.y + ah / 2, bx = B.x, by = B.y + bh / 2, dx = Math.max(40, Math.abs(bx - ax) / 2);
    return { d: `M${ax} ${ay} C${ax + dx} ${ay} ${bx - dx} ${by} ${bx} ${by}`, mx: (ax + bx) / 2, my: (ay + by) / 2 };
  };
  const chain = ['start', ...nodes.map((n) => n.key)];
  const links = chain.slice(0, -1).map((k, i) => ({ k: `${k}>${chain[i + 1]}`, ...edge(k, chain[i + 1], k === 'start' ? START_W : NW, k === 'start' ? START_H : NH, NH) }));
  const bubbles = nodes.filter((n) => n.q).map((n) => { const i = chain.indexOf(n.key); const l = links[i]; return { k: n.key, x: l.mx, y: l.my, qid: n.q!.id, count: n.q!.rules.length }; });
  const arcs = nodes.flatMap((n) => (n.q ? n.q.rules.flatMap((r, j) => {
    const to = r.action === 'end' ? 'end' : `q${r.target_question_id}`;
    if (!nodes.some((x) => x.key === to)) return [];
    const A = rect(n.key), B = rect(to), sx = A.x + NW / 2, sy = A.y + NH, tx = B.x + NW / 2, ty = B.y + NH, dep = 70 + j * 20 + Math.min(Math.abs(tx - sx) / 12, 50), low = Math.max(sy, ty);
    return [{ k: `${n.key}-${r.id}`, d: `M${sx} ${sy} C${sx} ${low + dep} ${tx} ${low + dep} ${tx} ${ty + 2}`, lx: (sx + tx) / 2, ly: low + dep * 0.75 + 14, label: `${OPLBL[r.op]} “${r.value}”` }];
  }) : []));

  /* ---- canvas: pan, ctrl+wheel zoom around the pointer, drag nodes ---- */
  const zoomAt = (px: number, py: number, f: number) => setView((v) => { const k = Math.min(2, Math.max(0.25, v.k * f)); const r = k / v.k; return { k, x: px - (px - v.x) * r, y: py - (py - v.y) * r }; });
  const zoomBy = (f: number) => { const r = vp.current?.getBoundingClientRect(); zoomAt((r?.width || 0) / 2, (r?.height || 0) / 2, f); };
  const fit = () => {
    const el = vp.current; if (!el || !nodes.length) return;
    const keys = ['start', ...nodes.map((n) => n.key)];
    const rs = keys.map((k) => ({ ...rect(k), w: k === 'start' ? START_W : NW, h: k === 'start' ? START_H : NH }));
    const minX = Math.min(...rs.map((r) => r.x)), maxX = Math.max(...rs.map((r) => r.x + r.w)), minY = Math.min(...rs.map((r) => r.y)) - 60, maxY = Math.max(...rs.map((r) => r.y + r.h)) + 140;
    const W = el.clientWidth, H = el.clientHeight, k = Math.min(1, Math.max(0.25, Math.min((W - 80) / (maxX - minX), (H - 160) / (maxY - minY))));
    setView({ k, x: (W - (maxX - minX) * k) / 2 - minX * k, y: Math.max(24, (H - (maxY - minY) * k) / 2 - minY * k - 20) });
  };
  useEffect(() => { // zoom with ctrl/⌘ + wheel (or pinch), scroll to pan
    const el = vp.current; if (!el) return;
    const h = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) { const r = el.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.01)); }
      else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, [hasQ]);
  const fitted = useRef(false);
  useEffect(() => { if (hasQ && !fitted.current) { fitted.current = true; requestAnimationFrame(() => { const el = vp.current; if (el) setView({ k: 1, x: 56, y: Math.max(60, el.clientHeight / 2 - NH / 2 - 40) }); }); } }, [hasQ]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && !logicFor && setSel(null); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [logicFor]);

  const pan = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const [panning, setPanning] = useState(false);
  const onVpDown = (e: React.PointerEvent) => { if (e.button !== 0) return; pan.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); };
  const onVpMove = (e: React.PointerEvent) => {
    const d = pan.current; if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4) return;
    d.moved = true; setPanning(true); setView((v) => ({ ...v, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }));
  };
  const onVpUp = () => { const d = pan.current; pan.current = null; setPanning(false); if (d && !d.moved) setSel(null); };
  const drag = useRef<{ key: string; x: number; y: number; o: P; moved: boolean } | null>(null);
  const nodeDown = (e: React.PointerEvent, key: string) => {
    if (e.button !== 0 || hand) return; // in hand mode the whole canvas moves instead
    e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { key, x: e.clientX, y: e.clientY, o: rect(key), moved: false };
    const mv = (ev: PointerEvent) => {
      const d = drag.current; if (!d) return;
      if (!d.moved && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 4) return;
      d.moved = true; setPos((p) => ({ ...p, [d.key]: { x: d.o.x + (ev.clientX - d.x) / view.k, y: d.o.y + (ev.clientY - d.y) / view.k } }));
    };
    const el = e.currentTarget as HTMLElement;
    el.addEventListener('pointermove', mv);
    el.addEventListener('pointerup', () => el.removeEventListener('pointermove', mv), { once: true });
  };
  const nodeUp = (e: React.PointerEvent, key: string) => {
    if (hand) return;
    const d = drag.current; drag.current = null; e.stopPropagation();
    if (d && d.moved) { setPos((p) => { try { localStorage.setItem(`tf_wfpos_${params.id}`, JSON.stringify(p)); } catch {} return p; }); return; }
    if (key === 'start') setModal('hidden'); else setSel(key);
  };

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
          <div className={`wfc ${hand ? 'hand' : ''} ${panning ? 'panning' : ''}`} ref={vp} onPointerDown={onVpDown} onPointerMove={onVpMove} onPointerUp={onVpUp} onPointerCancel={onVpUp}
            style={{ backgroundSize: `${20 * view.k}px ${20 * view.k}px`, backgroundPosition: `${view.x}px ${view.y}px` }}>
            {hasQ ? (
              <div className="wfc-layer" style={{ transform: `translate(${view.x}px,${view.y}px) scale(${view.k})` }}>
                <svg className="wfc-svg" width="1" height="1">
                  <defs>
                    <marker id="wfa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 1l8 4-8 4z" fill="#9a949d" /></marker>
                    <marker id="wfb" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 1l8 4-8 4z" fill="#7a5af8" /></marker>
                  </defs>
                  {links.map((l) => <path key={l.k} d={l.d} stroke="#9a949d" strokeWidth="1.5" fill="none" markerEnd="url(#wfa)" />)}
                  {arcs.map((a) => (
                    <g key={a.k}>
                      <path d={a.d} stroke="#7a5af8" strokeWidth="1.5" strokeDasharray="5 4" fill="none" markerEnd="url(#wfb)" />
                      {local.labels && <text x={a.lx} y={a.ly} textAnchor="middle" fontSize="12" fill="#6b4fd8">{a.label}</text>}
                    </g>
                  ))}
                </svg>
                <button className="wfc-pull" style={{ left: rect('start').x, top: rect('start').y, width: START_W, height: START_H }} onPointerDown={(e) => nodeDown(e, 'start')} onPointerUp={(e) => nodeUp(e, 'start')}>
                  <Icon name="pull" size={20} stroke={1.5} /><span>Pull data in</span><i><Icon name="plus" size={14} stroke={1.8} /></i>
                </button>
                {nodes.map((n) => {
                  const r = rect(n.key);
                  return (
                    <div key={n.key} role="button" tabIndex={0} aria-label={`${n.sub} ${n.label}`} aria-pressed={sel === n.key}
                      className={`wfc-n ${sel === n.key ? 'sel' : ''} ${n.q ? '' : 'sys'}`} style={{ left: r.x, top: r.y, width: NW, height: NH }}
                      onPointerDown={(e) => nodeDown(e, n.key)} onPointerUp={(e) => nodeUp(e, n.key)} onDoubleClick={() => n.q && setLogicFor(n.q.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') n.q ? setLogicFor(n.q.id) : setSel(n.key); }}>
                      <span className="wfc-chip" style={{ background: n.color }}><Icon name={n.icon} size={16} stroke={1.6} />{n.q && <b>{n.num}</b>}</span>
                      <span className="wfc-t">{n.label}</span>
                    </div>
                  );
                })}
                {bubbles.map((bb) => (
                  <button key={bb.k} className="wfc-bub" style={{ left: bb.x, top: bb.y }} aria-label={bb.count ? `${bb.count} branching rules` : 'Add branching'} title="Branching"
                    onPointerDown={(e) => e.stopPropagation()} onClick={() => setLogicFor(bb.qid)}>
                    <Icon name="branch" size={14} stroke={1.8} />{bb.count > 0 && <b>{bb.count}</b>}
                  </button>
                ))}
                {selNode?.q && (
                  <div className="wfc-bar" style={{ left: rect(selNode.key).x + NW / 2, top: rect(selNode.key).y - 10 }} onPointerDown={(e) => e.stopPropagation()}>
                    <button aria-label="Hide answer choices" title="Hide answer choices (not available yet)" disabled><Icon name="eyeoff" size={18} stroke={1.6} /></button>
                    <button aria-label="Branching" title="Branching" onClick={() => setLogicFor(selNode.q!.id)}><Icon name="branch" size={18} stroke={1.6} /></button>
                    <button aria-label="Calculations" title="Calculations (not available yet)" disabled><Icon name="calc" size={18} stroke={1.6} /></button>
                  </div>
                )}
              </div>
            ) : <p className="wf-empty">Add questions in <Link href={`/forms/${params.id}/edit`}>Content</Link> or describe your form below to build your logic map.</p>}
          </div>
          <div className="wf-chat"><AiChat b={b} variant="bar" placeholder="Chat to create" /></div>
          <div className="wf-zoom" role="toolbar" aria-label="Canvas controls">
            <button aria-label="Zoom out" title="Zoom out" onClick={() => zoomBy(1 / 1.2)}><Icon name="zoomout" size={18} stroke={1.6} /></button>
            <button aria-label="Zoom in" title="Zoom in" onClick={() => zoomBy(1.2)}><Icon name="zoomin" size={18} stroke={1.6} /></button>
            <button aria-label="Fit to screen" title="Fit to screen" onClick={fit}><Icon name="fit" size={18} stroke={1.6} /></button>
            <span className="zsep" />
            <button aria-label={hand ? 'Switch to select mode' : 'Switch to hand mode'} title={hand ? 'Hand: drag to move the canvas' : 'Select: drag nodes, drag the background to pan'} className={hand ? 'on' : ''} onClick={() => setHand((h) => !h)}><Icon name={hand ? 'hand' : 'mouse'} size={18} stroke={1.6} /></button>
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

      {logicFor != null && <LogicModal qs={qs} initialId={logicFor} onClose={() => setLogicFor(null)} onSave={(ch) => { ch.forEach((c) => b.updateQuestion(c.id, { rules: c.rules })); setLogicFor(null); toast('Logic saved'); }} />}
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
