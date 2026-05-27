import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { NODE_META } from './FlowNode';

interface NodeInspectorProps {
  node: any;
  onChange: (id: string, patch: Record<string, any>) => void;
  onClose: () => void;
  knowledgeDocs: any[];
}

export function NodeInspector({ node, onChange, onClose, knowledgeDocs }: NodeInspectorProps) {
  const [data, setData] = useState<Record<string, any>>(node.data || {});

  useEffect(() => {
    setData(node.data || {});
  }, [node.id]);

  function update(patch: Record<string, any>) {
    const next = { ...data, ...patch };
    setData(next);
    onChange(node.id, next);
  }

  const meta = NODE_META[node.type] || { label: node.type, category: '' };

  return (
    <div className="w-80 shrink-0 border-l border-ink-700/50 bg-ink-900/60 backdrop-blur-md flex flex-col">
      <div className="h-14 border-b border-ink-700/50 flex items-center justify-between px-5">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-ink-400 font-mono">{meta.category}</div>
          <div className="font-display text-sm">{meta.label}</div>
        </div>
        <button onClick={onClose} className="text-ink-400 hover:text-ink-100">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div>
          <label className="label">Label</label>
          <input
            className="input w-full"
            value={data.label || ''}
            onChange={(e) => update({ label: e.target.value })}
            placeholder={meta.label}
          />
        </div>

        {/* Type-specific fields */}
        {node.type === 'scheduleTrigger' && (
          <div>
            <label className="label">Cron Expression</label>
            <input
              className="input w-full font-mono"
              value={data.cron || ''}
              onChange={(e) => update({ cron: e.target.value })}
              placeholder="0 7 * * *"
            />
            <p className="text-[11px] text-ink-400 mt-1.5">
              Examples: <span className="font-mono">0 7 * * *</span> (daily 7am),{' '}
              <span className="font-mono">0 18 * * 5</span> (Fri 6pm)
            </p>
          </div>
        )}

        {node.type === 'userInput' && (
          <div>
            <label className="label">Value</label>
            <textarea
              className="input w-full min-h-[100px] resize-none"
              value={data.value || ''}
              onChange={(e) => update({ value: e.target.value })}
              placeholder="Static text or starting prompt"
            />
          </div>
        )}

        {node.type === 'knowledgeBase' && (
          <div>
            <label className="label">Documents to use</label>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {knowledgeDocs.length === 0 && (
                <p className="text-xs text-ink-400">No documents yet. Upload in Knowledge Base.</p>
              )}
              {knowledgeDocs.map((d: any) => (
                <label key={d.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.docIds?.includes(d.id) || false}
                    onChange={(e) => {
                      const ids = new Set(data.docIds || []);
                      if (e.target.checked) ids.add(d.id);
                      else ids.delete(d.id);
                      update({ docIds: Array.from(ids) });
                    }}
                  />
                  <span className="flex-1 truncate">{d.filename}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-ink-400 mt-2">Leave all unchecked to use all documents.</p>
          </div>
        )}

        {node.type === 'webSearch' && (
          <div>
            <label className="label">Query (or use input)</label>
            <input
              className="input w-full"
              value={data.query || ''}
              onChange={(e) => update({ query: e.target.value })}
              placeholder="Leave blank to use upstream input"
            />
          </div>
        )}

        {node.type === 'llmPrompt' && (
          <>
            <div>
              <label className="label">System Prompt</label>
              <textarea
                className="input w-full min-h-[60px] resize-none text-xs font-mono"
                value={data.system || ''}
                onChange={(e) => update({ system: e.target.value })}
                placeholder="You are a helpful tutor..."
              />
            </div>
            <div>
              <label className="label">User Prompt</label>
              <textarea
                className="input w-full min-h-[100px] resize-none text-xs font-mono"
                value={data.prompt || ''}
                onChange={(e) => update({ prompt: e.target.value })}
                placeholder={'Use {{input}} to insert upstream content'}
              />
              <p className="text-[11px] text-ink-400 mt-1.5">Use <span className="font-mono">{'{{input}}'}</span> to inject the upstream node's output.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Temperature</label>
                <input
                  type="number" step="0.1" min="0" max="2"
                  className="input w-full"
                  value={data.temperature ?? 0.7}
                  onChange={(e) => update({ temperature: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Max Tokens</label>
                <input
                  type="number" min="64" max="8000"
                  className="input w-full"
                  value={data.maxTokens ?? 1024}
                  onChange={(e) => update({ maxTokens: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </>
        )}

        {node.type === 'summarize' && (
          <div>
            <label className="label">Style</label>
            <select className="input w-full" value={data.style || 'bullet points'} onChange={(e) => update({ style: e.target.value })}>
              <option value="bullet points">Bullet points</option>
              <option value="paragraph">Paragraph</option>
              <option value="key takeaways">Key takeaways</option>
              <option value="flashcards">Flashcards (Q/A)</option>
            </select>
          </div>
        )}

        {node.type === 'generateQuiz' && (
          <div>
            <label className="label">Number of Questions</label>
            <input
              type="number" min="1" max="20"
              className="input w-full"
              value={data.numQuestions || 5}
              onChange={(e) => update({ numQuestions: parseInt(e.target.value) })}
            />
          </div>
        )}

        {node.type === 'sendEmail' && (
          <>
            <div>
              <label className="label">To</label>
              <input
                className="input w-full"
                value={data.to || ''}
                onChange={(e) => update({ to: e.target.value })}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="label">Subject</label>
              <input
                className="input w-full"
                value={data.subject || ''}
                onChange={(e) => update({ subject: e.target.value })}
                placeholder="Your daily summary"
              />
            </div>
          </>
        )}

        {node.type === 'sendWhatsApp' && (
          <div>
            <label className="label">To (number)</label>
            <input
              className="input w-full"
              value={data.to || ''}
              onChange={(e) => update({ to: e.target.value })}
              placeholder="+91 98765 43210"
            />
            <p className="text-[11px] text-amber-300/80 mt-2">WhatsApp delivery requires Twilio setup. Coming in v1.1.</p>
          </div>
        )}
      </div>
    </div>
  );
}
