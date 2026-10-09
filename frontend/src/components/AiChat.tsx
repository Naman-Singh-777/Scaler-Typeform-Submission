'use client';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import AiStudio from './AiStudio';
import { useToast } from './Toast';
import type { Builder } from '@/hooks/useBuilder';

/**
 * "Ask Typeform AI" / "Chat to create" input. Sending a message opens the Typeform AI dialog
 * (AiStudio), which shows the suggested questions and only changes the form when Apply is pressed.
 */
export default function AiChat({ b, variant, placeholder, onAdded }: { b?: Builder; variant: 'rail' | 'bar'; placeholder: string; onAdded?: (firstId: number) => void }) {
  const toast = useToast();
  const [v, setV] = useState('');
  const [studio, setStudio] = useState<string | null>(null);
  const rec = useRef<any>(null);
  const [listening, setListening] = useState(false);

  const send = () => {
    const prompt = v.trim();
    if (!prompt || (b && !b.form)) return;
    setV(''); setStudio(prompt);
  };

  const mic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast('Voice input is not supported in this browser', 'info'); return; }
    if (listening) { rec.current?.stop(); return; }
    const r = new SR(); rec.current = r; r.lang = 'en-US'; r.interimResults = false;
    r.onresult = (e: any) => setV((x) => (x ? x + ' ' : '') + e.results[0][0].transcript);
    r.onend = () => setListening(false);
    r.onerror = () => { setListening(false); toast('Could not hear anything', 'info'); };
    setListening(true); r.start();
  };

  return (
    <div className={`aic aic--${variant}`}>
      <div className="askai__in aic__in">
        <button className={`askai__mic ${listening ? 'on' : ''}`} aria-label="Voice input" onClick={mic}><Icon name="mic" size={16} stroke={1.6} /></button>
        <input placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()} aria-label={placeholder} />
        <button className="askai__go" aria-label="Send" disabled={!v.trim()} onClick={send}><Icon name="play" size={14} stroke={1.6} /></button>
      </div>
      {studio !== null && createPortal(<AiStudio b={b} initial={studio} onClose={() => setStudio(null)} onAdded={onAdded} />, document.body)}
    </div>
  );
}
