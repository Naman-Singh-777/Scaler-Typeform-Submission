import { createContext } from 'react';
import type { Form } from './types';

/** Per-form options from Builder > Form settings. Stored in forms.settings and read by the respondent view. */
export type FormSettings = {
  nav_arrows?: boolean; progress_bar?: boolean; question_number?: boolean; asterisks?: boolean; letters?: boolean;
  autosave?: boolean; free_nav?: boolean; cookie_consent?: boolean; accepting?: boolean; notify?: boolean;
  messages?: Record<string, string>;
};
export const FS_DEFAULTS = { nav_arrows: true, progress_bar: true, question_number: true, asterisks: true, letters: true, autosave: true, free_nav: false, cookie_consent: false, accepting: true, notify: false };
export type FS = typeof FS_DEFAULTS & { messages: Record<string, string> };
export const resolveSettings = (form: Pick<Form, 'settings'>): FS => ({ ...FS_DEFAULTS, ...(form.settings || {}), messages: form.settings?.messages || {} });

export type MsgDef = { group: string; key: string; label: string; def: string; max: number; vars?: string[] };
/** The system messages respondents see, in the order the original lists them. Only messages this clone actually shows. */
export const MESSAGES: MsgDef[] = [
  { group: 'Buttons, hints, and shortcuts', key: 'ok_button', label: 'Button to confirm answer', def: 'OK', max: 100 },
  { group: 'Buttons, hints, and shortcuts', key: 'enter_hint', label: 'Keyboard instruction to go to next question', def: 'press *Enter* ↵', max: 200 },
  { group: 'Buttons, hints, and shortcuts', key: 'multi_hint', label: 'Hint for multiple selection', def: 'Choose as many as you like', max: 165 },
  { group: 'Buttons, hints, and shortcuts', key: 'dropdown_hint', label: 'Instruction for Dropdown question', def: 'Type or select an option', max: 100 },
  { group: 'Buttons, hints, and shortcuts', key: 'text_hint', label: 'Hint for adding text', def: 'Type your answer here...', max: 100 },
  { group: 'Buttons, hints, and shortcuts', key: 'yes_label', label: 'Button to respond “Yes”', def: 'Yes', max: 255 },
  { group: 'Buttons, hints, and shortcuts', key: 'no_label', label: 'Button to respond “No”', def: 'No', max: 255 },
  { group: 'Buttons, hints, and shortcuts', key: 'submit_button', label: 'Button to send typeform', def: 'Submit', max: 100 },
  { group: 'Error messages', key: 'err_required', label: 'If an answer is required', def: 'Please fill this in', max: 64 },
  { group: 'Error messages', key: 'err_selection', label: 'If an answer requires a selection', def: 'Oops! Please make a selection', max: 386 },
  { group: 'Error messages', key: 'err_email', label: 'If an email address is incorrect', def: 'Hmm... that email doesn’t look right', max: 218 },
  { group: 'Error messages', key: 'err_number', label: 'If the entry is not a number', def: 'Numbers only please!', max: 218 },
  { group: 'Error messages', key: 'err_number_range', label: 'If number exceeds set min and max limits', def: 'Please enter a number between {min_value} and {max_value}', max: 64, vars: ['min_value', 'max_value'] },
  { group: 'Error messages', key: 'err_number_low', label: 'If the number entered is too low', def: 'Please enter a number greater than {min_value}', max: 141, vars: ['min_value'] },
  { group: 'Error messages', key: 'err_number_high', label: 'If the number entered is too high', def: 'Please enter a number lower than {max_value}', max: 141, vars: ['max_value'] },
  { group: 'Loading & completing a typeform', key: 'err_server', label: 'Error if there’s a problem with the server', def: 'Server error! Your request wasn’t completed', max: 128 },
  { group: 'Other', key: 'line_break', label: 'Hint for making a line break in Long Text questions', def: '*Shift ⇧ + Enter ↵* to make a line break', max: 128 },
];
const DEF = Object.fromEntries(MESSAGES.map((m) => [m.key, m.def]));
export const fmt = (s: string, vars?: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : `{${k}}`));
export const makeT = (messages: Record<string, string> = {}) => (key: string, vars?: Record<string, string | number>) => fmt(messages[key]?.trim() ? messages[key] : DEF[key] ?? key, vars);

export const RunnerCtx = createContext<{ s: FS; t: ReturnType<typeof makeT> }>({ s: { ...FS_DEFAULTS, messages: {} }, t: makeT() });
