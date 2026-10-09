import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'Typeform Clone — people-friendly forms and surveys',
  description: 'Build beautiful, conversational forms and collect responses one question at a time.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Karla:wght@400;500;700&family=Playfair+Display:wght@400;600&family=Space+Grotesk:wght@400;500;700&display=swap"
        />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
