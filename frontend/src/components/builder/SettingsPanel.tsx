'use client';
import { useState } from 'react';
import Icon from '../Icon';
import Modal from '../Modal';
import { newTempId } from '@/hooks/useBuilder';
import type { Builder } from '@/hooks/useBuilder';
import { QUESTION_TYPES } from '@/lib/questionTypes';
import { FONTS, THEMES } from '@/lib/themes';
import type { Question, QType, Rule, RuleOp, Theme } from '@/lib/types';
import type { Sel } from './QuestionList';

const Switch = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button className={`switch ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
);

/* ---------------- Settings ---------------- */
function QuestionSettings({ b, q, onDelete, onDuplicate }: { b: Builder; q: Question; onDelete: () => void; onDuplicate: () => void }) {
  const set = (settings: Record<string, any>) => b.updateQuestion(q.id, { settings: { ...q.settings, ...settings } });
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
  return (
    <>
      <div className="psec">
        <label className="label" htmlFor="qtype">Question type</label>
        <select id="qtype" className="field" value={q.type} onChange={(e) => b.changeType(q.id, e.target.value as QType)}>
          {QUESTION_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
        </select>
      </div>
      <div className="psec">
        <h4>Settings</h4>
        <div className="prow"><span><b>Required</b><div className="muted" style={{ fontSize: 12 }}>Respondents must answer</div></span>
          <Switch on={q.required} label="Required" onChange={(v) => b.updateQuestion(q.id, { required: v })} /></div>
        {q.type === 'multiple_choice' && (
          <div className="prow"><span><b>Multiple selection</b><div className="muted" style={{ fontSize: 12 }}>Allow more than one choice</div></span>
            <Switch on={!!q.settings.allow_multiple} label="Multiple selection" onChange={(v) => set({ allow_multiple: v })} /></div>
        )}
        {q.type === 'rating' && (
          <div className="prow"><b>Steps</b>
            <select className="field" style={{ width: 90 }} value={q.settings.steps || 5} onChange={(e) => set({ steps: Number(e.target.value) })} aria-label="Rating steps">
              {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n}>{n}</option>)}
            </select></div>
        )}
        {q.type === 'number' && (
          <div className="row" style={{ marginTop: 6 }}>
            <div><label className="label">Min</label><input className="field" type="number" value={q.settings.min ?? ''} onChange={(e) => set({ min: num(e.target.value) })} /></div>
            <div><label className="label">Max</label><input className="field" type="number" value={q.settings.max ?? ''} onChange={(e) => set({ max: num(e.target.value) })} /></div>
          </div>
        )}
        {['short_text', 'long_text', 'email', 'number', 'dropdown'].includes(q.type) && (
          <div style={{ marginTop: 10 }}><label className="label" htmlFor="ph">Placeholder text</label>
            <input id="ph" className="field" maxLength={200} value={q.settings.placeholder ?? ''} onChange={(e) => set({ placeholder: e.target.value })} /></div>
        )}
      </div>
      <div className="psec">
        <h4>Actions</h4>
        <div className="row"><button className="btn sm" onClick={onDuplicate}><Icon name="copy" size={14} />Duplicate</button>
          <button className="btn sm" style={{ color: 'var(--red)' }} onClick={onDelete}><Icon name="trash" size={14} />Delete</button></div>
      </div>
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

function Logic({ b, q }: { b: Builder; q: Question }) {
  const qs = b.form!.questions;
  const later = qs.slice(qs.indexOf(q) + 1);
  const setRules = (rules: Rule[]) => b.updateQuestion(q.id, { rules });
  const upd = (id: number, patch: Partial<Rule>) => setRules(q.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const add = () => setRules([...q.rules, {
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
      <div className="psec"><h4>Jump rules</h4>
        <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>Send respondents to a different question based on how they answer this one. First matching rule wins; otherwise they continue to the next question.</p>
        {q.rules.map((r) => (
          <div className="rule" key={r.id}>
            <div className="row" style={{ justifyContent: 'space-between' }}><b style={{ fontSize: 12 }}>IF answer</b>
              <button className="icon-btn" style={{ width: 24, height: 24 }} aria-label="Remove rule" onClick={() => setRules(q.rules.filter((x) => x.id !== r.id))}><Icon name="x" size={14} /></button></div>
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
      </div>
      <div className="soon-box"><span className="pill soon">Coming soon</span><p style={{ marginTop: 8 }}>Advanced logic: variables, calculations, and hidden fields.</p></div>
    </>
  );
}

export type PanelTab = 'settings' | 'design' | 'logic';

export default function SettingsPanel({ b, sel, tab, onTab, onDelete, onDuplicate }: {
  b: Builder; sel: Sel | null; tab: PanelTab; onTab: (t: PanelTab) => void; onDelete: (id: number) => void; onDuplicate: (id: number) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const q = typeof sel === 'number' ? b.form!.questions.find((x) => x.id === sel) : undefined;
  const active = tab === 'logic' && !q ? 'settings' : tab;
  return (
    <aside className="bd-right">
      <section className="bd-pane bd-set">
        <div className="tabs" role="tablist">
          <button role="tab" className={active === 'settings' ? 'on' : ''} onClick={() => onTab('settings')}>Settings</button>
          <button role="tab" className={active === 'design' ? 'on' : ''} onClick={() => onTab('design')}>Design</button>
        </div>
        <div className="panel">
          {active === 'design' ? <Design b={b} />
            : active === 'logic' && q ? <Logic b={b} q={q} />
            : q ? <QuestionSettings b={b} q={q} onDuplicate={() => onDuplicate(q.id)} onDelete={() => setConfirm(true)} />
            : <div className="soon-box">{sel === 'welcome' ? 'Edit your welcome screen on the canvas. Use the switch to show or hide it.'
                : sel === 'end' ? 'Edit your thank-you screen on the canvas. Respondents see it after submitting.' : 'Select a question to see its settings.'}</div>}
        </div>
      </section>
      <section className={`bd-pane bd-logicbar ${active === 'logic' ? 'on' : ''}`}>
        <span>Logic</span>
        <button className="plus-btn" aria-label="Open logic" disabled={!q} title={q ? 'Add jump rules' : 'Select a question first'} onClick={() => onTab('logic')}><Icon name="plus" size={16} stroke={1.8} /></button>
      </section>
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
