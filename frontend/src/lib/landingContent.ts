// Static copy for the marketing site. Stories + integrations can be overridden by GET /api/site/content.
export type MenuItem = { t: string; d?: string; isNew?: boolean };
export type MenuCol = { h: string; items: MenuItem[]; more?: string };

export const NAV_MENUS: { label: string; cols: MenuCol[]; promos?: { eyebrow: string; title: string; cta: string }[] }[] = [
  {
    label: 'Platform',
    cols: [
      { h: 'Platform', items: [
        { t: 'Platform overview', d: 'What is Typeform?' }, { t: 'Typeform AI', d: 'Your AI know-pilot' },
        { t: 'Typeform MCP', d: 'Use Typeform from your AI tools', isNew: true }, { t: 'Growth Flow', d: 'Automated workflows for GTM teams', isNew: true },
        { t: 'Research Flow', d: 'AI-moderated research studies', isNew: true }, { t: 'Contacts & Automations', d: 'Automated workflows to grow your business' },
        { t: 'Video engagement', d: 'Interactive video forms' }, { t: 'Analytics and reporting', d: 'Answers you can act on' },
        { t: 'Integrations', d: 'Connect all your apps' } ] },
      { h: 'Tools', items: ['Form builder', 'Survey maker', 'Quiz maker', 'Test maker', 'Poll builder', 'Application form builder', 'Landing page builder', 'NPS form builder', 'Registration form builder', 'Short form builder'].map((t) => ({ t })) },
    ],
    promos: [
      { eyebrow: 'TEMPLATES', title: 'Free form, survey, and quiz templates', cta: 'Choose one →' },
      { eyebrow: 'Research Flow', title: 'Run in-depth AI‑moderated studies in hours', cta: 'Learn more →' },
    ],
  },
  {
    label: 'Solutions',
    cols: [
      { h: 'Teams', items: [{ t: 'Marketing', d: 'For B2B and B2C marketing' }, { t: 'Product', d: 'For product, UX, and research' }, { t: 'Human resources', d: 'For HR, ops, and talent' }, { t: 'Customer success', d: 'For CS and education' }] },
      { h: 'Use cases', items: ['Lead generation', 'Employee onboarding', 'Employee satisfaction', 'Employee engagement', 'Customer feedback'].map((t) => ({ t })), more: 'View all use cases →' },
      { h: 'Plans', items: [{ t: 'Core', d: 'Plans for everyone' }, { t: 'Growth', d: 'Plans for GTM teams', isNew: true }, { t: 'Research Flow', d: 'Plans for research teams', isNew: true }, { t: 'Talent', d: 'Plans for HR and people teams' }, { t: 'Enterprise', d: 'Plans for larger orgs' }] },
    ],
  },
  {
    label: 'Resources',
    cols: [
      { h: 'Support', items: [{ t: 'Help center', d: 'Find quick answers' }, { t: 'Community', d: 'Share and interact' }, { t: 'Contact us', d: 'Speak to our team' }] },
      { h: 'Company', items: [{ t: 'Partners', d: 'Browse or join' }, { t: 'Careers', d: 'Join our team' }, { t: 'Webinars', d: 'Learn and get inspired' }] },
      { h: 'Blog', items: [{ t: 'Our guides, latest news, and more.' }], more: 'Browse blog →' },
    ],
  },
];

export const HERO_TABS = [
  { k: 'ASK', title: 'Intelligent Forms', desc: 'Build forms that adapt to every respondent and then analyze your data for rich insights.', wistia: '2xnbogakrp' },
  { k: 'ACT', title: 'Growth Flow', isNew: true, desc: 'Convert and keep customers with automated AI segmentation and follow-ups.', wistia: 'zki3yjc4q4' },
  { k: 'LEARN', title: 'Research Flow', isNew: true, desc: 'Make confident business decisions fast with AI‑moderated studies and automated reports.', wistia: 't7cmlcvvv1' },
];

export type Feature = { icon: string; title: string; desc: string };
export const FEATURES = {
  forms: [
    { icon: 'ic-chart-line', title: 'High Response Rate', desc: 'Build forms people actually fill out with beautiful design and conversational logic that adapts to every response, doubling the completion rate vs. traditional forms.' },
    { icon: 'ic-video', title: 'Deeper Insights', desc: 'Get rich answers with video and audio responses, plus extra context from AI-generated follow-up questions that adapt as people complete your form.' },
    { icon: 'ic-chart-bar', title: 'Advanced Analytics', desc: 'Dig into both qualitative and quantitative data with topic and sentiment analysis, respondent comparison, and form drop-off analysis.' },
  ] as Feature[],
  growth: [
    { icon: 'ic-user-add', title: 'Instant Lead Capture', desc: 'Close deals directly in your forms. Capture e-signatures, schedule meetings with Google Calendar and Calendly, and accept payments with Stripe and Paypal.' },
    { icon: 'ic-multi-contact', title: 'Data Enrichment', desc: 'Enrich data to complete customer profiles, with industry-leading match rates of up to 92% for B2B companies and 71% for B2C companies.' },
    { icon: 'ic-envelope', title: 'Customer Engagement', desc: 'Follow up instantly across email, SMS, and your favorite tools. Trigger personalized workflows from any form submission or contact update.' },
  ] as Feature[],
  research: [
    { icon: 'ic-lightbulb', title: 'Fast Insights', desc: 'Get insights in hours, not weeks. AI handles recruiting, moderating, and synthesizing research studies from start to finish, so you uncover deep insights at light speed.' },
    { icon: 'ic-video', title: 'Qualitative & Quantitative', desc: 'Run AI-moderated text, video, and voice interviews at survey scale and in one platform. Capture tone, hesitation, and the reasoning behind every answer.' },
    { icon: 'ic-badge', title: 'Verified Panel Recruitment', desc: 'Get the best possible insights. Use 400+ targeting criteria to reach the right audience, with built-in incentive management so you need fewer tools.' },
  ] as Feature[],
};

export type Story = { id?: number; company: string; quote: string; logo: string };
export const STORIES: Story[] = [
  { company: 'SmartBug Media', quote: 'SmartBug Media increased sales leads by 40% with one form', logo: '/landing/cust-smartbug.png' },
  { company: 'Double Denim Marketing', quote: 'Double Denim Marketing drove $3.67 million in sales', logo: '/landing/cust-dd.png' },
  { company: 'Viva', quote: 'Viva scaled talent acquisition and cut time to hire by 75%', logo: '/landing/cust-viva.png' },
];

export type Integration = { name: string; logo: string };
export const INTEGRATIONS: Integration[] = [
  ['ActiveCampaign', 'activecampaign'], ['Calendly', 'calendly'], ['CallRail', 'callrail'], ['Intercom', 'intercom'], ['Klaviyo', 'klaviyo'],
  ['Slack', 'slack'], ['Stripe', 'stripe'], ['Webflow', 'webflow'], ['Zapier', 'zapier'],
].map(([name, k]) => ({ name, logo: `/landing/int-${k}.svg` }));

export const FOOTER_COLS: { h: string; links: { t: string; exp?: boolean }[] }[] = [
  { h: 'PRODUCT', links: [{ t: 'Pricing' }, { t: 'Enterprise', exp: true }] },
  { h: 'TEMPLATES', links: [{ t: 'Popular templates', exp: true }, { t: 'Recent templates', exp: true }, { t: 'Popular categories', exp: true }, { t: 'Recent categories', exp: true }] },
  { h: 'INTEGRATIONS', links: [{ t: 'Popular integration apps', exp: true }, { t: 'More integration apps', exp: true }, { t: 'Popular app categories', exp: true }, { t: 'More app categories', exp: true }] },
  { h: 'RESOURCES', links: [{ t: 'Blog' }, { t: 'Guides' }, { t: 'Help center' }, { t: 'Community' }, { t: 'Tutorials' }, { t: 'FAQs' }, { t: 'Why Typeform?', exp: true }, { t: 'Referral program' }, { t: 'Partners', exp: true }, { t: 'System status' }, { t: 'Developers / API' }, { t: 'AI Info' }] },
  { h: 'GET TO KNOW US', links: [{ t: 'About us' }, { t: 'Brand' }, { t: 'Careers' }, { t: 'Contact sales' }, { t: 'Legal' }, { t: 'Newsletter' }] },
];
