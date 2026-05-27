import { NODE_TYPES_LIST } from './FlowNode';

const CATEGORIES = ['Trigger', 'Source', 'AI', 'Logic', 'Output'];

export function NodePalette() {
  function onDragStart(event: React.DragEvent, nodeType: string) {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div className="w-52 shrink-0 border-r border-border dark:border-border-dark bg-bg-layer dark:bg-bg-dark-layer overflow-y-auto">
      <div className="px-3 py-2.5 border-b border-border dark:border-border-dark">
        <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium">Building blocks</div>
        <div className="text-[12px] text-text-secondary mt-0.5">Drag onto canvas</div>
      </div>

      <div className="p-2 space-y-4">
        {CATEGORIES.map((cat) => (
          <div key={cat}>
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium mb-1.5 px-1">{cat}</div>
            <div className="space-y-1">
              {NODE_TYPES_LIST.filter((n) => n.category === cat).map((n) => {
                const Icon = n.icon;
                return (
                  <div
                    key={n.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, n.type)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-win bg-bg-hover dark:bg-bg-dark-subtle hover:bg-accent-subtle dark:hover:bg-accent-subtle-dark border border-border dark:border-border-dark cursor-grab active:cursor-grabbing transition-colors"
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
