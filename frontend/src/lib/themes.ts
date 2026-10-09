import type { Theme } from './types';

export const THEMES: { name: string; theme: Theme }[] = [
  { name: 'Classic', theme: { preset: 'classic', background: '#FFFFFF', text: '#262627', answer: '#0445AF', button: '#0445AF', buttonText: '#FFFFFF', font: 'Karla' } },
  { name: 'Sunrise', theme: { preset: 'sunrise', background: '#FFF4E6', text: '#3D2B1F', answer: '#D9480F', button: '#D9480F', buttonText: '#FFFFFF', font: 'Playfair Display' } },
  { name: 'Night', theme: { preset: 'night', background: '#161616', text: '#FFFFFF', answer: '#8CB8FF', button: '#8CB8FF', buttonText: '#0B1E3F', font: 'Space Grotesk' } },
  { name: 'Forest', theme: { preset: 'forest', background: '#0B3D2E', text: '#F4F1DE', answer: '#F2CC8F', button: '#F2CC8F', buttonText: '#0B3D2E', font: 'Karla' } },
  { name: 'Lavender', theme: { preset: 'lavender', background: '#EFEAFB', text: '#2B2250', answer: '#6B4EE6', button: '#6B4EE6', buttonText: '#FFFFFF', font: 'Inter' } },
  { name: 'Blush', theme: { preset: 'blush', background: '#FDECEF', text: '#4A1D2B', answer: '#C2185B', button: '#C2185B', buttonText: '#FFFFFF', font: 'Karla' } },
];
export const FONTS = ['Karla', 'Inter', 'Playfair Display', 'Space Grotesk'];
export const DEFAULT_THEME = THEMES[0].theme;

const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

/** CSS variables consumed by .tf-theme (see globals.css). */
export function themeVars(t?: Partial<Theme>): React.CSSProperties {
  const th = { ...DEFAULT_THEME, ...(t || {}) };
  return {
    '--bg': th.background, '--fg': th.text, '--ans': th.answer, '--ans-rgb': hexToRgb(th.answer),
    '--fg-rgb': hexToRgb(th.text), '--btn': th.button, '--btn-fg': th.buttonText, '--font': `'${th.font}', sans-serif`,
  } as React.CSSProperties;
}
