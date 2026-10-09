'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import FormRunner from '@/components/runner/FormRunner';
import { api } from '@/lib/api';
import type { Form } from '@/lib/types';

export default function PublicForm({ params }: { params: { slug: string } }) {
  const [form, setForm] = useState<Form | null>(null);
  const [err, setErr] = useState<{ status: number; msg: string } | null>(null);

  useEffect(() => {
    api.publicForm(params.slug).then(setForm).catch((e) => setErr({ status: e.status, msg: e.message }));
  }, [params.slug]);

  useEffect(() => { if (form) document.title = form.title; }, [form]);

  if (err)
    return (
      <div className="center-page tf-notfound">
        <div>
          <h1 style={{ fontSize: 34, marginBottom: 10 }}>{err.status === 404 ? 'This form isn’t available' : 'Something went wrong'}</h1>
          <p className="muted" style={{ fontSize: 18, marginBottom: 24 }}>
            {err.status === 404 ? 'It may have been unpublished or the link may be incorrect.' : err.msg}
          </p>
          <Link href="/" className="btn primary">Create your own form</Link>
        </div>
      </div>
    );
  if (!form) return <div style={{ minHeight: '100vh', background: '#fff' }} />;
  return <FormRunner form={form} mode="live" />;
}
