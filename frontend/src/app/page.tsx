import type { Metadata } from 'next';
import Landing from '@/components/landing/Landing';

export const metadata: Metadata = {
  title: 'Form Builder with AI Automation | Typeform',
  description: 'Combine AI forms and automated workflows to drive revenue growth. Run in-depth research and manage the entire customer lifecycle.',
};

export default function Page() {
  return <Landing />;
}
