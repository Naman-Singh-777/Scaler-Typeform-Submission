'use client';
import { useEffect, useMemo, useState } from 'react';
import Icon from '../Icon';
import { useToast } from '../Toast';
import { COMING_SOON_TYPES, QUESTION_TYPES } from '@/lib/questionTypes';
import type { QType } from '@/lib/types';

type Item = { label: string; icon: string; color: string; type?: QType };

// every picker entry: the 8 working types plus disabled placeholders that mirror the real picker
const ITEMS: Item[] = [...QUESTION_TYPES, ...COMING_SOON_TYPES];
const byLabel = (l: string) => ITEMS.find((i) => i.label === l)!;

// groups in reading order; the picker lays them out as a 3-column grid
const GROUPS: { title: string; labels: string[] }[] = [
  { title: 'Contact info', labels: ['Contact Info', 'Email', 'Phone Number', 'Address', 'Website'] },
  { title: 'Choice', labels: ['Multiple Choice', 'Dropdown', 'Picture Choice', 'Yes/No', 'Legal', 'Checkbox'] },
  { title: 'Rating & ranking', labels: ['Net Promoter Score®', 'Opinion Scale', 'Rating', 'Ranking', 'Matrix'] },
  { title: 'Text & Video', labels: ['Short Text', 'Long Text', 'Video and Audio'] },
  { title: 'Other', labels: ['Number', 'File upload', 'Payment'] },
];

export default function AddContentModal({ onPick, onClose }: { onPick: (t: QType) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const toast = useToast();
  const soon = (what: string) => toast(`${what} is coming soon`, 'info');
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const match = (l: string) => l.toLowerCase().includes(q.trim().toLowerCase());

  const Entry = ({ label, boxed }: { label: string; boxed?: boolean }) => {
    const it = byLabel(label);
    const isSoon = !it.type;
    return (
      <button className={`ac-item ${boxed ? 'boxed' : ''}`} aria-disabled={isSoon} title={isSoon ? 'Coming soon' : undefined} onClick={() => (it.type ? onPick(it.type) : soon(it.label))}>
        <span className="ac-chip" style={{ background: it.color }}><Icon name={it.icon} size={14} stroke={1.7} /></span>
        <span className="ac-label">{it.label}</span>
        {isSoon && label === 'Video and Audio' && <span className="ac-gem"><Icon name="diamond" size={12} stroke={1.8} /></span>}
      </button>
    );
  };
  const anyMatch = useMemo(() => ITEMS.some((i) => match(i.label)), [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ac-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ac-dialog" role="dialog" aria-modal="true" aria-label="Add content">
        <div className="ac-tabs">
          <button className="on">Add form elements</button>
          <button onClick={() => soon('Importing questions')}>Import questions</button>
          <button onClick={() => soon('Creating with AI')}>Create with AI</button>
          <button className="ac-close" onClick={onClose} aria-label="Close"><Icon name="x" size={20} stroke={1.6} /></button>
        </div>
        <div className="ac-body">
          <div className="ac-side">
            <label className="ac-search"><Icon name="search" size={16} stroke={1.7} /><input autoFocus placeholder="Search form elements" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search form elements" /></label>
            {!q && (
              <>
                <h4>Recommended</h4>
                <Entry label="Video and Audio" boxed /><Entry label="Short Text" boxed /><Entry label="Multiple Choice" boxed />
                <h4>Connect to apps</h4>
                {['Hubspot', 'Salesforce'].map((n) => (
                  <button key={n} className="ac-item boxed" aria-disabled onClick={() => soon(n)}>
                    <span className="ac-chip" style={{ background: n === 'Hubspot' ? '#ff7a59' : '#00a1e0', color: '#fff' }}><Icon name="apps" size={14} stroke={1.7} /></span><span className="ac-label">{n}</span>
                  </button>
                ))}
                <button className="ac-item boxed" aria-disabled onClick={() => soon('App integrations')}><span className="ac-label" style={{ paddingLeft: 4 }}>Browse all apps</span></button>
              </>
            )}
          </div>
          <div className="ac-cols">
            {GROUPS.map((g) => {
              const shown = g.labels.filter(match);
              return shown.length > 0 && (
                <section key={g.title}>
                  <h4>{g.title}</h4>
                  {shown.map((l) => <Entry key={l} label={l} />)}
                </section>
              );
            })}
            {q && !anyMatch && <p className="ac-none">No form elements match “{q}”.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
