// Dark mode for the creator-side UI (dashboard, builder, results). Stored per browser; light unless the user opted into dark.
export type Mode = 'light' | 'dark';
export const MODE_KEY = 'tf_mode';
export const getMode = (): Mode => {
  try {
    const s = localStorage.getItem(MODE_KEY);
    if (s === 'dark' || s === 'light') return s;
  } catch { /* storage blocked */ }
  return 'light'; // light by default; dark only after the user opts in from the account menu
};
export const applyMode = (m: Mode) => {
  document.documentElement.dataset.theme = m;
  try { localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
};
