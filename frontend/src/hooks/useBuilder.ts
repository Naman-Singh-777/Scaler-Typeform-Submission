'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import type { Form, Question } from '@/lib/types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type Sender = (patch: any) => Promise<unknown>;

const toServer = (patch: Partial<Question>) => {
  const out: Record<string, unknown> = { ...patch };
  if (patch.choices) out.choices = patch.choices.map((c) => ({ label: c.label }));
  if (patch.rules) out.rules = patch.rules.map((r) => ({ op: r.op, value: r.value, action: r.action, target_question_id: r.target_question_id }));
  return out;
};
let tempId = -1;
export const newTempId = () => tempId--;

/** Loads a form and exposes optimistic, debounced-autosave mutations used by builder / results / share pages. */
export function useBuilder(formId: number) {
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const queue = useRef(new Map<string, { patch: any; timer: ReturnType<typeof setTimeout>; send: Sender }>());

  const flushKey = useCallback(async (key: string) => {
    const e = queue.current.get(key);
    if (!e) return;
    clearTimeout(e.timer);
    queue.current.delete(key);
    try { await e.send(e.patch); if (queue.current.size === 0) setStatus('saved'); }
    catch (err: any) { setStatus('error'); toast(err.message || 'Could not save changes', 'error'); }
  }, [toast]);
  const flushAll = useCallback(() => Promise.all([...queue.current.keys()].map(flushKey)).then(() => undefined), [flushKey]);

  const schedule = useCallback((key: string, patch: any, send: Sender) => {
    const cur = queue.current.get(key);
    if (cur) clearTimeout(cur.timer);
    setStatus('saving');
    queue.current.set(key, { patch: { ...(cur?.patch || {}), ...patch }, send, timer: setTimeout(() => flushKey(key), 600) });
  }, [flushKey]);

  useEffect(() => {
    api.getForm(formId).then(setForm).catch((e) => setLoadError(e.message));
    const unload = () => { queue.current.forEach((_, k) => flushKey(k)); };
    window.addEventListener('beforeunload', unload);
    return () => { window.removeEventListener('beforeunload', unload); unload(); };
  }, [formId, flushKey]);

  const patchQuestions = (fn: (qs: Question[]) => Question[]) => setForm((f) => (f ? { ...f, questions: fn(f.questions) } : f));

  const putQuestion = useCallback((q: Question) => patchQuestions((qs) => qs.map((x) => (x.id === q.id ? q : x))), []);

  const updateForm = useCallback((patch: Partial<Form>) => {
    setForm((f) => (f ? { ...f, ...patch } : f));
    schedule('form', patch, (p) => api.updateForm(formId, p));
  }, [formId, schedule]);

  const updateQuestion = useCallback((id: number, patch: Partial<Question>) => {
    patchQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    schedule(`q${id}`, toServer(patch), (p) => api.updateQuestion(id, p));
  }, [schedule]);

  const changeType = useCallback(async (id: number, type: Question['type']) => {
    await flushKey(`q${id}`);
    try { const q = await api.updateQuestion(id, { type }); patchQuestions((qs) => qs.map((x) => (x.id === id ? q : x))); }
    catch (e: any) { toast(e.message, 'error'); }
  }, [flushKey, toast]);

  const addQuestion = useCallback(async (type: string, index?: number): Promise<Question | null> => {
    try {
      const q = await api.addQuestion(formId, type, index);
      patchQuestions((qs) => { const c = [...qs], i = index ?? c.length; c.splice(i, 0, q); return c.map((x, n) => ({ ...x, position: n })); });
      return q;
    } catch (e: any) { toast(e.message, 'error'); return null; }
  }, [formId, toast]);

  const deleteQuestion = useCallback(async (id: number) => {
    const t = queue.current.get(`q${id}`)?.timer; if (t) clearTimeout(t); queue.current.delete(`q${id}`);
    try {
      await api.deleteQuestion(id);
      patchQuestions((qs) => qs.filter((q) => q.id !== id).map((q, n) => ({ ...q, position: n, rules: q.rules.filter((r) => r.target_question_id !== id) })));
      toast('Question deleted');
    } catch (e: any) { toast(e.message, 'error'); }
  }, [toast]);

  const duplicateQuestion = useCallback(async (id: number): Promise<Question | null> => {
    await flushKey(`q${id}`);
    try {
      const q = await api.duplicateQuestion(id);
      patchQuestions((qs) => { const c = [...qs]; c.splice(qs.findIndex((x) => x.id === id) + 1, 0, q); return c.map((x, n) => ({ ...x, position: n })); });
      toast('Question duplicated');
      return q;
    } catch (e: any) { toast(e.message, 'error'); return null; }
  }, [flushKey, toast]);

  const reorder = useCallback(async (ids: number[]) => {
    patchQuestions((qs) => ids.map((id, n) => ({ ...qs.find((q) => q.id === id)!, position: n })));
    setStatus('saving');
    try { await api.reorder(formId, ids); setStatus('saved'); }
    catch (e: any) { toast(e.message, 'error'); api.getForm(formId).then(setForm); }
  }, [formId, toast]);

  const publish = useCallback(async (): Promise<boolean> => {
    await flushAll();
    try { const f = await api.publish(formId); setForm((x) => (x ? { ...x, status: f.status, published_at: f.published_at } : x)); return true; }
    catch (e: any) { toast(e.message, 'error'); return false; }
  }, [formId, flushAll, toast]);

  const unpublish = useCallback(async () => {
    try { await api.unpublish(formId); setForm((x) => (x ? { ...x, status: 'draft' } : x)); toast('Form unpublished'); }
    catch (e: any) { toast(e.message, 'error'); }
  }, [formId, toast]);

  return { form, loadError, status, putQuestion, updateForm, updateQuestion, changeType, addQuestion, deleteQuestion, duplicateQuestion, reorder, publish, unpublish, flushAll };
}
export type Builder = ReturnType<typeof useBuilder>;
