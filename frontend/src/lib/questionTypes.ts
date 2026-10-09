import type { QType } from './types';

export const QUESTION_TYPES: { type: QType; label: string; color: string; icon: string; group: string }[] = [
  { type: 'short_text', label: 'Short text', color: '#E8A33D', icon: 'short', group: 'Text' },
  { type: 'long_text', label: 'Long text', color: '#D98324', icon: 'long', group: 'Text' },
  { type: 'multiple_choice', label: 'Multiple choice', color: '#3E7BFA', icon: 'choice', group: 'Choice' },
  { type: 'dropdown', label: 'Dropdown', color: '#6C5CE7', icon: 'dropdown', group: 'Choice' },
  { type: 'yes_no', label: 'Yes / No', color: '#2BB673', icon: 'yesno', group: 'Choice' },
  { type: 'email', label: 'Email', color: '#17A398', icon: 'email', group: 'Contact info' },
  { type: 'number', label: 'Number', color: '#E5586E', icon: 'number', group: 'Contact info' },
  { type: 'rating', label: 'Rating', color: '#F2B01E', icon: 'star', group: 'Rating & ranking' },
];
export const TYPE_META = Object.fromEntries(QUESTION_TYPES.map((t) => [t.type, t])) as Record<QType, (typeof QUESTION_TYPES)[number]>;
export const COMING_SOON_TYPES = [
  { label: 'File upload', icon: 'upload', color: '#9AA0A6' },
  { label: 'Payment', icon: 'card', color: '#9AA0A6' },
];
