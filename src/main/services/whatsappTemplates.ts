/**
 * WhatsApp Business template specifications.
 *
 * Each template is shipped with Bodhaka Forge and gets auto-created on the
 * student's own Twilio account (and submitted to Meta for approval) when they
 * click "Provision templates" in the WhatsApp Templates page.
 *
 * Important constraints from WhatsApp/Twilio:
 *  - Total body length: 1024 chars max
 *  - Each {{n}} variable can hold up to ~700 chars practically (but we truncate
 *    each variable to 800 chars in the executor for safety)
 *  - "category" must be UTILITY, MARKETING, or AUTHENTICATION
 *  - Naming must be lowercase, no spaces, alphanumeric/underscore only
 *  - We use UTILITY (free during 24hr window) for daily helpers,
 *    MARKETING (per-message charge) for nudges/recreational
 */

export interface WhatsAppTemplateSpec {
  /** Used as the WhatsApp template name. Must be unique per Twilio account. */
  name: string;
  /** Human-friendly display in the app */
  displayName: string;
  /** Short description shown in UI */
  description: string;
  /** WhatsApp template category */
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  /** Twilio Content API content type */
  contentType: 'twilio/text';
  /** Language code */
  language: string;
  /** Body with {{1}}, {{2}}, etc. placeholders */
  body: string;
  /** Sample values for approval — Meta needs these to review the template */
  variableSamples: Record<string, string>;
  /** Human-readable description of what each variable is used for */
  variableLabels: string[];
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplateSpec[] = [
  {
    name: 'bodhaka_daily_summary',
    displayName: 'Daily Study Summary',
    description: 'Send the day\'s study material summary',
    category: 'UTILITY',
    contentType: 'twilio/text',
    language: 'en',
    body: '📚 Your Bodhaka daily study summary for {{1}}:\n\n{{2}}\n\nKeep it up!',
    variableSamples: {
      '1': 'Monday',
      '2': 'Today we covered Newton\'s laws of motion. Key takeaway: F = ma is the foundation of classical mechanics.',
    },
    variableLabels: ['Day or subject', 'Summary content'],
  },
  {
    name: 'bodhaka_quiz_reminder',
    displayName: 'Quiz Reminder',
    description: 'Send quiz questions for self-testing',
    category: 'UTILITY',
    contentType: 'twilio/text',
    language: 'en',
    body: '✍️ Bodhaka quiz time — {{1}} questions on {{2}}:\n\n{{3}}\n\nReply when ready for answers.',
    variableSamples: {
      '1': '5',
      '2': 'Organic Chemistry',
      '3': '1. What is the IUPAC name of CH3CH2OH?\n2. Define hybridization.\n3. What is Markovnikov\'s rule?\n4. List the types of isomerism.\n5. What is an electrophile?',
    },
    variableLabels: ['Number of questions', 'Subject', 'Quiz questions'],
  },
  {
    name: 'bodhaka_morning_boost',
    displayName: 'Morning Boost',
    description: 'Daily motivational message to start the day',
    category: 'MARKETING',
    contentType: 'twilio/text',
    language: 'en',
    body: '☀️ Good morning, {{1}}!\n\n{{2}}\n\n— Bodhaka',
    variableSamples: {
      '1': 'Aarav',
      '2': 'Today, just focus on one chapter at a time. Small wins compound. You got this.',
    },
    variableLabels: ['Student first name', 'Motivational message'],
  },
  {
    name: 'bodhaka_research_briefing',
    displayName: 'Research Briefing',
    description: 'Send a researched briefing on any topic',
    category: 'UTILITY',
    contentType: 'twilio/text',
    language: 'en',
    body: '🔬 Bodhaka research briefing — {{1}}\n\n{{2}}',
    variableSamples: {
      '1': 'Quantum entanglement',
      '2': 'Quantum entanglement is a phenomenon where pairs of particles remain connected such that the state of one instantly influences the other, regardless of distance. Recent experiments by IBM in 2025 demonstrated entanglement across 1000 km using satellite relays.',
    },
    variableLabels: ['Research topic', 'Briefing content'],
  },
  {
    name: 'bodhaka_curiosity_spark',
    displayName: 'Curiosity Spark',
    description: 'Daily interesting fact to spark curiosity',
    category: 'MARKETING',
    contentType: 'twilio/text',
    language: 'en',
    body: '✨ Today\'s Bodhaka curiosity:\n\n{{1}}\n\nSomething to ponder today.',
    variableSamples: {
      '1': 'Did you know that octopuses have three hearts and blue blood? Two hearts pump blood to the gills, while the third pumps it to the rest of the body. The blue color comes from copper-based hemocyanin instead of iron-based hemoglobin.',
    },
    variableLabels: ['Interesting fact'],
  },
  {
    name: 'bodhaka_preexam_recall',
    displayName: 'Pre-Exam Recall',
    description: 'Active recall prompts before exams',
    category: 'UTILITY',
    contentType: 'twilio/text',
    language: 'en',
    body: '🧠 Bodhaka active recall — {{1}}:\n\n{{2}}\n\nTry these without looking at your notes.',
    variableSamples: {
      '1': 'Cell Biology',
      '2': '1. Describe the function of the mitochondria.\n2. What are the three stages of cellular respiration?\n3. How does osmosis differ from diffusion?\n4. Name the organelles involved in protein synthesis.\n5. What is the role of the Golgi apparatus?',
    },
    variableLabels: ['Exam subject', 'Recall questions'],
  },
  {
    name: 'bodhaka_weekly_review',
    displayName: 'Weekly Review',
    description: 'Weekly reflection prompts',
    category: 'UTILITY',
    contentType: 'twilio/text',
    language: 'en',
    body: '🎯 Bodhaka weekly reflection for {{1}}:\n\n{{2}}\n\nReply with your thoughts.',
    variableSamples: {
      '1': 'Week of May 27',
      '2': '1. What was your biggest learning win this week?\n2. Where did you struggle, and why?\n3. What\'s the one thing you\'ll improve next week?\n4. How were your sleep and energy?\n5. What deserves a small celebration?',
    },
    variableLabels: ['Week label', 'Reflection prompts'],
  },
  {
    name: 'bodhaka_concept_explainer',
    displayName: 'Concept Explainer',
    description: 'Detailed explanation of a tricky concept',
    category: 'UTILITY',
    contentType: 'twilio/text',
    language: 'en',
    body: '💡 Bodhaka concept explainer — {{1}}\n\n{{2}}',
    variableSamples: {
      '1': 'Derivatives in calculus',
      '2': 'A derivative measures how a function changes as its input changes. Think of it as the slope of a curve at a specific point. If you drive a car and your speedometer shows 60 km/h, that reading is the derivative of your position with respect to time at that instant.',
    },
    variableLabels: ['Concept name', 'Explanation'],
  },
];

export function findTemplateSpec(name: string): WhatsAppTemplateSpec | undefined {
  return WHATSAPP_TEMPLATES.find((t) => t.name === name);
}
