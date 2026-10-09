'use client';
import { createContext, useCallback, useContext, useState } from 'react';
import Icon from './Icon';

type ToastType = 'success' | 'error' | 'info';
const Ctx = createContext<(msg: string, type?: ToastType) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string; type: ToastType }[]>([]);
  const push = useCallback((msg: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, msg, type }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <Icon name={t.type === 'error' ? 'x' : t.type === 'info' ? 'sparkle' : 'check'} size={16} stroke={2.4} />
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
