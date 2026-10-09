'use client';
import AiChat from './AiChat';
import type { Builder } from '@/hooks/useBuilder';

/** "Ask Typeform AI" box pinned to the bottom of the left rail. */
export default function AskAi({ b, onAdded }: { b?: Builder; onAdded?: (id: number) => void }) {
  return <div className="askai"><AiChat b={b} variant="rail" placeholder="Ask Typeform AI" onAdded={onAdded} /></div>;
}
