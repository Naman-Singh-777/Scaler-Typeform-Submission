'use client';
import { useEffect, useState } from 'react';
import AddContentModal from '@/components/builder/AddContentModal';
import Canvas from '@/components/builder/Canvas';
import QuestionList, { type Sel } from '@/components/builder/QuestionList';
import SettingsPanel, { type PanelTab } from '@/components/builder/SettingsPanel';
import AiChat from '@/components/AiChat';
import FormHeader from '@/components/FormHeader';
import Icon from '@/components/Icon';
import FormRunner from '@/components/runner/FormRunner';
import { useToast } from '@/components/Toast';
import { useBuilder } from '@/hooks/useBuilder';

export default function BuilderPage({ params }: { params: { id: string } }) {
  const b = useBuilder(Number(params.id));
  const toast = useToast();
  const { form } = b;
  const [sel, setSel] = useState<Sel | null>(null);
  const [adding, setAdding] = useState(false);
  const [preview, setPreview] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);
  const [tab, setTab] = useState<PanelTab>('settings');

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
  const dup = async (id: number) => { const q = await b.duplicateQuestion(id); if (q) setSel(q.id); };
  const openPanel = (t: PanelTab) => { setTab(t); setRightOpen(true); };

  return (
    <>
      <FormHeader b={b} tab="edit" />
      <div className={`bd ${rightOpen ? '' : 'no-right'}`}>
        <aside className="bd-left">
          <div className="bd-mode"><button onClick={() => toast('Only Universal mode is available', 'info')}><Icon name="pages" size={16} stroke={1.6} />Universal mode<Icon name="chevdown" size={18} stroke={1.6} className="grow-end" /></button></div>
          <QuestionList form={form} sel={sel} onSelect={setSel} onReorder={b.reorder} onDelete={del} onDuplicate={dup} onToggleWelcome={() => b.updateForm({ welcome_enabled: !form.welcome_enabled })} />
        </aside>
        <div className="bd-center">
          <div className="bd-toolbar">
            <button className="btn primary" onClick={() => setAdding(true)}><Icon name="plus" size={16} stroke={1.8} />Add content</button>
            <span className="tb-sep" />
            <button className={`tb-btn ${rightOpen && tab === 'design' ? 'on' : ''}`} onClick={() => openPanel('design')}><Icon name="palette" size={16} stroke={1.6} />Design</button>
            <span className="tb-sep" />
            <button className={`tb-ico ${mobile ? 'on' : ''}`} aria-label="Toggle mobile preview" title="Mobile view" onClick={() => setMobile(!mobile)}><Icon name="mobile" size={18} stroke={1.6} /></button>
            <button className="tb-ico" aria-label="Preview form" title="Preview" onClick={() => form.questions.length ? setPreview(true) : toast('Add a question to preview', 'info')}><Icon name="play" size={18} stroke={1.6} /></button>
            <span className="tb-sep" />
            <button className="tb-ico" aria-label="Form settings" title="Settings" onClick={() => openPanel('settings')}><Icon name="settings" size={18} stroke={1.6} /></button>
            <span className="spacer" />
            <button className="tb-ico" aria-label="Toggle side panel" title="Toggle panel" onClick={() => setRightOpen(!rightOpen)}><Icon name="panel" size={18} stroke={1.6} /></button>
          </div>
          <Canvas b={b} sel={sel} mobile={mobile} onLogic={() => openPanel('logic')} />
          <div className="bd-aibar"><AiChat b={b} variant="bar" placeholder="Chat to create" onAdded={(id) => setSel(id)} /></div>
        </div>
        {rightOpen && <SettingsPanel b={b} sel={sel} tab={tab} onTab={setTab} onDelete={del} onDuplicate={dup} />}
      </div>
      {adding && <AddContentModal onClose={() => setAdding(false)}
        onPick={async (t) => { setAdding(false); const q = await b.addQuestion(t, insertAt); if (q) setSel(q.id); }} />}
      {preview && <div className="tf-fullscreen"><FormRunner key={Date.now()} form={form} mode="preview" onClose={() => setPreview(false)} /></div>}
    </>
  );
}
