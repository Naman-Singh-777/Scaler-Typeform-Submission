import type { Form, FormListItem, FormResponse, Question, ResponsePage, Summary } from './types';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, public status: number, public errors?: Record<string, string>) { super(message); }
}

export const TOKEN_KEY = 'tf_token';
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t: string | null) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };
const authHeader = (): Record<string, string> => { const t = typeof window !== 'undefined' ? getToken() : null; return t ? { Authorization: `Bearer ${t}` } : {}; };

export type AuthUser = { id: number; email: string; name: string };

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      ...init, headers: { 'Content-Type': 'application/json', ...authHeader(), ...(init?.headers || {}) }, cache: 'no-store',
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
  }
  if (!res.ok) {
    let msg = res.statusText, errors;
    try {
      const body = await res.json();
      const d = body.detail;
      if (typeof d === 'string') msg = d;
      else if (d?.message) { msg = d.message; errors = d.errors; }
      else if (Array.isArray(d)) msg = d.map((e: any) => e.msg).join(', ');
    } catch { /* ignore */ }
    throw new ApiError(msg, res.status, errors);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  siteContent: () => req<{ stories: { company: string; quote: string; logo: string }[]; integrations: { name: string; logo: string }[] }>('/site/content'),
  newsletter: (email: string) => req<{ ok: boolean }>('/newsletter', json('POST', { email })),
  contactSales: (body: { name: string; email: string; company?: string; message?: string }) => req<{ ok: boolean }>('/contact-sales', json('POST', body)),
  signup: (body: { name: string; email: string; password: string }) => req<{ token: string; user: AuthUser }>('/auth/signup', json('POST', body)),
  login: (body: { email: string; password: string }) => req<{ token: string; user: AuthUser }>('/auth/login', json('POST', body)),
  me: () => req<AuthUser>('/auth/me'),

  listForms: () => req<FormListItem[]>('/forms'),
  createForm: (title?: string) => req<Form>('/forms', json('POST', { title: title || 'My new form' })),
  getForm: (id: number) => req<Form>(`/forms/${id}`),
  updateForm: (id: number, patch: Partial<Form>) => req<Form>(`/forms/${id}`, json('PATCH', patch)),
  deleteForm: (id: number) => req<void>(`/forms/${id}`, json('DELETE')),
  duplicateForm: (id: number) => req<Form>(`/forms/${id}/duplicate`, json('POST')),
  publish: (id: number) => req<Form>(`/forms/${id}/publish`, json('POST')),
  unpublish: (id: number) => req<Form>(`/forms/${id}/unpublish`, json('POST')),

  addQuestion: (formId: number, type: string, index?: number) => req<Question>(`/forms/${formId}/questions`, json('POST', { type, index })),
  updateQuestion: (id: number, patch: Record<string, unknown>) => req<Question>(`/questions/${id}`, json('PATCH', patch)),
  deleteQuestion: (id: number) => req<void>(`/questions/${id}`, json('DELETE')),
  duplicateQuestion: (id: number) => req<Question>(`/questions/${id}/duplicate`, json('POST')),
  reorder: (formId: number, ids: number[]) => req<Question[]>(`/forms/${formId}/questions/order`, json('PUT', { question_ids: ids })),

  responses: (formId: number, status?: string, offset = 0, limit = 50) =>
    req<ResponsePage>(`/forms/${formId}/responses?limit=${limit}&offset=${offset}${status ? `&status=${status}` : ''}`),
  response: (formId: number, rid: number) => req<FormResponse>(`/forms/${formId}/responses/${rid}`),
  deleteResponse: (formId: number, rid: number) => req<void>(`/forms/${formId}/responses/${rid}`, json('DELETE')),
  summary: (formId: number) => req<Summary>(`/forms/${formId}/summary`),
  csvUrl: (formId: number) => `${API_URL}/api/forms/${formId}/responses/export.csv`,

  publicForm: (slug: string) => req<Form>(`/public/forms/${slug}`),
  startResponse: (slug: string) => req<{ id: number }>(`/public/forms/${slug}/responses`, json('POST')),
  submit: (slug: string, rid: number, answers: Record<number, unknown>) =>
    req<{ id: number }>(`/public/forms/${slug}/responses/${rid}/submit`, json('POST', { answers })),
};

export const publicUrl = (slug: string) => (typeof window !== 'undefined' ? window.location.origin : '') + `/to/${slug}`;
