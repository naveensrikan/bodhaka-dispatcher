/**
 * WhatsApp Business template specifications.
 *
 * Shipped with Bodhaka Dispatcher, auto-created on the student's own Twilio account.
 *
 * CRITICAL Meta rules learned from approval failures:
 *  - A template body MUST NOT start or end with a variable ({{1}}).
 *    Always wrap variables with static text on both sides.
 *  - All templates use UTILITY category (MARKETING gets blocked/charged).
 *  - Body max 1024 chars; we truncate variable values to 800 chars at send time.
 *  - Names: lowercase, alphanumeric + underscore only.
 */

export interface WhatsAppTemplateSpec {
  name: string;
  displayName: string;
  description: string;
  category: 'UTILITY';
  contentType: 'twilio/text';
  language: string;
  body: string;
  variableSamples: Record<string, string>;
  variableLabels: string[];
  /** Whether this is a built-in Bodhaka template (vs user-created) */
  builtin: boolean;
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplateSpec[] = [
  {
    name: 'bodhaka_daily_summary',
    displayName: 'Daily Study Summary',
    description: 'Send the day\'s study material summary',
    category: 'UTILITY',
    contentType: 'twilio/text',
    language: 'en',
    body: '📚 Your Bodhaka study summary for {{1}}:\n\n{{2}}\n\nKeep up the great work!',
    variableSamples: {
      '1': 'Monday',
      '2': 'Today we covered Newton\'s laws of motion. Key takeaway: F = ma is the foundation of classical mechanics.',
    },
    variableLabels: ['Day or subject', 'Summary content'],
    builtin: true,
  },
  {
    name: 'bodhaka_quiz_reminder',
    displayName: 'Quiz Reminder',
    description: 'Send quiz questions for self-testing',
    category: 'UTILITY',
    contentType: 'twilio/text',
    language: 'en',
    body: '✍️ Bodhaka quiz time — {{1}} questions on {{2}}:\n\n{{3}}\n\nReply when you are ready for the answers.',
    variableSamples: {
      '1': '5',
      '2': 'Organic Chemistry',
      '3': '1. What is the IUPAC name of CH3CH2OH?\n2. Define hybridization.\n3. State Markovnikov\'s rule.\n4. List the types of isomerism.\n5. What is an electrophile?',
    },
    variableLabels: ['Number of questions', 'Subject', 'Quiz questions'],
    builtin: true,
  },
  {
    name: 'bodhaka_morning_boost',
    displayName: 'Morning Boost',
    description: 'Daily motivational message to start the day',
    category: 'UTILITY',
    contentType: 'twilio/text',
    language: 'en',
    body: '☀️ Good morning, {{1}}! Here is your boost for today:\n\n{{2}}\n\nHave a great day.',
    variableSamples: {
      '1': 'Aarav',
      '2': 'Just focus on one chapter at a time. Small wins compound. You got this.',
    },
    variableLabels: ['Student first name', 'Motivational message'],
    builtin: true,
  },
  {
    name: 'bodhaka_research_briefing',
    displayName: 'Research Briefing',
    description: 'Send a researched briefing on any topic',
    category: 'UTILITY',
    contentType: 'twilio/text',
    language: 'en',
    body: '🔬 Bodhaka research briefing on {{1}}:\n\n{{2}}\n\nThat is your briefing for today.',
    variableSamples: {
      '1': 'Quantum entanglement',
      '2': 'Quantum entanglement is a phenomenon where pairs of particles remain connected such that the state of one instantly influences the other, regardless of distance.',
    },
    variableLabels: ['Research topic', 'Briefing content'],
    builtin: true,
  },
  {
    name: 'bodhaka_curiosity_spark',
    displayName: 'Curiosity Spark',
    description: 'Daily interesting fact to spark curiosity',
    category: 'UTILITY',
    contentType: 'twilio/text',
    language: 'en',
    body: '✨ Today\'s Bodhaka curiosity fact:\n\n{{1}}\n\nSomething to ponder today.',
    variableSamples: {
      '1': 'Octopuses have three hearts and blue blood. Two hearts pump blood to the gills, while the third pumps it to the rest of the body.',
    },
    variableLabels: ['Interesting fact'],
    builtin: true,
  },
  {
    name: 'bodhaka_preexam_recall',
    displayName: 'Pre-Exam Recall',
    description: 'Active recall prompts before exams',
    category: 'UTILITY',
    contentType: 'twilio/text',
    language: 'en',
    body: '🧠 Bodhaka active recall for {{1}}:\n\n{{2}}\n\nTry these without looking at your notes.',
    variableSamples: {
      '1': 'Cell Biology',
      '2': '1. Describe the function of the mitochondria.\n2. What are the three stages of cellular respiration?\n3. How does osmosis differ from diffusion?',
    },
    variableLabels: ['Exam subject', 'Recall questions'],
    builtin: true,
  },
  {
    name: 'bodhaka_weekly_review',
    displayName: 'Weekly Review',
    description: 'Weekly reflection prompts',
    category: 'UTILITY',
    contentType: 'twilio/text',
    language: 'en',
    body: '🎯 Bodhaka weekly reflection for {{1}}:\n\n{{2}}\n\nReply with your thoughts when ready.',
    variableSamples: {
      '1': 'Week of May 27',
      '2': '1. What was your biggest learning win this week?\n2. Where did you struggle, and why?\n3. What is one thing you will improve next week?',
    },
    variableLabels: ['Week label', 'Reflection prompts'],
    builtin: true,
  },
  {
    name: 'bodhaka_concept_explainer',
    displayName: 'Concept Explainer',
    description: 'Detailed explanation of a tricky concept',
    category: 'UTILITY',
    contentType: 'twilio/text',
    language: 'en',
    body: '💡 Bodhaka concept explainer for {{1}}:\n\n{{2}}\n\nHope that makes it clearer!',
    variableSamples: {
      '1': 'Derivatives in calculus',
      '2': 'A derivative measures how a function changes as its input changes. Think of it as the slope of a curve at a specific point.',
    },
    variableLabels: ['Concept name', 'Explanation'],
    builtin: true,
  },
];

export function findTemplateSpec(name: string): WhatsAppTemplateSpec | undefined {
  return WHATSAPP_TEMPLATES.find((t) => t.name === name);
}

/** Validate a template body against Meta's rules. Returns error string or null. */
export function validateTemplateBody(body: string): string | null {
  const trimmed = body.trim();
  if (trimmed.length === 0) return 'Body cannot be empty';
  if (trimmed.length > 1024) return 'Body exceeds 1024 characters';
  if (/^\{\{/.test(trimmed)) return 'Body cannot start with a variable. Add static text before {{1}}.';
  if (/\}\}$/.test(trimmed)) return 'Body cannot end with a variable. Add static text after the last variable.';
  return null;
}
