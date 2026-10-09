// Dark mode for the creator-side UI (dashboard, builder, results). Stored per browser; falls back to the OS setting.
export type Mode = 'light' | 'dark';
export const MODE_KEY = 'tf_mode';
export const getMode = (): Mode => {
  try {
    const s = localStorage.getItem(MODE_KEY);
    if (s === 'dark' || s === 'light') return s;
  } catch { /* storage blocked */ }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};
export const applyMode = (m: Mode) => {
  document.documentElement.dataset.theme = m;
  try { localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
};
