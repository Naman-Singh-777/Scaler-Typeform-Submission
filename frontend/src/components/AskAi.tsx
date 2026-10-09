'use client';
import { useState } from 'react';
import Icon from './Icon';
import { useToast } from './Toast';

/** "Ask Typeform AI" box pinned to the bottom of the left rail (placeholder: the AI isn't built). */
export default function AskAi() {
  const [v, setV] = useState('');
  const toast = useToast();
  const go = () => { if (v.trim()) { toast('Typeform AI is coming soon', 'info'); setV(''); } };
  return (
    <div className="askai">
      <div className="askai__in">
        <button className="askai__mic" aria-label="Voice input" onClick={() => toast('Voice input is coming soon', 'info')}><Icon name="mic" size={16} stroke={1.6} /></button>
        <input placeholder="Ask Typeform AI" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} aria-label="Ask Typeform AI" />
        <button className="askai__go" aria-label="Send" disabled={!v.trim()} onClick={go}><Icon name="play" size={14} stroke={1.6} /></button>
      </div>
    </div>
  );
}
