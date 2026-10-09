export type QType = 'short_text' | 'long_text' | 'multiple_choice' | 'dropdown' | 'email' | 'number' | 'yes_no' | 'rating';
export type RuleOp = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';

export interface Choice { id: number; label: string }
export interface Rule { id: number; op: RuleOp; value: string; action: 'jump' | 'end'; target_question_id: number | null }
export interface Question {
  id: number; form_id: number; position: number; type: QType; title: string; description: string;
  required: boolean; settings: Record<string, any>; choices: Choice[]; rules: Rule[];
}
export interface Theme { preset: string; background: string; text: string; answer: string; button: string; buttonText: string; font: string }
export interface Form {
  id: number; title: string; slug: string; status: 'draft' | 'published'; theme: Theme;
  welcome_enabled: boolean; welcome_title: string; welcome_description: string; welcome_button: string;
  thankyou_title: string; thankyou_description: string;
  created_at: string; updated_at: string; published_at: string | null; questions: Question[];
}
export interface FormListItem { id: number; title: string; slug: string; status: 'draft' | 'published'; question_count: number; response_count: number; started_count: number; theme: Theme; updated_at: string }
export interface FormResponse { id: number; status: 'completed' | 'partial'; started_at: string; submitted_at: string | null; answers: Record<string, any> }
export interface ResponsePage { total: number; items: FormResponse[] }
export interface QuestionSummary {
  id: number; title: string; type: QType; answered: number; skipped: number;
  counts?: { label: string; count: number }[]; average?: number | null; min?: number | null; max?: number | null; latest?: string[];
}
export interface Summary { views: number; starts: number; completions: number; completion_rate: number; avg_time_seconds: number | null; questions: QuestionSummary[] }
