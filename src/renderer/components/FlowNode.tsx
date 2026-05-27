import { Handle, Position } from '@xyflow/react';
import { Play, Clock, Database, Globe, Sparkles, FileText, ListChecks, Mail, MessageCircle, Eye } from 'lucide-react';

const NODE_META: Record<string, { icon: any; label: string; color: string; category: string }> = {
  manualTrigger: { icon: Play, label: 'Manual Trigger', color: 'emerald', category: 'Trigger' },
  scheduleTrigger: { icon: Clock, label: 'Schedule', color: 'emerald', category: 'Trigger' },
  knowledgeBase: { icon: Database, label: 'Knowledge Base', color: 'blue', category: 'Source' },
  webSearch: { icon: Globe, label: 'Web Search', color: 'blue', category: 'Source' },
  userInput: { icon: FileText, label: 'User Input', color: 'blue', category: 'Source' },
  llmPrompt: { icon: Sparkles, label: 'LLM Prompt', color: 'accent', category: 'AI' },
  summarize: { icon: FileText, label: 'Summarize', color: 'accent', category: 'AI' },
  generateQuiz: { icon: ListChecks, label: 'Generate Quiz', color: 'accent', category: 'AI' },
  sendEmail: { icon: Mail, label: 'Send Email', color: 'amber', category: 'Output' },
  sendWhatsApp: { icon: MessageCircle, label: 'Send WhatsApp', color: 'amber', category: 'Output' },
  displayResult: { icon: Eye, label: 'Display Result', color: 'amber', category: 'Output' },
};

export const NODE_TYPES_LIST = Object.entries(NODE_META).map(([type, meta]) => ({ type, ...meta }));

const COLOR_MAP: Record<string, string> = {
  emerald: 'border-emerald-500/40 bg-emerald-500/5',
  blue: 'border-blue-400/40 bg-blue-400/5',
  accent: 'border-accent/50 bg-accent/5',
  amber: 'border-amber-400/40 bg-amber-400/5',
};

const ICON_COLOR: Record<string, string> = {
  emerald: 'text-emerald-400',
  blue: 'text-blue-300',
  accent: 'text-accent',
  amber: 'text-amber-300',
};

export function FlowNode({ data, type }: any) {
  const meta = NODE_META[type] || NODE_META.userInput;
  const Icon = meta.icon;
  const isTrigger = meta.category === 'Trigger';
  const isOutput = meta.category === 'Output';

  return (
    <div className={`min-w-[180px] rounded-xl border-2 ${COLOR_MAP[meta.color]} bg-ink-800/90 backdrop-blur-sm shadow-lg`}>
      {!isTrigger && (
        <Handle type="target" position={Position.Left} className="!bg-ink-900" />
      )}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-ink-700/60">
        <div className={`${ICON_COLOR[meta.color]}`}>
          <Icon size={14} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] uppercase tracking-wider text-ink-400 font-mono">{meta.category}</div>
          <div className="text-xs font-medium truncate">{data.label || meta.label}</div>
        </div>
      </div>
      {data.summary && (
        <div className="px-3 py-2 text-[11px] text-ink-300 line-clamp-2">{data.summary}</div>
      )}
      {!isOutput && (
        <Handle type="source" position={Position.Right} className="!bg-ink-900" />
      )}
    </div>
  );
}

export { NODE_META };
