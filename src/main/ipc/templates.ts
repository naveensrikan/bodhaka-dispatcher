import { ipcMain } from 'electron';
import { randomUUID } from 'crypto';
import { getDb } from '../db/database';
import { scheduleAgent } from '../services/scheduler';

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'study' | 'recreation' | 'wellness' | 'utility' | 'productivity';
  icon: string;
  schedule: string | null;
  definition: { nodes: any[]; edges: any[] };
}

function n(type: string, x: number, y: number, data: any = {}) {
  return { id: `${type}-${Math.random().toString(36).slice(2, 8)}`, type, position: { x, y }, data };
}
function e(s: string, t: string) { return { id: `e-${s}-${t}`, source: s, target: t }; }

function buildTemplates(): Template[] {
  return [
    {
      id: 'daily-study-summary',
      name: 'Daily Study Summary',
      description: 'Every morning at 7am, summarize your study material and email it to you.',
      category: 'study',
      icon: '📚',
      schedule: '0 7 * * *',
      definition: (() => {
        const a = n('scheduleTrigger', 80, 200, { label: 'Daily 7am', cron: '0 7 * * *' });
        const b = n('knowledgeBase', 320, 200, { label: 'Study material', docIds: [] });
        const c = n('summarize', 560, 200, { label: 'As flashcards', style: 'flashcards' });
        const d = n('sendEmail', 800, 200, { label: 'Email me', subject: '📚 Morning study summary', to: '' });
        return { nodes: [a, b, c, d], edges: [e(a.id, b.id), e(b.id, c.id), e(c.id, d.id)] };
      })(),
    },
    {
      id: 'evening-quiz',
      name: 'Evening Self-Quiz',
      description: 'A 5-question quiz on your material every evening at 7pm.',
      category: 'study',
      icon: '✍️',
      schedule: '0 19 * * *',
      definition: (() => {
        const a = n('scheduleTrigger', 80, 200, { label: 'Daily 7pm', cron: '0 19 * * *' });
        const b = n('knowledgeBase', 320, 200, { label: 'Study material', docIds: [] });
        const c = n('generateQuiz', 560, 200, { label: '5 questions', numQuestions: 5 });
        const d = n('sendEmail', 800, 200, { label: 'Email it', subject: '✍️ Your evening quiz', to: '' });
        return { nodes: [a, b, c, d], edges: [e(a.id, b.id), e(b.id, c.id), e(c.id, d.id)] };
      })(),
    },
    {
      id: 'good-morning',
      name: 'Good Morning Boost',
      description: 'A daily motivational message tailored to your interests.',
      category: 'wellness',
      icon: '☀️',
      schedule: '30 7 * * *',
      definition: (() => {
        const a = n('scheduleTrigger', 80, 200, { label: 'Daily 7:30am', cron: '30 7 * * *' });
        const b = n('llmPrompt', 320, 200, {
          label: 'Generate boost',
          system: 'You are a warm, encouraging mentor for a student. Keep messages genuine and non-corny. Under 80 words.',
          prompt: 'Write a fresh morning encouragement for today. Include one tiny actionable suggestion. Avoid clichés.',
          maxTokens: 200, temperature: 0.85,
        });
        const c = n('sendEmail', 560, 200, { label: 'Email it', subject: '☀️ Good morning', to: '' });
        return { nodes: [a, b, c], edges: [e(a.id, b.id), e(b.id, c.id)] };
      })(),
    },
    {
      id: 'research-topic',
      name: 'Research a Topic',
      description: 'Manually trigger with any topic — get a synthesized research briefing.',
      category: 'utility',
      icon: '🔬',
      schedule: null,
      definition: (() => {
        const a = n('manualTrigger', 80, 200, { label: 'Run' });
        const b = n('userInput', 320, 200, { label: 'Topic', value: 'Enter topic here' });
        const c = n('webSearch', 560, 200, { label: 'Search web' });
        const d = n('llmPrompt', 800, 200, {
          label: 'Synthesize',
          system: 'Expert research assistant. Synthesize sources into a clean briefing.',
          prompt: 'Sources:\n\n{{input}}\n\nProduce: TL;DR, Key Concepts, Recent Developments, Further Reading.',
          maxTokens: 1500,
        });
        const f = n('sendEmail', 1040, 200, { label: 'Email it', subject: '🔬 Research briefing', to: '' });
        return { nodes: [a, b, c, d, f], edges: [e(a.id, b.id), e(b.id, c.id), e(c.id, d.id), e(d.id, f.id)] };
      })(),
    },
    {
      id: 'weekly-progress-review',
      name: 'Weekly Progress Review',
      description: 'Every Sunday evening, reflect on the week ahead using your goals as context.',
      category: 'wellness',
      icon: '🎯',
      schedule: '0 20 * * 0',
      definition: (() => {
        const a = n('scheduleTrigger', 80, 200, { label: 'Sunday 8pm', cron: '0 20 * * 0' });
        const b = n('llmPrompt', 320, 200, {
          label: 'Generate review prompts',
          system: 'You help students reflect productively. Be specific, not generic.',
          prompt: 'Generate 5 reflection prompts for a student looking back on their week and planning the next. Include questions on study progress, wellbeing, and one wild-card.',
          maxTokens: 600,
        });
        const c = n('sendEmail', 560, 200, { label: 'Email it', subject: '🎯 Sunday reflection', to: '' });
        return { nodes: [a, b, c], edges: [e(a.id, b.id), e(b.id, c.id)] };
      })(),
    },
    {
      id: 'concept-explainer',
      name: 'Explain a Concept Simply',
      description: 'Run on demand: enter a tricky concept, get a Feynman-style explanation.',
      category: 'study',
      icon: '💡',
      schedule: null,
      definition: (() => {
        const a = n('manualTrigger', 80, 200, { label: 'Run' });
        const b = n('userInput', 320, 200, { label: 'Concept', value: 'Enter the concept here' });
        const c = n('llmPrompt', 560, 200, {
          label: 'Feynman-style explanation',
          system: 'You explain concepts as if to a curious 12-year-old. Use vivid analogies. Build up slowly. End with one common misconception.',
          prompt: 'Explain this concept:\n\n{{input}}',
          maxTokens: 1200,
        });
        const d = n('displayResult', 800, 200, { label: 'Show result' });
        return { nodes: [a, b, c, d], edges: [e(a.id, b.id), e(b.id, c.id), e(c.id, d.id)] };
      })(),
    },
    {
      id: 'argument-settler',
      name: 'Settle an Argument',
      description: 'Get a balanced, fact-checked answer to friendly debates.',
      category: 'recreation',
      icon: '⚖️',
      schedule: null,
      definition: (() => {
        const a = n('manualTrigger', 80, 200, { label: 'Run' });
        const b = n('userInput', 320, 200, { label: 'The argument', value: 'e.g. Is pineapple on pizza acceptable?' });
        const c = n('webSearch', 560, 200, { label: 'Get the facts' });
        const d = n('llmPrompt', 800, 200, {
          label: 'Verdict',
          system: 'You settle arguments fairly. Present both sides briefly, then give a clear verdict with reasoning.',
          prompt: 'Argument: {{input}}\n\nGive the verdict.',
          maxTokens: 800,
        });
        const f = n('displayResult', 1040, 200, { label: 'Show verdict' });
        return { nodes: [a, b, c, d, f], edges: [e(a.id, b.id), e(b.id, c.id), e(c.id, d.id), e(d.id, f.id)] };
      })(),
    },
    {
      id: 'pre-exam-recall',
      name: 'Pre-Exam Active Recall',
      description: 'The night before exams — generate active recall questions on key topics.',
      category: 'study',
      icon: '🧠',
      schedule: null,
      definition: (() => {
        const a = n('manualTrigger', 80, 200, { label: 'Run' });
        const b = n('knowledgeBase', 320, 200, { label: 'Exam material', docIds: [] });
        const c = n('llmPrompt', 560, 200, {
          label: 'Generate recall prompts',
          system: 'You design active recall practice for students. Mix factual recall with deeper understanding.',
          prompt: 'Generate 15 active recall questions from this material. Mix difficulty. No answers — those are for the student to attempt.\n\n{{input}}',
          maxTokens: 1500,
        });
        const d = n('sendEmail', 800, 200, { label: 'Email me', subject: '🧠 Pre-exam recall', to: '' });
        return { nodes: [a, b, c, d], edges: [e(a.id, b.id), e(b.id, c.id), e(c.id, d.id)] };
      })(),
    },
    {
      id: 'curiosity-prompt',
      name: 'Daily Curiosity Spark',
      description: 'Every day at noon, get an interesting fact related to your interests.',
      category: 'recreation',
      icon: '✨',
      schedule: '0 12 * * *',
      definition: (() => {
        const a = n('scheduleTrigger', 80, 200, { label: 'Daily noon', cron: '0 12 * * *' });
        const b = n('llmPrompt', 320, 200, {
          label: 'Pick an interesting thing',
          system: 'You share genuinely fascinating, lesser-known facts. Avoid clichés.',
          prompt: 'Share one specific, fascinating fact today — a surprising connection, an unsolved mystery, or a wild historical event. Keep it under 150 words. End with one follow-up question to ponder.',
          maxTokens: 350, temperature: 0.9,
        });
        const c = n('sendEmail', 560, 200, { label: 'Email it', subject: '✨ Today\'s curiosity', to: '' });
        return { nodes: [a, b, c], edges: [e(a.id, b.id), e(b.id, c.id)] };
      })(),
    },
    {
      id: 'note-organizer',
      name: 'Note Organizer',
      description: 'Take messy notes and reorganize them into a clean study sheet.',
      category: 'productivity',
      icon: '🗂️',
      schedule: null,
      definition: (() => {
        const a = n('manualTrigger', 80, 200, { label: 'Run' });
        const b = n('userInput', 320, 200, { label: 'Messy notes', value: 'Paste your raw notes here' });
        const c = n('llmPrompt', 560, 200, {
          label: 'Reorganize',
          system: 'You turn messy notes into clean, well-structured study material.',
          prompt: 'Reorganize these notes into a clean study sheet with clear headings, bullet points, and a summary at the top:\n\n{{input}}',
          maxTokens: 2000,
        });
        const d = n('saveToFile', 800, 200, { label: 'Save to file', filename: 'organized-notes.md' });
        return { nodes: [a, b, c, d], edges: [e(a.id, b.id), e(b.id, c.id), e(c.id, d.id)] };
      })(),
    },
    {
      id: 'whatsapp-morning',
      name: 'WhatsApp Morning Briefing',
      description: 'Daily briefing sent to your WhatsApp at 8am (requires Twilio setup).',
      category: 'productivity',
      icon: '💬',
      schedule: '0 8 * * *',
      definition: (() => {
        const a = n('scheduleTrigger', 80, 200, { label: 'Daily 8am', cron: '0 8 * * *' });
        const b = n('llmPrompt', 320, 200, {
          label: 'Generate briefing',
          system: 'You write concise daily briefings for a student. Use plain text — no markdown. Under 300 chars.',
          prompt: 'Generate a friendly morning briefing for today. Include: 1 motivational line, 1 reminder about studying.',
          maxTokens: 300,
        });
        const c = n('sendWhatsApp', 560, 200, { label: 'Send to me', to: '' });
        return { nodes: [a, b, c], edges: [e(a.id, b.id), e(b.id, c.id)] };
      })(),
    },
    {
      id: 'remember-this',
      name: 'Personal Tutor (with memory)',
      description: 'Chat with a tutor that remembers what you struggled with last time.',
      category: 'study',
      icon: '🎓',
      schedule: null,
      definition: (() => {
        const a = n('manualTrigger', 80, 200, { label: 'Run' });
        const b = n('userInput', 320, 200, { label: 'Question', value: 'What did you want help with?' });
        const c = n('llmPrompt', 560, 200, {
          label: 'Tutor',
          system: 'You are a patient one-on-one tutor. Use memory of past sessions to personalize.',
          prompt: 'Past memory:\n{{memory}}\n\nCurrent question:\n{{input}}\n\nRespond as a tutor, referencing past struggles when relevant.',
          maxTokens: 1200,
        });
        const d = n('rememberThis', 800, 200, { label: 'Remember', key: 'last_session' });
        const f = n('displayResult', 1040, 200, { label: 'Show answer' });
        return { nodes: [a, b, c, d, f], edges: [e(a.id, b.id), e(b.id, c.id), e(c.id, d.id), e(d.id, f.id)] };
      })(),
    },
  ];
}

export function registerTemplateHandlers() {
  ipcMain.handle('templates:list', () => buildTemplates().map(({ definition, ...rest }) => rest));

  ipcMain.handle('templates:create', (_event, templateId: string) => {
    const template = buildTemplates().find((t) => t.id === templateId);
    if (!template) throw new Error('Template not found');
    const db = getDb();
    const id = randomUUID();
    const now = Date.now();
    db.prepare(`INSERT INTO agents (id, name, description, definition, schedule, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, template.name, template.description, JSON.stringify(template.definition), template.schedule, 0, now, now);
    // Don't auto-schedule — user enables it after configuring email
    return { id };
  });
}
