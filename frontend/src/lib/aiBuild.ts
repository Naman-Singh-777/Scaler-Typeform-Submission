import type { QType } from './types';

export interface Spec { type: QType; title: string; description?: string; required?: boolean; choices?: string[] }
export interface Plan { items: Spec[]; intro: string }

const T: Record<string, [RegExp, Spec[]]> = {
  feedback: [/feedback|satisf|review|experience|csat|survey/i, [
    { type: 'rating', title: 'How would you rate your overall experience?', required: true },
    { type: 'multiple_choice', title: 'What did you like the most?', choices: ['Ease of use', 'Design', 'Speed', 'Customer support', 'Price'] },
    { type: 'yes_no', title: 'Would you recommend us to a friend or colleague?', required: true },
    { type: 'long_text', title: 'What could we do better?', description: 'Be as specific as you like.' },
    { type: 'email', title: 'What is your email address?', description: 'Optional — only if you would like a reply.' }] ],
  nps: [/nps|net promoter|recommend/i, [
    { type: 'rating', title: 'How likely are you to recommend us to a friend or colleague?', required: true },
    { type: 'long_text', title: 'What is the main reason for your score?' },
    { type: 'email', title: 'What is your email address?' }] ],
  contact: [/contact|inquiry|enquiry|support|get in touch|lead/i, [
    { type: 'short_text', title: 'What is your name?', required: true },
    { type: 'email', title: 'What is your email address?', required: true },
    { type: 'dropdown', title: 'What can we help you with?', choices: ['Sales', 'Support', 'Partnership', 'Something else'], required: true },
    { type: 'long_text', title: 'Tell us a bit more', description: 'The more detail, the faster we can help.' }] ],
  event: [/event|rsvp|registration|register|webinar|conference|workshop|party|wedding/i, [
    { type: 'short_text', title: 'What is your full name?', required: true },
    { type: 'email', title: 'What is your email address?', required: true },
    { type: 'yes_no', title: 'Will you be attending?', required: true },
    { type: 'number', title: 'How many guests are you bringing?' },
    { type: 'multiple_choice', title: 'Do you have any dietary requirements?', choices: ['None', 'Vegetarian', 'Vegan', 'Gluten-free', 'Other'] },
    { type: 'long_text', title: 'Anything else we should know?' }] ],
  job: [/job|hiring|career|application|recruit|candidate|resume|applicant/i, [
    { type: 'short_text', title: 'What is your full name?', required: true },
    { type: 'email', title: 'What is your email address?', required: true },
    { type: 'dropdown', title: 'Which role are you applying for?', choices: ['Engineering', 'Design', 'Marketing', 'Sales', 'Operations'], required: true },
    { type: 'number', title: 'How many years of relevant experience do you have?' },
    { type: 'file_upload', title: 'Upload your resume', required: true },
    { type: 'long_text', title: 'Why do you want to join us?' }] ],
  order: [/order|purchase|product|shop|booking|book\b|appointment/i, [
    { type: 'short_text', title: 'What is your name?', required: true },
    { type: 'email', title: 'What is your email address?', required: true },
    { type: 'multiple_choice', title: 'Which option would you like?', choices: ['Starter', 'Standard', 'Premium'], required: true },
    { type: 'number', title: 'How many would you like?' },
    { type: 'long_text', title: 'Any special requests?' }] ],
};

/** Tiny rule-based "AI": picks a template from the prompt's keywords (or builds a generic one around its topic). */
export function planFromPrompt(prompt: string): Plan {
  const text = prompt.trim();
  const limit = Number((text.match(/(\d+)\s*(?:questions?|qs?\b)/i) || [])[1]) || 0;
  let items: Spec[] | null = null, kind = '';
  for (const [k, [re, specs]] of Object.entries(T)) if (re.test(text)) { items = specs; kind = k; break; }
  if (!items) {
    const topic = text.replace(/^(create|make|build|generate|write|add|i need|i want|please)\s+(me\s+)?(a|an|the)?\s*/i, '').replace(/\b(form|survey|questionnaire|quiz)\b/ig, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'us';
    items = [
      { type: 'short_text', title: 'What is your name?', required: true },
      { type: 'email', title: 'What is your email address?', required: true },
      { type: 'multiple_choice', title: `What are you most interested in about ${topic}?`, choices: ['Option A', 'Option B', 'Option C'] },
      { type: 'rating', title: `How would you rate your experience with ${topic}?` },
      { type: 'long_text', title: 'Anything else you would like to share?' }];
    kind = 'custom';
  }
  if (limit > 0) items = items.slice(0, Math.min(limit, items.length));
  const intro = kind === 'custom' ? 'Here is a starting point' : `Here is a ${kind === 'nps' ? 'Net Promoter Score' : kind} form`;
  return { items, intro };
}
