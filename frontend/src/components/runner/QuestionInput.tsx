'use client';
import { useContext, useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { MAX_UPLOAD } from '@/lib/logic';
import { RunnerCtx } from '@/lib/formSettings';
import type { Question } from '@/lib/types';

export const letter = (i: number) => String.fromCharCode(65 + i);

interface Props {
  q: Question; value: any; active: boolean;
  onChange: (v: any, opts?: { auto?: boolean }) => void;
}

function useAutoFocus<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => ref.current?.focus({ preventScroll: true }), 380);
    return () => clearTimeout(t);
  }, [active]);
  return ref;
}

function ChoiceButton({ k, label, selected, onClick }: { k: string; label: string; selected: boolean; onClick: () => void }) {
  const { s } = useContext(RunnerCtx);
  return (
    <button type="button" className={`tf-choice ${selected ? 'selected' : ''}`} onClick={(e) => { e.currentTarget.blur(); onClick(); }} aria-pressed={selected}>
      {s.letters && <span className="key">{k}</span>}
      <span className="lbl">{label}</span>
      {selected && <Icon name="check" size={16} stroke={2.6} className="tick" />}
    </button>
  );
}

function TextField({ q, value, active, onChange }: Props) {
  const { t } = useContext(RunnerCtx);
  const ref = useAutoFocus<HTMLInputElement>(active);
  const type = q.type === 'email' ? 'email' : 'text';
  return (
    <input ref={ref} className="tf-input" type={type} inputMode={q.type === 'number' ? 'decimal' : undefined}
      value={value ?? ''} placeholder={q.settings.placeholder || t('text_hint')} autoComplete={q.type === 'email' ? 'email' : 'off'}
      onChange={(e) => onChange(e.target.value)} aria-label={q.title} />
  );
}

function LongText({ q, value, active, onChange }: Props) {
  const { t } = useContext(RunnerCtx);
  const ref = useAutoFocus<HTMLTextAreaElement>(active);
  useEffect(() => {
    const el = ref.current;
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 260) + 'px'; }
  }, [value, ref]);
  return (
    <textarea ref={ref} className="tf-input tf-textarea" rows={1} value={value ?? ''} placeholder={q.settings.placeholder || t('text_hint')}
      onChange={(e) => onChange(e.target.value)} aria-label={q.title} />
  );
}

function Dropdown({ q, value, active, onChange }: Props) {
  const { t } = useContext(RunnerCtx);
  const ref = useAutoFocus<HTMLInputElement>(active);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hi, setHi] = useState(0);
  const opts = q.choices.map((c) => c.label).filter((l) => l.toLowerCase().includes(query.toLowerCase()));
  const pick = (l: string) => { onChange(l, { auto: true }); setOpen(false); setQuery(''); };
  return (
    <div className="tf-dropdown">
      <input ref={ref} className="tf-input" value={open ? query : value ?? ''} placeholder={q.settings.placeholder || t('dropdown_hint')}
        onFocus={() => setOpen(true)} onChange={(e) => { setQuery(e.target.value); setHi(0); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 120)} aria-label={q.title} role="combobox" aria-expanded={open}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setHi((h) => Math.min(h + 1, opts.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === 'Enter' && opts[hi]) { e.preventDefault(); e.stopPropagation(); pick(opts[hi]); }
          else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
        }} />
      <Icon name="down" size={22} className="chev" />
      {open && (
        <ul className="tf-options" role="listbox">
          {opts.length === 0 && <li className="empty">No matches</li>}
          {opts.map((l, i) => (
            <li key={l} role="option" aria-selected={l === value} className={`${i === hi ? 'hi' : ''} ${l === value ? 'sel' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); pick(l); }} onMouseEnter={() => setHi(i)}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Rating({ q, value, onChange }: Props) {
  const steps = q.settings.steps || 5;
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;
  return (
    <div className="tf-rating" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label={q.title}>
      {Array.from({ length: steps }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" className={`star ${n <= shown ? 'on' : ''}`} onMouseEnter={() => setHover(n)}
          onClick={(e) => { e.currentTarget.blur(); onChange(n, { auto: true }); }} aria-label={`${n} star${n > 1 ? 's' : ''}`} role="radio" aria-checked={value === n}>
          <svg viewBox="0 0 24 24" width="100%" height="100%"><path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" strokeLinejoin="round" /></svg>
          <span>{n}</span>
        </button>
      ))}
    </div>
  );
}

const toBase64 = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(',')[1] || '');
  r.onerror = () => rej(r.error);
  r.readAsDataURL(f);
});
const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

function FileUpload({ value, onChange, q }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState('');
  const take = async (f?: File) => {
    if (!f) return;
    if (f.size > MAX_UPLOAD) { setErr('Files must be 5 MB or smaller'); return; }
    setErr('');
    try { onChange({ name: f.name, type: f.type || 'application/octet-stream', size: f.size, data: await toBase64(f) }); }
    catch { setErr('That file could not be read'); }
  };
  return (
    <div>
      <input ref={input} type="file" hidden aria-label={q.title} onChange={(e) => { take(e.target.files?.[0]); e.target.value = ''; }} />
      {value ? (
        <div className="tf-file has">
          <Icon name="upload" size={20} stroke={1.6} />
          <div className="nm"><b>{value.name}</b><span>{fmtSize(value.size)}</span></div>
          <button type="button" className="rm" onClick={() => onChange(undefined)}>Remove</button>
        </div>
      ) : (
        <button type="button" className={`tf-file drop ${drag ? 'over' : ''}`} onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}>
          <Icon name="upload" size={28} stroke={1.5} />
          <span><b>Choose file</b> or drag and drop here</span>
          <small>Up to 5 MB</small>
        </button>
      )}
      {err && <p className="tf-file-err">{err}</p>}
    </div>
  );
}

export default function QuestionInput(p: Props) {
  const { q, value, onChange } = p;
  const { t } = useContext(RunnerCtx);
  switch (q.type) {
    case 'short_text': case 'email': case 'number': return <TextField {...p} />;
    case 'long_text': return <LongText {...p} />;
    case 'dropdown': return <Dropdown {...p} />;
    case 'rating': return <Rating {...p} />;
    case 'file_upload': return <FileUpload {...p} />;
    case 'yes_no':
      return (
        <div className="tf-choices">
          <ChoiceButton k="Y" label={t('yes_label')} selected={value === true} onClick={() => onChange(true, { auto: true })} />
          <ChoiceButton k="N" label={t('no_label')} selected={value === false} onClick={() => onChange(false, { auto: true })} />
        </div>
      );
    case 'multiple_choice': {
      const multi = !!q.settings.allow_multiple;
      const sel: string[] = multi ? value || [] : [];
      return (
        <div className="tf-choices">
          {q.choices.map((c, i) => (
            <ChoiceButton key={c.id} k={letter(i)} label={c.label} selected={multi ? sel.includes(c.label) : value === c.label}
              onClick={() => multi ? onChange(sel.includes(c.label) ? sel.filter((x) => x !== c.label) : [...sel, c.label]) : onChange(c.label, { auto: true })} />
          ))}
        </div>
      );
    }
  }
}
