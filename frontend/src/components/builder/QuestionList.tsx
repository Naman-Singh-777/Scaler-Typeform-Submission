'use client';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '../Icon';
import { TYPE_META } from '@/lib/questionTypes';
import type { Form, Question } from '@/lib/types';

export type Sel = 'welcome' | 'end' | number;

function Kebab({ items }: { items: { label: string; icon: string; danger?: boolean; run: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);
  return (
    <span className="kebab" ref={ref} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <button className={`kebab__b ${open ? 'on' : ''}`} aria-label="More actions" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="more" size={18} stroke={2} /></button>
      {open && (
        <div className="kebab__m" role="menu">
          {items.map((it) => <button key={it.label} role="menuitem" className={it.danger ? 'danger' : ''} onClick={() => { setOpen(false); it.run(); }}><Icon name={it.icon} size={16} stroke={1.6} />{it.label}</button>)}
        </div>
      )}
    </span>
  );
}

function Row({ q, n, selected, onSelect, onDuplicate, onDelete }: {
  q: Question; n: number; selected: boolean; onSelect: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  const meta = TYPE_META[q.type];
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform && { ...transform, x: 0 }), transition }}
      className={`qrow ${selected ? 'sel' : ''} ${isDragging ? 'dragging' : ''}`} onClick={onSelect} {...attributes} {...listeners}>
      <span className="qchip" style={{ background: meta.color }}><Icon name={meta.icon} size={16} stroke={1.6} /><b>{n}</b></span>
      <span className={`qt ${q.title ? '' : 'ph'}`}>{q.title || 'Your question here'}</span>
      <Kebab items={[{ label: 'Duplicate', icon: 'copy', run: onDuplicate }, { label: 'Delete', icon: 'trash', danger: true, run: onDelete }]} />
    </div>
  );
}

function BranchCard({ href }: { href: string }) {
  const [gone, setGone] = useState(false);
  useEffect(() => { try { setGone(localStorage.getItem('tf_branch_card') === '1'); } catch {} }, []);
  if (gone) return null;
  const hide = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setGone(true); try { localStorage.setItem('tf_branch_card', '1'); } catch {} };
  return (
    <Link href={href} className="bd-branch"><Icon name="bulb" size={20} stroke={1.5} /><span>Personalize with branching<small>Customize how your form behaves based on answers.</small></span>
      <button className="bd-branch-x" aria-label="Dismiss" onClick={hide}><Icon name="x" size={16} stroke={1.6} /></button>
      <i><Icon name="right" size={18} stroke={1.6} /></i></Link>
  );
}

export default function QuestionList({ form, sel, onSelect, onReorder, onDuplicate, onDelete, onToggleWelcome, onAdd }: {
  form: Form; sel: Sel | null; onSelect: (s: Sel) => void; onReorder: (ids: number[]) => void;
  onDuplicate: (id: number) => void; onDelete: (id: number) => void; onToggleWelcome?: () => void; onAdd?: () => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = form.questions.map((q) => q.id);
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onReorder(arrayMove(ids, ids.indexOf(e.active.id as number), ids.indexOf(e.over.id as number)));
  };
  return (
    <>
      <section className="bd-pane bd-pages">
        <h3 className="bd-pane-h">Pages</h3>
        <div className="bd-list">
          <div className={`qsection ${sel === 'welcome' ? 'sel' : ''}`} onClick={() => onSelect('welcome')}>
            <span className="qchip gray"><Icon name="welcome" size={18} stroke={1.5} /></span><span className="qt">{form.welcome_title || 'Welcome screen'}</span>
            {!form.welcome_enabled && <span className="pill soon" style={{ marginLeft: 'auto' }}>Off</span>}
            {onToggleWelcome && <Kebab items={[{ label: form.welcome_enabled ? 'Hide welcome screen' : 'Show welcome screen', icon: 'welcome', run: onToggleWelcome }]} />}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {form.questions.map((q, i) => (
                <Row key={q.id} q={q} n={i + 1} selected={sel === q.id} onSelect={() => onSelect(q.id)}
                  onDuplicate={() => onDuplicate(q.id)} onDelete={() => onDelete(q.id)} />
              ))}
            </SortableContext>
          </DndContext>
          {onAdd && <button className="bd-addrow" onClick={onAdd}><Icon name="plus" size={16} stroke={1.8} />Add content</button>}
          {form.questions.length === 0 && <p className="bd-empty">No questions yet. Click “Add content” to create one.</p>}
        </div>
        <BranchCard href={`/forms/${form.id}/workflow`} />
      </section>
      <div className="bd-handle" aria-hidden />
      <section className="bd-pane bd-endings">
        <div className="bd-pane-h row">Endings
          <button className="plus-btn" aria-label="Edit thank you screen" title="Edit thank you screen" onClick={() => onSelect('end')}><Icon name="plus" size={16} stroke={1.8} /></button>
        </div>
        <div className="bd-list">
          <div className={`qsection ${sel === 'end' ? 'sel' : ''}`} onClick={() => onSelect('end')}>
            <span className="qchip gray"><Icon name="flag" size={18} stroke={1.5} /><b>A</b></span><span className="qt">{form.thankyou_title || 'Thank you screen'}</span>
          </div>
        </div>
      </section>
    </>
  );
}
