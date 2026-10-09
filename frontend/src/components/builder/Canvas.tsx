'use client';
import { useEffect, useRef } from 'react';
import Icon from '../Icon';
import { letter } from '../runner/QuestionInput';
import { themeVars } from '@/lib/themes';
import { newTempId } from '@/hooks/useBuilder';
import type { Builder } from '@/hooks/useBuilder';
import type { Question } from '@/lib/types';
import type { Sel } from './QuestionList';

function Auto({ value, onChange, placeholder, className, label, single = true }: {
  value: string; onChange: (v: string) => void; placeholder: string; className: string; label: string; single?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }, [value]);
  return (
    <textarea ref={ref} rows={1} className={`cv-edit ${className}`} value={value} placeholder={placeholder} aria-label={label}
      onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (single && e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur(); } }} />
  );
}

function ChoiceEditor({ q, b, onLogic }: { q: Question; b: Builder; onLogic?: () => void }) {
  const set = (choices: Question['choices']) => b.updateQuestion(q.id, { choices });
  return (
    <div>
      {q.choices.map((c, i) => (
        <div className="cv-choice" key={c.id}>
          <div className="tf-choice">
            <span className="key">{letter(i)}</span>
            <input value={c.label} placeholder={`Choice ${i + 1}`} aria-label={`Choice ${i + 1}`} maxLength={300}
              onChange={(e) => set(q.choices.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)))}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); set([...q.choices.slice(0, i + 1), { id: newTempId(), label: '' }, ...q.choices.slice(i + 1)]); } }} />
          </div>
          <button className="cv-act" aria-label="Remove choice" title="Remove choice" disabled={q.choices.length <= 1} onClick={() => set(q.choices.filter((x) => x.id !== c.id))}><Icon name="xcircle" size={18} stroke={1.6} /></button>
          {onLogic && <button className="cv-act" aria-label="Add logic" title="Branching: jump rules for this question" onClick={onLogic}><Icon name="branch" size={18} stroke={1.6} /></button>}
        </div>
      ))}
      <button className="cv-add" onClick={() => set([...q.choices, { id: newTempId(), label: '' }])}>+ Add choice</button>
    </div>
  );
}

function AnswerPreview({ q, b, onLogic }: { q: Question; b: Builder; onLogic?: () => void }) {
  switch (q.type) {
    case 'short_text': case 'email': case 'number':
      return <input className="tf-input cv-fake" readOnly tabIndex={-1} placeholder={q.settings.placeholder} />;
    case 'long_text': return <textarea className="tf-input tf-textarea cv-fake" readOnly tabIndex={-1} rows={1} placeholder={q.settings.placeholder} />;
    case 'file_upload':
      return <div className="tf-file drop cv-fake"><Icon name="upload" size={28} stroke={1.5} /><span><b>Choose file</b> or drag and drop here</span><small>Up to 5 MB</small></div>;
    case 'yes_no':
      return <div className="tf-choices cv-fake"><div className="tf-choice"><span className="key">Y</span>Yes</div><div className="tf-choice"><span className="key">N</span>No</div></div>;
    case 'rating':
      return (
        <div className="tf-rating cv-fake">
          {Array.from({ length: q.settings.steps || 5 }, (_, i) => (
            <div className="star" key={i}><svg viewBox="0 0 24 24"><path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" strokeLinejoin="round" /></svg><span>{i + 1}</span></div>
          ))}
        </div>
      );
    case 'dropdown':
      return (
        <>
          <div className="tf-dropdown cv-fake" style={{ marginBottom: 18 }}><input className="tf-input" readOnly tabIndex={-1} placeholder={q.settings.placeholder} /><Icon name="down" size={22} className="chev" /></div>
          <ChoiceEditor q={q} b={b} onLogic={onLogic} />
        </>
      );
    case 'multiple_choice': return <ChoiceEditor q={q} b={b} onLogic={onLogic} />;
  }
}

export default function Canvas({ b, sel, mobile = false, onLogic }: { b: Builder; sel: Sel | null; mobile?: boolean; onLogic?: () => void }) {
  const form = b.form!;
  const q = typeof sel === 'number' ? form.questions.find((x) => x.id === sel) : undefined;
  const idx = q ? form.questions.indexOf(q) : -1;

  let body: React.ReactNode = <div className="tf-content"><p className="tf-desc" style={{ paddingLeft: 0 }}>Select or add a question to start editing.</p></div>;
  if (sel === 'welcome') {
    body = (
      <div className="tf-content" key="welcome">
        <div className="row" style={{ marginBottom: 22, fontFamily: 'Inter', fontSize: 14 }}>
          <button className={`switch ${form.welcome_enabled ? 'on' : ''}`} role="switch" aria-checked={form.welcome_enabled} aria-label="Show welcome screen"
            onClick={() => b.updateForm({ welcome_enabled: !form.welcome_enabled })} />
          <b>Show welcome screen</b>
        </div>
        <div style={{ opacity: form.welcome_enabled ? 1 : 0.4, pointerEvents: form.welcome_enabled ? 'auto' : 'none' }}>
          <Auto className="cv-title" label="Welcome title" placeholder={form.title || 'Welcome title'} value={form.welcome_title} onChange={(v) => b.updateForm({ welcome_title: v })} />
          <Auto className="cv-desc" label="Welcome description" placeholder="Add a description" single={false} value={form.welcome_description} onChange={(v) => b.updateForm({ welcome_description: v })} />
          <div className="tf-actions" style={{ marginLeft: 0 }}>
            <input className="tf-ok cv-edit" style={{ width: 160, background: 'var(--btn)', color: 'var(--btn-fg)' }} aria-label="Button text" maxLength={60}
              value={form.welcome_button} onChange={(e) => b.updateForm({ welcome_button: e.target.value })} />
            <span className="tf-hint">press <b>Enter</b> ↵</span>
          </div>
        </div>
      </div>
    );
  } else if (sel === 'end') {
    body = (
      <div className="tf-content center" key="end" style={{ alignItems: 'stretch', textAlign: 'left' }}>
        <div className="tf-done" style={{ animation: 'none' }}><Icon name="check" size={34} stroke={2.6} /></div>
        <Auto className="cv-title" label="Thank you title" placeholder="Thanks for completing this form!" value={form.thankyou_title} onChange={(v) => b.updateForm({ thankyou_title: v })} />
        <Auto className="cv-desc" label="Thank you description" placeholder="Add a description" single={false} value={form.thankyou_description} onChange={(v) => b.updateForm({ thankyou_description: v })} />
      </div>
    );
  } else if (q) {
    body = (
      <div className="tf-content" key={q.id}>
        <div className="tf-qhead">
          <span className="tf-num">{idx + 1}<Icon name="right" size={16} stroke={2.4} /></span>
          <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <Auto className="cv-title" label="Question title" placeholder="Your question here" value={q.title} onChange={(v) => b.updateQuestion(q.id, { title: v })} />
            {q.required && <span className="tf-req" style={{ fontSize: 26 }}>*</span>}
          </div>
        </div>
        <div style={{ paddingLeft: 46 }}>
          <Auto className="cv-desc" label="Description" placeholder="Description (optional)" single={false} value={q.description} onChange={(v) => b.updateQuestion(q.id, { description: v })} />
        </div>
        <div className="tf-answer"><AnswerPreview q={q} b={b} onLogic={onLogic} /></div>
        <div className="tf-actions cv-fake"><span className="tf-ok">OK<Icon name="check" size={20} stroke={2.4} /></span><span className="tf-hint">press <b>Enter</b> ↵</span></div>
      </div>
    );
  }
  return (
    <div className="bd-stage">
      <div className={`bd-frame tf-theme ${mobile ? 'is-mobile' : ''}`} style={themeVars(form.theme)}>
        <div className="canvas"><div style={{ width: '100%', maxWidth: 720 }}>{body}</div></div>
      </div>
    </div>
  );
}
