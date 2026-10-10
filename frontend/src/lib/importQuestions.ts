import type { QType } from './types';

/** Turns pasted lines into questions. Picks a sensible type from the wording; "Question: a | b | c" becomes a choice question. */
export function guessQuestions(lines: string[]): { title: string; type: QType; choices?: string[] }[] {
  return lines.map((raw) => {
    let title = raw.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').trim();
    let choices: string[] | undefined;
    const m = title.match(/^(.*?)(?:\s*[:(]\s*)([^:()]+(?:[,|/][^:()]+)+)\)?\s*$/);
    if (m) {
      const opts = m[2].split(/[,|/]/).map((x) => x.trim()).filter(Boolean);
      if (opts.length >= 2 && opts.length <= 12) { title = m[1].trim() || title; choices = opts; }
    }
    let type: QType = 'short_text';
    if (choices) type = 'multiple_choice';
    else if (/e-?mail/i.test(title)) type = 'email';
    else if (/\b(rate|rating|stars?|satisf)/i.test(title)) type = 'rating';
    else if (/^(do|does|did|are|is|have|has|would|can|will|should)\b.*\?$/i.test(title) || /\byes\s*(or|\/)\s*no\b/i.test(title)) type = 'yes_no';
    else if (/\b(how many|how old|age|number of|quantity)\b/i.test(title)) type = 'number';
    else if (/\b(describe|explain|tell us|comments?|feedback|why|suggest)/i.test(title)) type = 'long_text';
    return { title, type, choices };
  });
}
