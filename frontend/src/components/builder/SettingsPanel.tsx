'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import Modal from '../Modal';
import { newTempId } from '@/hooks/useBuilder';
import type { Builder } from '@/hooks/useBuilder';
import { useToast } from '../Toast';
import { QUESTION_TYPES, TYPE_META } from '@/lib/questionTypes';
import { FONTS, THEMES } from '@/lib/themes';
import type { Question, QType, Rule, RuleOp, Theme } from '@/lib/types';
import type { Sel } from './QuestionList';

const Switch = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button className={`switch ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
);

/* ---------------- Settings ---------------- */
const Info = ({ tip }: { tip: string }) => <span className="rp-info" title={tip}><Icon name="info" size={16} stroke={1.5} /></span>;
const Soon = ({ label, tip }: { label: string; tip: string }) => (
  <div className="rp-row off" title={tip}><span>{label}</span><button className="switch" role="switch" aria-checked={false} aria-label={label} disabled /></div>
);

/** Answer-type picker styled like Typeform's: a coloured icon chip and the type name. */
function TypeSelect({ q, b }: { q: Question; b: Builder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);
  const cur = TYPE_META[q.type];
  return (
    <div className="rp-sel" ref={ref}>
      <button className="rp-sel__b" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="rp-chip" style={{ background: cur.color }}><Icon name={cur.icon} size={18} stroke={1.6} /></span>
        <span className="rp-sel__t">{cur.label}</span><Icon name="chevdown" size={18} stroke={1.6} className="grow-end" />
      </button>
      {open && (
        <div className="rp-sel__m" role="listbox">
          {QUESTION_TYPES.map((t) => (
            <button key={t.type} role="option" aria-selected={t.type === q.type} className={t.type === q.type ? 'on' : ''}
              onClick={() => { setOpen(false); if (t.type !== q.type) b.changeType(q.id, t.type); }}>
              <span className="rp-chip" style={{ background: t.color }}><Icon name={t.icon} size={18} stroke={1.6} /></span>{t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionPanes({ b, q }: { b: Builder; q: Question }) {
  const toast = useToast();
  const set = (settings: Record<string, any>) => b.updateQuestion(q.id, { settings: { ...q.settings, ...settings } });
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
  const text = ['short_text', 'long_text', 'email'].includes(q.type);
  return (
    <>
      <section className="bd-pane rp-pane">
        <div className="rp-title">Question<Info tip="What respondents see: the question title and its description" /></div>
        <div className="rp-seg" role="tablist">
          <button role="tab" aria-selected className="on"><Icon name="short" size={16} stroke={1.6} />Text</button>
          <button role="tab" aria-selected={false} onClick={() => toast('Video questions are not available in this clone', 'info')}><Icon name="video" size={16} stroke={1.6} />Video</button>
        </div>
      </section>
      <section className="bd-pane bd-set">
        <div className="panel rp-answer">
          <div className="rp-title">Answer</div>
          <TypeSelect q={q} b={b} />
          <div className="rp-rows">
            <Soon label="Map to contacts" tip="Contacts are not available in this clone" />
            <div className="rp-row"><span>Required</span><Switch on={q.required} label="Required" onChange={(v) => b.updateQuestion(q.id, { required: v })} /></div>
            {q.type === 'multiple_choice' && <div className="rp-row"><span>Multiple selection</span><Switch on={!!q.settings.allow_multiple} label="Multiple selection" onChange={(v) => set({ allow_multiple: v })} /></div>}
            {text && <Soon label="Max characters" tip="Character limits are not available in this clone" />}
            {q.type === 'rating' && (
              <div className="rp-row"><span>Steps</span>
                <select className="field rp-small" value={q.settings.steps || 5} onChange={(e) => set({ steps: Number(e.target.value) })} aria-label="Rating steps">
                  {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n}>{n}</option>)}</select></div>
            )}
            {q.type === 'number' && (
              <div className="rp-row2">
                <label>Min<input className="field" type="number" value={q.settings.min ?? ''} onChange={(e) => set({ min: num(e.target.value) })} /></label>
                <label>Max<input className="field" type="number" value={q.settings.max ?? ''} onChange={(e) => set({ max: num(e.target.value) })} /></label>
              </div>
            )}
            {['short_text', 'long_text', 'email', 'number', 'dropdown'].includes(q.type) && (
              <label className="rp-field">Placeholder text<input className="field" maxLength={200} value={q.settings.placeholder ?? ''} onChange={(e) => set({ placeholder: e.target.value })} /></label>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function ScreenPanes({ b, kind }: { b: Builder; kind: 'welcome' | 'end' }) {
  const f = b.form!;
  const welcome = kind === 'welcome';
  const btn = f.welcome_button || '';
  return (
    <>
      <section className="bd-pane rp-pane rp-top">
        <div className="rp-sel"><div className="rp-sel__b static">
          <span className="rp-chip gray"><Icon name={welcome ? 'welcome' : 'flag'} size={18} stroke={1.5} /></span>
          <span className="rp-sel__t">{welcome ? 'Welcome Screen' : 'Ending'}</span><Icon name="chevdown" size={18} stroke={1.6} className="grow-end" />
        </div></div>
      </section>
      <section className="bd-pane bd-set">
        <div className="panel rp-answer">
          {welcome ? (
            <>
              <div className="rp-rows first">
                <div className="rp-row"><span>Show welcome screen</span><Switch on={f.welcome_enabled} label="Show welcome screen" onChange={(v) => b.updateForm({ welcome_enabled: v })} /></div>
                <Soon label="Time to complete" tip="Always shown on the welcome screen in this clone" />
                <Soon label="Number of submissions" tip="Not available in this clone" />
              </div>
              <label className="rp-field big">Button
                <input className="field" maxLength={24} value={btn} onChange={(e) => b.updateForm({ welcome_button: e.target.value })} />
                <small>{btn.length}/24</small></label>
            </>
          ) : <p className="rp-note">Respondents see this screen after they submit. Edit the title and description on the canvas.</p>}
          <div className="rp-line"><span>Image or video</span><button className="plus-btn" aria-label="Add image or video" disabled title="Media is not available in this clone"><Icon name="plus" size={16} stroke={1.8} /></button></div>
        </div>
      </section>
    </>
  );
}

/* ---------------- Design ---------------- */
function Design({ b }: { b: Builder }) {
  const t = b.form!.theme;
  const set = (patch: Partial<Theme>) => b.updateForm({ theme: { ...t, ...patch } });
  const colors: [keyof Theme, string][] = [['background', 'Background'], ['text', 'Questions'], ['answer', 'Answers'], ['button', 'Buttons'], ['buttonText', 'Button text']];
  return (
    <>
      <div className="psec"><h4>Themes</h4>
        <div className="themes">
          {THEMES.map(({ name, theme }) => (
            <button key={name} className={`theme-card ${t.preset === theme.preset ? 'on' : ''}`} onClick={() => b.updateForm({ theme })}>
              <div className="sw" style={{ background: theme.background, color: theme.text, fontFamily: `'${theme.font}'` }}>
                <b>Aa</b><i style={{ background: theme.button }} /></div>
              <span className="nm">{name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="psec"><h4>Font</h4>
        <select className="field" value={t.font} onChange={(e) => set({ font: e.target.value, preset: 'custom' })} aria-label="Font">
          {FONTS.map((f) => <option key={f}>{f}</option>)}
        </select>
      </div>
      <div className="psec"><h4>Colors</h4>
        {colors.map(([k, label]) => (
          <div className="color-row" key={k}><span>{label}</span>
            <input type="color" value={t[k]} aria-label={label} onChange={(e) => set({ [k]: e.target.value, preset: 'custom' })} /></div>
        ))}
      </div>
    </>
  );
}

/* ---------------- Logic (basic branching) ---------------- */
const OPS: Record<RuleOp, string> = { equals: 'is', not_equals: 'is not', contains: 'contains', greater_than: 'is greater than', less_than: 'is less than' };
const opsFor = (t: QType): RuleOp[] =>
  t === 'number' || t === 'rating' ? ['equals', 'not_equals', 'greater_than', 'less_than']
  : t === 'multiple_choice' ? ['equals', 'not_equals', 'contains'] : ['short_text', 'long_text', 'email'].includes(t) ? ['equals', 'not_equals', 'contains'] : ['equals', 'not_equals'];

/** The jump-rule editor. Used by the Logic side panel and by the Workflow tab's Logic dialog. */
export function RulesEditor({ q, qs, rules, onChange }: { q: Question; qs: Question[]; rules: Rule[]; onChange: (rules: Rule[]) => void }) {
  const later = qs.slice(qs.findIndex((x) => x.id === q.id) + 1);
  const upd = (id: number, patch: Partial<Rule>) => onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const add = () => onChange([...rules, {
    id: newTempId(), op: 'equals', value: q.type === 'yes_no' ? 'yes' : q.type === 'rating' ? '5' : q.choices[0]?.label ?? '',
    action: later.length > 1 ? 'jump' : 'end', target_question_id: later.length > 1 ? later[1].id : null,
  }]);
  const valueInput = (r: Rule) =>
    q.type === 'yes_no' ? <select className="field" value={r.value} onChange={(e) => upd(r.id, { value: e.target.value })} aria-label="Value"><option value="yes">Yes</option><option value="no">No</option></select>
    : q.choices.length && ['multiple_choice', 'dropdown'].includes(q.type)
      ? <select className="field" value={r.value} onChange={(e) => upd(r.id, { value: e.target.value })} aria-label="Value">{!q.choices.some((c) => c.label === r.value) && <option value={r.value}>{r.value || 'Select…'}</option>}{q.choices.map((c) => <option key={c.id}>{c.label}</option>)}</select>
      : <input className="field" value={r.value} placeholder="Value" onChange={(e) => upd(r.id, { value: e.target.value })} aria-label="Value" />;
  return (
    <>
      {rules.map((r) => (
        <div className="rule" key={r.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 12 }}>IF answer</b>
            <button className="icon-btn" style={{ width: 24, height: 24 }} aria-label="Remove rule" onClick={() => onChange(rules.filter((x) => x.id !== r.id))}><Icon name="x" size={14} /></button></div>
          <select className="field" value={r.op} onChange={(e) => upd(r.id, { op: e.target.value as RuleOp })} aria-label="Condition">
            {opsFor(q.type).map((o) => <option key={o} value={o}>{OPS[o]}</option>)}</select>
          {valueInput(r)}
          <b style={{ fontSize: 12, display: 'block', marginTop: 8 }}>THEN</b>
          <select className="field" aria-label="Action" value={r.action === 'end' ? 'end' : String(r.target_question_id ?? '')}
            onChange={(e) => e.target.value === 'end' ? upd(r.id, { action: 'end', target_question_id: null }) : upd(r.id, { action: 'jump', target_question_id: Number(e.target.value) })}>
            {r.action === 'jump' && !later.some((x) => x.id === r.target_question_id) && <option value="">Select a question…</option>}
            {later.map((x) => <option key={x.id} value={x.id}>Jump to {qs.indexOf(x) + 1}. {(x.title || 'Untitled').slice(0, 28)}</option>)}
            <option value="end">End the form</option>
          </select>
        </div>
      ))}
      <button className="btn sm" onClick={add}><Icon name="plus" size={14} />Add rule</button>
    </>
  );
}

function Logic({ b, q }: { b: Builder; q: Question }) {
  return (
    <>
      <div className="psec"><h4>Jump rules</h4>
        <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>Send respondents to a different question based on how they answer this one. First matching rule wins; otherwise they continue to the next question.</p>
        <RulesEditor q={q} qs={b.form!.questions} rules={q.rules} onChange={(rules) => b.updateQuestion(q.id, { rules })} />
      </div>
      <div className="soon-box"><span className="pill soon">Coming soon</span><p style={{ marginTop: 8 }}>Advanced logic: variables, calculations, and hidden fields.</p></div>
    </>
  );
}

export type PanelTab = 'settings' | 'design' | 'logic';

export default function SettingsPanel({ b, sel, tab, onTab, onDelete }: {
  b: Builder; sel: Sel | null; tab: PanelTab; onTab: (t: PanelTab) => void; onDelete: (id: number) => void; onDuplicate?: (id: number) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const q = typeof sel === 'number' ? b.form!.questions.find((x) => x.id === sel) : undefined;
  const active = tab === 'logic' && !q ? 'settings' : tab;
  return (
    <aside className="bd-right">
      {active === 'design' ? (
        <section className="bd-pane bd-set">
          <div className="rp-head"><b>Design</b><button className="icon-btn" aria-label="Close design" onClick={() => onTab('settings')}><Icon name="x" size={18} stroke={1.6} /></button></div>
          <div className="panel"><Design b={b} /></div>
        </section>
      ) : active === 'logic' && q ? (
        <section className="bd-pane bd-set">
          <div className="rp-head"><b>Logic</b><button className="icon-btn" aria-label="Close logic" onClick={() => onTab('settings')}><Icon name="x" size={18} stroke={1.6} /></button></div>
          <div className="panel"><Logic b={b} q={q} /></div>
        </section>
      ) : q ? <QuestionPanes b={b} q={q} />
        : sel === 'welcome' || sel === 'end' ? <ScreenPanes b={b} kind={sel} />
        : <section className="bd-pane bd-set"><div className="panel"><div className="soon-box">Select a question to see its settings.</div></div></section>}
      {active !== 'design' && active !== 'logic' && (
        <>
          <section className="bd-pane bd-logicbar">
            <span>Logic</span>
            <button className="plus-btn" aria-label="Open logic" disabled={!q} title={q ? 'Add jump rules' : 'Select a question first'} onClick={() => onTab('logic')}><Icon name="plus" size={16} stroke={1.8} /></button>
          </section>
          <section className="bd-pane bd-logicbar rp-cm"><span>Comments</span><span className="rp-badge" title="Comments are not available in this clone"><Icon name="badge" size={20} stroke={1.5} /></span></section>
        </>
      )}
      {confirm && q && (
        <Modal title="Delete this question?" onClose={() => setConfirm(false)}
          footer={<><button className="btn" onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn danger" onClick={() => { setConfirm(false); onDelete(q.id); }}>Delete</button></>}>
          <p>Existing responses to this question will also be removed.</p>
        </Modal>
      )}
    </aside>
  );
}
