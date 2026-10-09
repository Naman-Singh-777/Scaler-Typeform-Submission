'use client';
import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { RulesEditor } from '../builder/SettingsPanel';
import { TYPE_META } from '@/lib/questionTypes';
import type { Question, Rule } from '@/lib/types';

/** The Workflow tab's Logic dialog: pick a question on the left, edit how it behaves on the right. */
export default function LogicModal({ qs, initialId, onClose, onSave }: {
  qs: Question[]; initialId: number; onClose: () => void; onSave: (changes: { id: number; rules: Rule[] }[]) => void;
}) {
  const [cur, setCur] = useState(initialId);
  const [draft, setDraft] = useState<Record<number, Rule[]>>(() => Object.fromEntries(qs.map((q) => [q.id, q.rules])));
  const [open, setOpen] = useState<'display' | 'branch' | 'calc' | null>('branch');
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const q = qs.find((x) => x.id === cur) || qs[0];
  if (!q) return null;
  const changed = qs.filter((x) => JSON.stringify(draft[x.id]) !== JSON.stringify(x.rules)).map((x) => ({ id: x.id, rules: draft[x.id] }));
  const sec = (k: 'display' | 'branch' | 'calc', title: string, body: React.ReactNode) => (
    <div className={`lm-acc ${open === k ? 'open' : ''}`}>
      <button className="lm-acch" aria-expanded={open === k} onClick={() => setOpen(open === k ? null : k)}>{title}<Icon name="chevdown" size={18} stroke={1.6} /></button>
      {open === k && <div className="lm-accb">{body}</div>}
    </div>
  );
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lm" role="dialog" aria-modal="true" aria-label="Logic">
        <header className="lm-head"><h2>Logic</h2><button className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="x" size={20} stroke={1.6} /></button></header>
        <div className="lm-body">
          <nav className="lm-list" aria-label="Questions">
            {qs.map((x, i) => {
              const m = TYPE_META[x.type];
              return (
                <button key={x.id} className={x.id === q.id ? 'on' : ''} onClick={() => setCur(x.id)}>
                  <span className="qchip" style={{ background: m.color }}><Icon name={m.icon} size={16} stroke={1.6} /><b>{i + 1}</b></span>
                  <span className="lm-qt">{x.title || 'Your question here'}</span>
                  {(draft[x.id]?.length || 0) > 0 && <span className="lm-n"><Icon name="branch" size={12} stroke={1.8} />{draft[x.id].length}</span>}
                </button>
              );
            })}
          </nav>
          <div className="lm-main">
            <h3 className="lm-qtitle">{qs.indexOf(q) + 1}. {q.title || 'Your question here'}</h3>
            {sec('display', 'Question display', <p className="lm-note">Hiding answer choices based on earlier answers is not available in this version.</p>)}
            {sec('branch', 'Branching', (
              <>
                <p className="lm-note">Send respondents to a different question based on how they answer this one. The first matching rule wins; otherwise they continue to the next question.</p>
                <RulesEditor q={q} qs={qs} rules={draft[q.id] || []} onChange={(rules) => setDraft((d) => ({ ...d, [q.id]: rules }))} />
              </>
            ))}
            {sec('calc', 'Calculations', <p className="lm-note">Calculations on answers are not available in this version.</p>)}
          </div>
        </div>
        <footer className="lm-foot">
          <button className="lm-del" disabled={!(draft[q.id]?.length)} onClick={() => setDraft((d) => ({ ...d, [q.id]: [] }))}><Icon name="trash" size={16} stroke={1.6} />Delete all rules</button>
          <span className="grow" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => (changed.length ? onSave(changed) : onClose())}>Save</button>
        </footer>
      </div>
    </div>
  );
}
