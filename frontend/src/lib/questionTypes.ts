import type { QType } from './types';

// Pastel chip colours follow the Typeform "Add content" picker (pink = contact, purple = choice, blue = text, green = rating, orange = other).
const PINK = '#f8cdd8', PURPLE = '#ddd6fa', BLUE = '#bddff9', GREEN = '#cdeac8', ORANGE = '#fedcb4', GREY = '#e4e1e7';

export const QUESTION_TYPES: { type: QType; label: string; color: string; icon: string; group: string }[] = [
  { type: 'short_text', label: 'Short Text', color: BLUE, icon: 'short', group: 'Text & Video' },
  { type: 'long_text', label: 'Long Text', color: BLUE, icon: 'long', group: 'Text & Video' },
  { type: 'multiple_choice', label: 'Multiple Choice', color: PURPLE, icon: 'choice', group: 'Choice' },
  { type: 'dropdown', label: 'Dropdown', color: PURPLE, icon: 'dropdown', group: 'Choice' },
  { type: 'yes_no', label: 'Yes/No', color: PURPLE, icon: 'yesno', group: 'Choice' },
  { type: 'email', label: 'Email', color: PINK, icon: 'email', group: 'Contact info' },
  { type: 'number', label: 'Number', color: ORANGE, icon: 'number', group: 'Other' },
  { type: 'rating', label: 'Rating', color: GREEN, icon: 'star', group: 'Rating & ranking' },
];
export const TYPE_META = Object.fromEntries(QUESTION_TYPES.map((t) => [t.type, t])) as Record<QType, (typeof QUESTION_TYPES)[number]>;

// Types the real picker offers that this clone shows as disabled "Coming soon" placeholders.
export const COMING_SOON_TYPES = [
  { label: 'Contact Info', icon: 'contacts', color: PINK, group: 'Contact info' },
  { label: 'Phone Number', icon: 'phone', color: PINK, group: 'Contact info' },
  { label: 'Address', icon: 'pin', color: PINK, group: 'Contact info' },
  { label: 'Website', icon: 'link', color: PINK, group: 'Contact info' },
  { label: 'Picture Choice', icon: 'image', color: PURPLE, group: 'Choice' },
  { label: 'Legal', icon: 'scale', color: PURPLE, group: 'Choice' },
  { label: 'Checkbox', icon: 'checkbox', color: PURPLE, group: 'Choice' },
  { label: 'Net Promoter Score®', icon: 'gauge', color: GREEN, group: 'Rating & ranking' },
  { label: 'Opinion Scale', icon: 'opinion', color: GREEN, group: 'Rating & ranking' },
  { label: 'Ranking', icon: 'ranking', color: GREEN, group: 'Rating & ranking' },
  { label: 'Matrix', icon: 'matrix', color: GREEN, group: 'Rating & ranking' },
  { label: 'Video and Audio', icon: 'video', color: BLUE, group: 'Text & Video' },
  { label: 'File upload', icon: 'upload', color: GREY, group: 'Other' },
  { label: 'Payment', icon: 'card', color: GREY, group: 'Other' },
];
