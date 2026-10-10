'use client';
import { useEffect, useState } from 'react';
import AddContentModal from '@/components/builder/AddContentModal';
import Canvas from '@/components/builder/Canvas';
import QuestionList, { type Sel } from '@/components/builder/QuestionList';
import SettingsPanel, { type PanelTab } from '@/components/builder/SettingsPanel';
import AiChat from '@/components/AiChat';
import AiStudio from '@/components/AiStudio';
import { api } from '@/lib/api';
import { guessQuestions } from '@/lib/importQuestions';
import FormSettingsModal from '@/components/builder/FormSettingsModal';
import { AccessibilityPanel, TranslationsDialog, VersionHistory } from '@/components/builder/ToolbarDialogs';
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
  const [dlg, setDlg] = useState<null | 'a11y' | 'history' | 'translate' | 'settings'>(null);
  const [email, setEmail] = useState('');
  useEffect(() => { api.me().then((u) => setEmail(u?.email || '')).catch(() => {}); }, []);
  const [modes, setModes] = useState(false);
  const [studio, setStudio] = useState<string | null>(null);

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
  const importLines = async (lines: string[]) => {
    let first = 0, n = 0;
    for (const g of guessQuestions(lines)) {
      const q = await b.addQuestion(g.type);
      if (!q) break;
      try { const u = await api.updateQuestion(q.id, { title: g.title, ...(g.choices ? { choices: g.choices.map((label) => ({ label })) } : {}) }); b.putQuestion(u); } catch { /* keep the blank question */ }
      if (!first) first = q.id;
      n++;
    }
    setAdding(false);
    if (first) setSel(first);
    toast(n ? `Added ${n} question${n > 1 ? 's' : ''}` : 'Could not add the questions', n ? 'success' : 'error');
  };
  const openPanel = (t: PanelTab) => { setTab(t); setRightOpen(true); };

  return (
    <>
      <FormHeader b={b} tab="edit" />
      <div className={`bd ${rightOpen ? '' : 'no-right'}`}>
        <aside className="bd-left">
          <div className="bd-mode" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setModes(false); }}>
            <button aria-haspopup="menu" aria-expanded={modes} onClick={() => setModes(!modes)}><Icon name="pages" size={16} stroke={1.6} />Universal mode<Icon name="chevdown" size={18} stroke={1.6} className="grow-end" /></button>
            {modes && (
              <div className="bd-modes" role="menu">
                {[['pages', 'Universal mode', 'Create any form.'], ['gauge', 'Lead qualification mode', 'Score and prioritize leads.'], ['checkbox', 'Knowledge quiz mode', 'Set correct answers.'], ['scale', 'Match quiz mode', 'Assign answers to endings.']].map(([ic, t, d], i) => (
                  <button key={t} role="menuitem" className={i === 0 ? 'on' : ''} onClick={() => { setModes(false); if (i) toast(`${t} is not available in this version. Universal mode builds any form.`, 'info'); }}>
                    <Icon name={ic} size={18} stroke={1.5} /><span><b>{t}</b><em>{d}</em></span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <QuestionList onAdd={() => setAdding(true)} form={form} sel={sel} onSelect={setSel} onReorder={b.reorder} onDelete={del} onDuplicate={dup} onToggleWelcome={() => b.updateForm({ welcome_enabled: !form.welcome_enabled })} />
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
            <button className={`tb-ico ${dlg === 'a11y' ? 'on' : ''}`} aria-label="Check accessibility" title="Check accessibility" onClick={() => setDlg(dlg === 'a11y' ? null : 'a11y')}><Icon name="access" size={18} stroke={1.6} /></button>
            <button className="tb-ico" aria-label="Version History" title="Version History" onClick={() => setDlg('history')}><Icon name="cycle" size={18} stroke={1.6} /></button>
            <button className="tb-ico" aria-label="Translations" title="Translations" onClick={() => setDlg('translate')}><Icon name="translate" size={18} stroke={1.6} /></button>
            <button className={`tb-ico ${dlg === 'settings' ? 'on' : ''}`} aria-label="Form settings" title="Form settings" onClick={() => setDlg('settings')}><Icon name="settings" size={18} stroke={1.6} /></button>
            <span className="spacer" />
            <button className="tb-ico" aria-label="Hide question panel" title="Hide question panel" onClick={() => setRightOpen(!rightOpen)}><Icon name="panel" size={18} stroke={1.6} /></button>
          </div>
          <Canvas b={b} sel={sel} mobile={mobile} onLogic={() => openPanel('logic')} />
          <div className="bd-aibar"><AiChat b={b} variant="bar" placeholder="Chat to create" onAdded={(id) => setSel(id)} /></div>
        </div>
        {rightOpen && <SettingsPanel b={b} sel={sel} tab={tab} onTab={setTab} onDelete={del} onDuplicate={dup} />}
      </div>
      {adding && <AddContentModal onClose={() => setAdding(false)} onImport={importLines} onAI={(p) => { setAdding(false); setStudio(p); }}
        onPick={async (t) => { setAdding(false); const q = await b.addQuestion(t, insertAt); if (q) setSel(q.id); }} />}
      {studio && <AiStudio b={b} initial={studio} onClose={() => setStudio(null)} onAdded={(id) => setSel(id)} />}
      {dlg === 'a11y' && <AccessibilityPanel form={form} onClose={() => setDlg(null)} onSelect={(id) => setSel(id)} />}
      {dlg === 'settings' && <FormSettingsModal b={b} email={email} onClose={() => setDlg(null)} onTranslations={() => setDlg('translate')} />}
      {dlg === 'history' && <VersionHistory b={b} onClose={() => setDlg(null)} />}
      {dlg === 'translate' && <TranslationsDialog onClose={() => setDlg(null)} />}
      {preview && <div className="tf-fullscreen"><FormRunner key={Date.now()} form={form} mode="preview" onClose={() => setPreview(false)} /></div>}
    </>
  );
}
