import { NODE_TYPES_LIST } from './FlowNode';

// Ordered steps with friendly explanations written for young students
const CATEGORIES: { name: string; step: number; blurb: string }[] = [
  { name: 'Trigger', step: 1, blurb: 'This comes first. It decides what starts your agent. Either you press Run, or it runs automatically on a schedule like every morning.' },
  { name: 'Source', step: 2, blurb: 'Next, give your agent something to work with, such as your study notes, a web search, or text you type in.' },
  { name: 'AI', step: 3, blurb: 'This is the brain. The AI reads the source and does the thinking, like summarizing, making a quiz, or explaining.' },
  { name: 'Logic', step: 4, blurb: 'Optional helpers. Add a wait, make a decision, or let the agent remember things for next time.' },
  { name: 'Output', step: 5, blurb: 'Last step. This decides how you receive the result, by email, WhatsApp, a saved file, or shown on screen.' },
];

export function NodePalette() {
  function onDragStart(event: React.DragEvent, nodeType: string) {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div className="w-60 shrink-0 border-r border-border dark:border-border-dark bg-bg-layer dark:bg-bg-dark-layer overflow-y-auto">
      <div className="px-3 py-2.5 border-b border-border dark:border-border-dark">
        <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium">Building blocks</div>
        <div className="text-[12px] text-text-secondary mt-0.5">Drag onto the canvas, then connect them left → right</div>
      </div>

      <div className="p-2 space-y-3">
        {CATEGORIES.map((cat) => (
          <div key={cat.name}>
            <div className="flex items-start gap-2 mb-2 px-1">
              <div className="w-5 h-5 rounded-full bg-brand text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                {cat.step}
              </div>
              <div>
                <div className="text-[12px] font-semibold text-text-primary dark:text-text-primary-dark">{cat.name}</div>
                <div className="text-[10px] text-text-tertiary leading-snug mt-0.5">{cat.blurb}</div>
              </div>
            </div>
            <div className="space-y-1 pl-1">
              {NODE_TYPES_LIST.filter((n) => n.category === cat.name).map((n) => {
                const Icon = n.icon;
                return (
                  <div
                    key={n.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, n.type)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-win bg-bg-hover dark:bg-bg-dark-subtle hover:bg-brand-subtle dark:hover:bg-brand-subtle-dark border border-border dark:border-border-dark cursor-grab active:cursor-grabbing transition-colors"
                  >
                    <Icon size={12} className="text-text-secondary" />
                    <span className="text-[12px]">{n.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
