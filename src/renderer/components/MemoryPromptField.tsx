import { useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  memoryKeys: string[];
}

/**
 * A textarea that pops up a list of this agent's saved memory keys when the
 * student types "{{memory." so they can pick the right one instead of guessing.
 */
export function MemoryPromptField({ value, onChange, memoryKeys }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showList, setShowList] = useState(false);
  const [filter, setFilter] = useState('');

  // Detect whether the text immediately before the cursor is an open "{{memory."
  function checkTrigger() {
    const el = ref.current;
    if (!el) return;
    const pos = el.selectionStart;
    const before = value.slice(0, pos);
    // Match {{memory. followed by optional partial key, not yet closed
    const m = before.match(/\{\{memory\.([a-zA-Z0-9_]*)$/);
    if (m) {
      setFilter(m[1]);
      setShowList(true);
    } else {
      setShowList(false);
    }
  }

  function insertKey(key: string) {
    const el = ref.current;
    if (!el) return;
    const pos = el.selectionStart;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    // Replace the partial "{{memory.partial" with the full token
    const newBefore = before.replace(/\{\{memory\.[a-zA-Z0-9_]*$/, `{{memory.${key}}}`);
    const newValue = newBefore + after;
    onChange(newValue);
    setShowList(false);
    // Restore focus after React updates
    setTimeout(() => {
      el.focus();
      const newPos = newBefore.length;
      el.setSelectionRange(newPos, newPos);
    }, 0);
  }

  const filtered = memoryKeys.filter((k) => k.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="relative">
      <textarea
        ref={ref}
        className="input w-full min-h-[100px] resize-none text-[12px]"
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        onKeyUp={checkTrigger}
        onClick={checkTrigger}
        onBlur={() => setTimeout(() => setShowList(false), 150)}
        placeholder="Explain this simply: {{input}}"
      />
      {showList && (
        <div className="absolute z-50 left-2 right-2 mt-1 card p-1 shadow-win-flyout max-h-44 overflow-y-auto">
          {memoryKeys.length === 0 ? (
            <div className="px-2 py-2 text-[11px] text-text-tertiary">
              This agent has not saved any memories yet. Add a Remember block and run it once, then its saved names will show up here.
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-2 py-2 text-[11px] text-text-tertiary">
              No saved memory matches "{filter}". Saved: {memoryKeys.join(', ')}
            </div>
          ) : (
            filtered.map((k) => (
              <button
                key={k}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertKey(k); }}
                className="w-full text-left px-2 py-1.5 rounded text-[12px] hover:bg-brand-subtle dark:hover:bg-brand-subtle-dark font-mono"
              >
                {`{{memory.${k}}}`}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
