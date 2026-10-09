'use client';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Icon from '../Icon';
import { TYPE_META } from '@/lib/questionTypes';
import type { Form, Question } from '@/lib/types';

export type Sel = 'welcome' | 'end' | number;

function Row({ q, n, selected, onSelect, onDuplicate, onDelete }: {
  q: Question; n: number; selected: boolean; onSelect: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  const meta = TYPE_META[q.type];
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform && { ...transform, x: 0 }), transition }}
      className={`qrow ${selected ? 'sel' : ''} ${isDragging ? 'dragging' : ''}`} onClick={onSelect} {...attributes} {...listeners}>
      <span className="grip" title="Drag to reorder"><Icon name="drag" size={14} /></span>
      <span className="qicon" style={{ background: meta.color }}><Icon name={meta.icon} size={15} /><span className="qn">{n}</span></span>
      <span className={`qt ${q.title ? '' : 'ph'}`}>{q.title || 'Your question here'}</span>
      <span className="qa">
        <button className="icon-btn" style={{ width: 26, height: 26 }} title="Duplicate" aria-label="Duplicate question"
          onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDuplicate(); }}><Icon name="copy" size={14} /></button>
        <button className="icon-btn" style={{ width: 26, height: 26 }} title="Delete" aria-label="Delete question"
          onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete(); }}><Icon name="trash" size={14} /></button>
      </span>
    </div>
  );
}

export default function QuestionList({ form, sel, onSelect, onReorder, onDuplicate, onDelete }: {
  form: Form; sel: Sel | null; onSelect: (s: Sel) => void; onReorder: (ids: number[]) => void;
  onDuplicate: (id: number) => void; onDelete: (id: number) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = form.questions.map((q) => q.id);
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onReorder(arrayMove(ids, ids.indexOf(e.active.id as number), ids.indexOf(e.over.id as number)));
  };
  return (
    <div className="bd-list">
      <div className={`qsection ${sel === 'welcome' ? 'sel' : ''}`} onClick={() => onSelect('welcome')}>
        <span className="qicon"><Icon name="welcome" size={15} /></span>Welcome screen
        {!form.welcome_enabled && <span className="pill soon" style={{ marginLeft: 'auto' }}>Off</span>}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {form.questions.map((q, i) => (
            <Row key={q.id} q={q} n={i + 1} selected={sel === q.id} onSelect={() => onSelect(q.id)}
              onDuplicate={() => onDuplicate(q.id)} onDelete={() => onDelete(q.id)} />
          ))}
        </SortableContext>
      </DndContext>
      {form.questions.length === 0 && <p className="muted" style={{ padding: '14px 10px' }}>No questions yet. Click “Add content” to create one.</p>}
      <div className={`qsection ${sel === 'end' ? 'sel' : ''}`} onClick={() => onSelect('end')}>
        <span className="qicon"><Icon name="flag" size={15} /></span>Thank you screen
      </div>
    </div>
  );
}
