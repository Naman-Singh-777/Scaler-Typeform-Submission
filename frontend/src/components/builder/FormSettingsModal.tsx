'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { useToast } from '../Toast';
import { api } from '@/lib/api';
import { FS_DEFAULTS, MESSAGES, resolveSettings, type FormSettings } from '@/lib/formSettings';
import type { Builder } from '@/hooks/useBuilder';

type Tab = 'general' | 'access' | 'language';

const Gem = () => <span className="fs-gem" title="Available on paid plans" aria-label="Paid plan feature"><Icon name="diamond" size={14} stroke={1.7} /></span>;
const Help = ({ tip }: { tip: string }) => <span className="fs-help" title={tip} tabIndex={0} aria-label={tip}><Icon name="help" size={15} stroke={1.5} /></span>;

function Row({ label, tip, gem, on, onChange, locked }: { label: string; tip?: string; gem?: boolean; on: boolean; onChange?: (v: boolean) => void; locked?: boolean }) {
  return (
    <div className={`fs-row ${locked ? 'locked' : ''}`}>
      <span>{label}{tip && <Help tip={tip} />}{gem && <Gem />}</span>
      <button className={`switch ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label={label} disabled={locked}
        title={locked ? 'Available on paid plans' : undefined} onClick={() => onChange?.(!on)} />
    </div>
  );
}

const MODES: [string, string, string][] = [
  ['pages', 'Universal', 'Create any type of form.'],
  ['gauge', 'Lead qualification', 'Score and prioritize your leads.'],
  ['checkbox', 'Knowledge quiz', 'Provide scores and real-time feedback based on respondent answers.'],
  ['scale', 'Match quiz', 'Show respondents different endings based on how they answer.'],
];

export default function FormSettingsModal({ b, email, onClose, onTranslations }: { b: Builder; email: string; onClose: () => void; onTranslations: () => void }) {
  const toast = useToast();
  const form = b.form!;
  const [tab, setTab] = useState<Tab>('general');
  const [mode, setMode] = useState(false);
  const [mail, setMail] = useState<boolean | null>(null);
  const s = resolveSettings(form);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { api.mailStatus().then((r) => setMail(r.configured)).catch(() => setMail(false)); }, []);
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  useEffect(() => { body.current?.scrollTo({ top: 0 }); }, [tab]);

  const save = (patch: Partial<FormSettings>) => b.updateForm({ settings: { ...(form.settings || {}), ...patch } });
  const flag = (k: keyof typeof FS_DEFAULTS) => ({ on: s[k], onChange: (v: boolean) => save({ [k]: v }) });
  const setMsg = (key: string, v: string) => save({ messages: { ...s.messages, [key]: v } });
  const reset = (group: string) => { const m = { ...s.messages }; MESSAGES.filter((x) => x.group === group).forEach((x) => delete m[x.key]); save({ messages: m }); };
  const groups = Array.from(new Set(MESSAGES.map((m) => m.group)));

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fs" role="dialog" aria-modal="true" aria-label="Form settings">
        <header><h2>Form settings</h2><button className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="x" size={20} stroke={1.6} /></button></header>
        <div className="fs-wrap">
          <nav aria-label="Form settings sections">
            {([['general', 'General'], ['access', 'Access & Scheduling'], ['language', 'Language']] as [Tab, string][]).map(([k, l]) => (
              <button key={k} className={tab === k ? 'on' : ''} aria-current={tab === k} onClick={() => setTab(k)}>{tab === k && <i />}{l}</button>
            ))}
            <hr />
            <button disabled title="Block references appear once your form uses recalled answers">Block references</button>
          </nav>
          <div className="fs-main" ref={body}>
            {tab === 'general' && (
              <>
                <section>
                  <h3>Form mode</h3>
                  <p className="fs-p">Modes give you the right tools for your form, so you can create and publish faster.</p>
                  <label className="fs-lbl">Choose a mode</label>
                  <div className="fs-sel" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setMode(false); }}>
                    <button aria-haspopup="listbox" aria-expanded={mode} onClick={() => setMode(!mode)}><Icon name="pages" size={18} stroke={1.5} />Universal<Icon name="chevdown" size={18} stroke={1.6} className="grow-end" /></button>
                    {mode && (
                      <div role="listbox" className="fs-opts">
                        {MODES.map(([ic, t, d], i) => (
                          <button key={t} role="option" aria-selected={i === 0} className={i === 0 ? 'on' : ''} onClick={() => { setMode(false); if (i) toast(`${t} mode is not available in this version`, 'info'); }}>
                            <Icon name={ic} size={20} stroke={1.5} /><span><b>{t}</b><em>{d}</em></span>{i === 0 && <Icon name="check" size={20} stroke={1.6} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="fs-note">Switching modes might result in changes to form settings.</p>
                </section>
                <section>
                  <h3>Display</h3>
                  <Row label="Typeform branding" gem on locked />
                  <Row label="Navigation arrows" {...flag('nav_arrows')} />
                  <Row label="Progress bar" {...flag('progress_bar')} />
                  <Row label="Question number" {...flag('question_number')} />
                  <Row label="Asterisks (*) to show required questions" tip="Shows a * after the title of required questions" {...flag('asterisks')} />
                  <Row label="Letters on answers" tip="Shows the A, B, C key next to each choice" {...flag('letters')} />
                </section>
                <section>
                  <h3>Preferences</h3>
                  <Row label="Autosave progress" tip="Respondents who leave can pick up where they stopped, on the same device" {...flag('autosave')} />
                  <Row label="Free form navigation" tip="Respondents can move to the next question with the arrow without answering the current one. Required questions are still checked when they submit." {...flag('free_nav')} />
                  <Row label="Cookie consent" tip="Asks respondents to accept or decline before their progress is saved in their browser" {...flag('cookie_consent')} />
                  <Row label="Enrich form responses" tip="Add company details to responses" gem on={false} locked />
                  <Row label="Capture partial responses after every question" tip="Save answers as soon as each question is answered" gem on={false} locked />
                  <Row label="Spam prevention" tip="Block bots and spam submissions" gem on={false} locked />
                  <Row label="Duplicate response prevention" tip="Allow one response per person" gem on={false} locked />
                </section>
                <section>
                  <h3>Notifications</h3>
                  <Row label="Send email for new responses" {...flag('notify')} />
                  {s.notify && (
                    <div className="fs-box">
                      <p>Send email to <b>{email}</b></p>
                      <div className="fs-fake"><span>Completed responses</span><Icon name="chevdown" size={18} stroke={1.6} /></div>
                      {mail === false && <small>Email delivery isn’t set up on this server yet (it needs SMTP settings), so no emails are sent until it is.</small>}
                    </div>
                  )}
                  <Row label="Send email when form is signed" tip="Get an email when someone signs a Legal question" gem on={false} locked />
                </section>
              </>
            )}

            {tab === 'access' && (
              <>
                <div className={`fs-banner ${s.accepting ? '' : 'closed'}`}>
                  <Icon name={s.accepting ? 'unlock' : 'lock'} size={22} stroke={1.5} />
                  <span>Your typeform is <b>{s.accepting ? 'open' : 'closed'}</b> to new responses.</span>
                </div>
                <section>
                  <h3>Access &amp; Scheduling</h3>
                  <Row label="Open this form to new responses" {...flag('accepting')} />
                  <Row label="Schedule a close date" gem on={false} locked />
                  <Row label="Set a response limit" gem on={false} locked />
                  <Row label="Show custom closed message" gem on={false} locked />
                </section>
              </>
            )}

            {tab === 'language' && (
              <>
                <section>
                  <h3>Form Languages</h3>
                  <div className="fs-two"><span>Main language</span><div className="fs-fake"><span>English</span><Icon name="chevdown" size={18} stroke={1.6} /></div></div>
                </section>
                <section>
                  <h3>Translations</h3>
                  <div className="fs-flex"><span className="fs-p" style={{ margin: 0 }}>Translate this form by uploading your own translations, or with the help of AI.</span><button className="btn" onClick={onTranslations}>Go to Translations</button></div>
                </section>
                <section>
                  <h3>System messages</h3>
                  <p className="fs-p">What respondents read on buttons, hints and errors. Leave a field empty to use the default.</p>
                  {groups.map((g) => (
                    <div key={g} className="fs-grp">
                      <div className="fs-gh"><b>{g}</b><button onClick={() => reset(g)}>Reset all</button></div>
                      {MESSAGES.filter((m) => m.group === g).map((m) => {
                        const v = s.messages[m.key] ?? m.def;
                        return (
                          <label key={m.key} className="fs-msg">
                            <span>{m.label}</span>
                            <span className="fs-inp">
                              <input value={v} maxLength={m.max} onChange={(e) => setMsg(m.key, e.target.value)} aria-label={m.label} />
                              <small>{v.length} / {m.max}</small>
                            </span>
                            {m.vars && <em>Available: {m.vars.map((x) => `{${x}}`).join(', ')}</em>}
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
