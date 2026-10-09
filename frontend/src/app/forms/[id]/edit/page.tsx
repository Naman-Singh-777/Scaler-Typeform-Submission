'use client';
import { useEffect, useState } from 'react';
import AddContentModal from '@/components/builder/AddContentModal';
import Canvas from '@/components/builder/Canvas';
import QuestionList, { type Sel } from '@/components/builder/QuestionList';
import SettingsPanel from '@/components/builder/SettingsPanel';
import FormHeader from '@/components/FormHeader';
import Icon from '@/components/Icon';
import { useBuilder } from '@/hooks/useBuilder';

export default function BuilderPage({ params }: { params: { id: string } }) {
  const b = useBuilder(Number(params.id));
  const { form } = b;
  const [sel, setSel] = useState<Sel | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => { if (form && sel === null) setSel(form.questions[0]?.id ?? 'welcome'); }, [form, sel]);
  useEffect(() => { if (form) document.title = `${form.title} — Create`; }, [form?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  if (b.loadError) return <div className="center-page"><div><h2>Form not found</h2><p className="muted" style={{ margin: '8px 0 18px' }}>{b.loadError}</p><a className="btn primary" href="/dashboard">Back to workspace</a></div></div>;
  if (!form) return <><div className="fh" /><div className="center-page muted">Loading…</div></>;

  const insertAt = typeof sel === 'number' ? form.questions.findIndex((q) => q.id === sel) + 1 : undefined;
  const del = async (id: number) => {
    const i = form.questions.findIndex((q) => q.id === id);
    await b.deleteQuestion(id);
    const rest = form.questions.filter((q) => q.id !== id);
    setSel(rest[Math.min(i, rest.length - 1)]?.id ?? 'welcome');
  };

  return (
    <>
      <FormHeader b={b} tab="edit" />
      <div className="bd">
        <aside className="bd-left">
          <div className="bd-left-head">Content</div>
          <QuestionList form={form} sel={sel} onSelect={setSel} onReorder={b.reorder} onDelete={del}
            onDuplicate={async (id) => { const q = await b.duplicateQuestion(id); if (q) setSel(q.id); }} />
          <div className="bd-left-foot"><button className="btn primary" onClick={() => setAdding(true)}><Icon name="plus" size={18} stroke={2.4} />Add content</button></div>
        </aside>
        <Canvas b={b} sel={sel} />
        <SettingsPanel b={b} sel={sel} onDelete={del} onDuplicate={async (id) => { const q = await b.duplicateQuestion(id); if (q) setSel(q.id); }} />
      </div>
      {adding && <AddContentModal onClose={() => setAdding(false)}
        onPick={async (t) => { setAdding(false); const q = await b.addQuestion(t, insertAt); if (q) setSel(q.id); }} />}
    </>
  );
}
