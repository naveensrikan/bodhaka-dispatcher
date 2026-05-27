import { Handle, Position } from '@xyflow/react';
import {
  Play, Clock, Database, Globe, Sparkles, FileText, ListChecks,
  Mail, MessageCircle, Eye, GitBranch, Timer, Save, Brain
} from 'lucide-react';

const NODE_META: Record<string, { icon: any; label: string; color: string; category: string }> = {
  manualTrigger:    { icon: Play,         label: 'Manual Trigger',  color: 'green',  category: 'Trigger' },
  scheduleTrigger:  { icon: Clock,        label: 'Schedule',        color: 'green',  category: 'Trigger' },
  knowledgeBase:    { icon: Database,     label: 'Knowledge Base',  color: 'blue',   category: 'Source' },
  webSearch:        { icon: Globe,        label: 'Web Search',      color: 'blue',   category: 'Source' },
  userInput:        { icon: FileText,     label: 'User Input',      color: 'blue',   category: 'Source' },
  llmPrompt:        { icon: Sparkles,     label: 'LLM Prompt',      color: 'purple', category: 'AI' },
  summarize:        { icon: FileText,     label: 'Summarize',       color: 'purple', category: 'AI' },
  generateQuiz:     { icon: ListChecks,   label: 'Generate Quiz',   color: 'purple', category: 'AI' },
  ifElse:           { icon: GitBranch,    label: 'If / Else',       color: 'amber',  category: 'Logic' },
  delay:            { icon: Timer,        label: 'Delay',           color: 'amber',  category: 'Logic' },
  rememberThis:     { icon: Brain,        label: 'Remember',        color: 'amber',  category: 'Logic' },
  sendEmail:        { icon: Mail,         label: 'Send Email',      color: 'red',    category: 'Output' },
  sendWhatsApp:     { icon: MessageCircle, label: 'Send WhatsApp',  color: 'red',    category: 'Output' },
  saveToFile:       { icon: Save,         label: 'Save to File',    color: 'red',    category: 'Output' },
  displayResult:    { icon: Eye,          label: 'Display Result',  color: 'red',    category: 'Output' },
};

export const NODE_TYPES_LIST = Object.entries(NODE_META).map(([type, meta]) => ({ type, ...meta }));

const COLOR_BORDER: Record<string, string> = {
  green:  'border-green-500',
  blue:   'border-blue-500',
  purple: 'border-purple-500',
  amber:  'border-amber-500',
  red:    'border-red-500',
};

const COLOR_BG: Record<string, string> = {
  green:  'bg-green-50 dark:bg-green-950/30',
  blue:   'bg-blue-50 dark:bg-blue-950/30',
  purple: 'bg-purple-50 dark:bg-purple-950/30',
  amber:  'bg-amber-50 dark:bg-amber-950/30',
  red:    'bg-red-50 dark:bg-red-950/30',
};

const COLOR_TEXT: Record<string, string> = {
  green:  'text-green-700 dark:text-green-300',
  blue:   'text-blue-700 dark:text-blue-300',
  purple: 'text-purple-700 dark:text-purple-300',
  amber:  'text-amber-700 dark:text-amber-300',
  red:    'text-red-700 dark:text-red-300',
};

export function FlowNode({ data, type }: any) {
  const meta = NODE_META[type] || NODE_META.userInput;
  const Icon = meta.icon;
  const isTrigger = meta.category === 'Trigger';
  const isOutput = meta.category === 'Output' && type !== 'displayResult';

  return (
    <div className={`min-w-[180px] rounded-win border-l-4 ${COLOR_BORDER[meta.color]} bg-bg-layer dark:bg-bg-dark-layer border border-border dark:border-border-dark shadow-win-card overflow-hidden`}>
      {!isTrigger && (
        <Handle type="target" position={Position.Left} className="!bg-bg-layer dark:!bg-bg-dark-layer" />
      )}
      <div className={`px-3 py-2 flex items-center gap-2 ${COLOR_BG[meta.color]}`}>
        <div className={COLOR_TEXT[meta.color]}>
          <Icon size={13} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[9px] uppercase tracking-wider font-medium ${COLOR_TEXT[meta.color]}`}>
            {meta.category}
          </div>
          <div className="text-[12px] font-medium truncate text-text-primary dark:text-text-primary-dark">
            {data.label || meta.label}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-bg-layer dark:!bg-bg-dark-layer" />
    </div>
  );
}

export { NODE_META };
