import { NODE_TYPES_LIST } from './FlowNode';

const CATEGORIES = ['Trigger', 'Source', 'AI', 'Output'];

export function NodePalette() {
  function onDragStart(event: React.DragEvent, nodeType: string) {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div className="w-56 shrink-0 border-r border-ink-700/50 bg-ink-900/40 backdrop-blur-md overflow-y-auto">
      <div className="px-4 py-3 border-b border-ink-700/50">
        <div className="text-[10px] uppercase tracking-wider text-ink-400 font-mono">Building blocks</div>
        <div className="text-xs text-ink-200 mt-0.5">Drag onto canvas</div>
      </div>

      <div className="p-3 space-y-5">
        {CATEGORIES.map((cat) => (
          <div key={cat}>
            <div className="text-[10px] uppercase tracking-wider text-ink-300 font-mono mb-2 px-1">{cat}</div>
            <div className="space-y-1.5">
              {NODE_TYPES_LIST.filter((n) => n.category === cat).map((n) => {
                const Icon = n.icon;
                return (
                  <div
                    key={n.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, n.type)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-ink-800/40 hover:bg-ink-700/60 border border-ink-700/40 cursor-grab active:cursor-grabbing transition-colors"
                  >
                    <Icon size={13} className="text-ink-200" />
                    <span className="text-xs">{n.label}</span>
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
