import { useEffect, useState } from 'react';
import { Link as LinkComp } from 'react-router-dom';
import { X, AlertTriangle, CheckCircle2, Clock as ClockIcon } from 'lucide-react';
import { NODE_META } from './FlowNode';
import { CronBuilder } from './CronBuilder';

interface NodeInspectorProps {
  node: any;
  onChange: (id: string, patch: Record<string, any>) => void;
  onClose: () => void;
  knowledgeDocs: any[];
  defaultEmail?: string;
  defaultWhatsApp?: string;
}

export function NodeInspector({ node, onChange, onClose, knowledgeDocs, defaultEmail, defaultWhatsApp }: NodeInspectorProps) {
  const [data, setData] = useState<Record<string, any>>(node.data || {});

  useEffect(() => { setData(node.data || {}); }, [node.id]);

  function update(patch: Record<string, any>) {
    const next = { ...data, ...patch };
    setData(next);
    onChange(node.id, next);
  }

  const meta = NODE_META[node.type] || { label: node.type, category: '' };

  return (
    <div className="w-80 shrink-0 border-l border-border dark:border-border-dark bg-bg-layer dark:bg-bg-dark-layer flex flex-col">
      <div className="h-12 border-b border-border dark:border-border-dark flex items-center justify-between px-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium">{meta.category}</div>
          <div className="text-[13px] font-semibold">{meta.label}</div>
        </div>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        <div>
          <label className="label">Label</label>
          <input className="input w-full" value={data.label || ''} onChange={(e) => update({ label: e.target.value })} placeholder={meta.label} />
        </div>

        {node.type === 'scheduleTrigger' && (
          <div>
            <label className="label">Schedule</label>
            <CronBuilder
              value={data.cron || ''}
              onChange={(cron) => update({ cron })}
            />
          </div>
        )}

        {node.type === 'userInput' && (
          <div>
            <label className="label">Value</label>
            <textarea className="input w-full min-h-[100px] resize-none" value={data.value || ''} onChange={(e) => update({ value: e.target.value })} placeholder="Static text or starting prompt" />
          </div>
        )}

        {node.type === 'knowledgeBase' && (
          <>
            <div>
              <label className="label">Documents to use</label>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1 card p-2">
                {knowledgeDocs.length === 0 && <p className="text-[12px] text-text-tertiary">No documents yet. Upload in Knowledge Base.</p>}
                {knowledgeDocs.map((d: any) => (
                  <label key={d.id} className="flex items-center gap-2 text-[12px] cursor-pointer hover:bg-bg-hover dark:hover:bg-bg-dark-subtle p-1 rounded">
                    <input
                      type="checkbox"
                      checked={data.docIds?.includes(d.id) || false}
                      onChange={(ev) => {
                        const ids = new Set(data.docIds || []);
                        if (ev.target.checked) ids.add(d.id); else ids.delete(d.id);
                        update({ docIds: Array.from(ids) });
                      }}
                    />
                    <span className="flex-1 truncate">{d.filename}</span>
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-text-tertiary mt-2">Leave all unchecked to use everything.</p>
            </div>

            <div>
              <label className="label">Mode</label>
              <div className="space-y-1.5">
                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-win border border-border dark:border-border-dark hover:bg-bg-hover dark:hover:bg-bg-dark-subtle">
                  <input
                    type="radio"
                    name="kbMode"
                    checked={data.fullSummary !== false}
                    onChange={() => update({ fullSummary: true })}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-[12px] font-medium">Complete summary</div>
                    <div className="text-[11px] text-text-tertiary">Use the entire selected material (best for whole-chapter summaries)</div>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-win border border-border dark:border-border-dark hover:bg-bg-hover dark:hover:bg-bg-dark-subtle">
                  <input
                    type="radio"
                    name="kbMode"
                    checked={data.fullSummary === false}
                    onChange={() => update({ fullSummary: false })}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-[12px] font-medium">Specific topic</div>
                    <div className="text-[11px] text-text-tertiary">Retrieve only the most relevant parts about a topic (semantic search)</div>
                  </div>
                </label>
              </div>
            </div>

            {data.fullSummary === false && (
              <div>
                <label className="label">Topic to focus on</label>
                <input
                  className="input w-full"
                  value={data.topic || ''}
                  onChange={(e) => update({ topic: e.target.value })}
                  placeholder="e.g. photosynthesis, Newton's laws, French Revolution"
                />
                <p className="text-[11px] text-text-tertiary mt-1.5">
                  Only content matching this topic is pulled, then summarized/quizzed downstream.
                </p>
              </div>
            )}
          </>
        )}

        {node.type === 'webSearch' && (
          <div>
            <label className="label">Query</label>
            <input className="input w-full" value={data.query || ''} onChange={(e) => update({ query: e.target.value })} placeholder="Leave blank to use upstream input" />
            <p className="text-[11px] text-text-tertiary mt-1.5">Uses Tavily/Brave if you've added a key in Settings → Search, else falls back to Anthropic web search.</p>
          </div>
        )}

        {node.type === 'llmPrompt' && (
          <>
            <div>
              <label className="label">System Prompt</label>
              <textarea className="input w-full min-h-[60px] resize-none text-[12px]" value={data.system || ''} onChange={(e) => update({ system: e.target.value })} placeholder="You are a helpful tutor..." />
            </div>
            <div>
              <label className="label">User Prompt</label>
              <textarea className="input w-full min-h-[100px] resize-none text-[12px]" value={data.prompt || ''} onChange={(e) => update({ prompt: e.target.value })} placeholder="Use {{input}} to insert upstream content" />
              <p className="text-[11px] text-text-tertiary mt-1.5">
                <span className="font-mono">{'{{input}}'}</span> = upstream output · <span className="font-mono">{'{{memory}}'}</span> = agent memory
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Temperature</label>
                <input type="number" step="0.1" min="0" max="2" className="input w-full" value={data.temperature ?? 0.7} onChange={(e) => update({ temperature: parseFloat(e.target.value) })} />
              </div>
              <div>
                <label className="label">Max Tokens</label>
                <input type="number" min="64" max="8000" className="input w-full" value={data.maxTokens ?? 1024} onChange={(e) => update({ maxTokens: parseInt(e.target.value) })} />
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
              <option value="executive summary">Executive summary</option>
            </select>
          </div>
        )}

        {node.type === 'generateQuiz' && (
          <div>
            <label className="label">Number of Questions</label>
            <input type="number" min="1" max="20" className="input w-full" value={data.numQuestions || 5} onChange={(e) => update({ numQuestions: parseInt(e.target.value) })} />
          </div>
        )}

        {node.type === 'ifElse' && (
          <div>
            <label className="label">Condition (text contains)</label>
            <input className="input w-full" value={data.condition || ''} onChange={(e) => update({ condition: e.target.value })} placeholder="e.g. urgent" />
            <p className="text-[11px] text-text-tertiary mt-1.5">Downstream nodes run only if upstream content contains this text. Case-insensitive.</p>
          </div>
        )}

        {node.type === 'delay' && (
          <div>
            <label className="label">Delay (seconds)</label>
            <input type="number" min="0" max="300" className="input w-full" value={data.seconds || 5} onChange={(e) => update({ seconds: parseInt(e.target.value) || 0 })} />
            <p className="text-[11px] text-text-tertiary mt-1.5">Max 5 minutes.</p>
          </div>
        )}

        {node.type === 'rememberThis' && (
          <div>
            <label className="label">Memory key</label>
            <input className="input w-full" value={data.key || 'last'} onChange={(e) => update({ key: e.target.value })} placeholder="e.g. last_session" />
            <p className="text-[11px] text-text-tertiary mt-1.5">Stores the upstream content under this key. Later runs can read it via <span className="font-mono">{'{{memory}}'}</span>.</p>
          </div>
        )}

        {node.type === 'sendEmail' && (
          <>
            <div>
              <label className="label">To</label>
              <input className="input w-full" value={data.to || ''} onChange={(e) => update({ to: e.target.value })} placeholder={defaultEmail || 'you@example.com'} />
              {defaultEmail && data.to !== defaultEmail && (
                <button type="button" onClick={() => update({ to: defaultEmail })} className="mt-1 text-[11px] text-accent hover:underline">
                  Use my email ({defaultEmail})
                </button>
              )}
            </div>
            <div>
              <label className="label">Subject</label>
              <input className="input w-full" value={data.subject || ''} onChange={(e) => update({ subject: e.target.value })} placeholder="Your daily summary" />
            </div>
          </>
        )}

        {node.type === 'sendWhatsApp' && (
          <WhatsAppNodeFields data={data} update={update} defaultWhatsApp={defaultWhatsApp} />
        )}

        {node.type === 'saveToFile' && (
          <div>
            <label className="label">Filename</label>
            <input className="input w-full" value={data.filename || ''} onChange={(e) => update({ filename: e.target.value })} placeholder="output.txt" />
            <p className="text-[11px] text-text-tertiary mt-1.5">Saved to Documents/Bodhaka Forge/.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function WhatsAppNodeFields({
  data, update, defaultWhatsApp,
}: {
  data: Record<string, any>;
  update: (patch: Record<string, any>) => void;
  defaultWhatsApp?: string;
}) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [twilioConfigured, setTwilioConfigured] = useState(true);

  useEffect(() => {
    window.api.whatsapp.listTemplates().then((result: any) => {
      if (result?.error) {
        setTwilioConfigured(false);
      } else if (Array.isArray(result)) {
        setTemplates(result);
      }
      setLoading(false);
    });
  }, []);

  const selectedTemplate = templates.find((t) => t.name === data.templateName);
  const approvedTemplates = templates.filter((t) => t.approvalStatus === 'approved');

  return (
    <>
      <div>
        <label className="label">To (phone number with country code)</label>
        <input
          className="input w-full"
          value={data.to || ''}
          onChange={(e) => update({ to: e.target.value })}
          placeholder={defaultWhatsApp || '+91 98765 43210'}
        />
        {defaultWhatsApp && data.to !== defaultWhatsApp && (
          <button
            type="button"
            onClick={() => update({ to: defaultWhatsApp })}
            className="mt-1 text-[11px] text-brand hover:underline"
          >
            Use my number ({defaultWhatsApp})
          </button>
        )}
      </div>

      {!twilioConfigured && (
        <div className="p-3 rounded-win bg-warning/10 border border-warning/30 text-[12px]">
          <div className="flex items-start gap-2">
            <AlertTriangle size={13} className="text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Twilio not configured</p>
              <LinkComp to="/configuration" className="text-brand hover:underline">
                Go to Settings → WhatsApp
              </LinkComp>
            </div>
          </div>
        </div>
      )}

      {twilioConfigured && (
        <div>
          <label className="label">Template</label>
          {loading ? (
            <div className="text-[12px] text-text-tertiary py-2">Loading templates...</div>
          ) : approvedTemplates.length === 0 ? (
            <div className="p-3 rounded-win bg-warning/10 border border-warning/30 text-[12px]">
              <div className="flex items-start gap-2">
                <AlertTriangle size={13} className="text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">No approved templates yet</p>
                  <LinkComp to="/whatsapp-templates" className="text-brand hover:underline">
                    Provision templates →
                  </LinkComp>
                  <p className="mt-1 text-text-tertiary">Or use sandbox freeform mode (leave template unset).</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <select
                className="input w-full"
                value={data.templateName || ''}
                onChange={(e) => update({ templateName: e.target.value || undefined })}
              >
                <option value="">— Sandbox freeform (no template) —</option>
                {approvedTemplates.map((t) => (
                  <option key={t.name} value={t.name}>
                    ✓ {t.displayName}
                  </option>
                ))}
              </select>
              {templates.some((t) => t.approvalStatus === 'pending' || t.approvalStatus === 'received') && (
                <p className="text-[11px] text-text-tertiary mt-1.5 flex items-center gap-1">
                  <ClockIcon size={10} />
                  {templates.filter((t) => t.approvalStatus === 'pending' || t.approvalStatus === 'received').length} more pending approval
                </p>
              )}
            </>
          )}

          {selectedTemplate && (
            <div className="mt-3 p-3 rounded-win bg-bg-hover dark:bg-bg-dark-subtle border border-border dark:border-border-dark text-[11px]">
              <div className="flex items-center gap-1 mb-1.5">
                <CheckCircle2 size={11} className="text-success" />
                <span className="font-medium">{selectedTemplate.displayName}</span>
              </div>
              <div className="text-text-secondary mb-2">{selectedTemplate.description}</div>
              <div className="text-text-secondary">
                Upstream content automatically fills {'{{1}}'}.
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-text-tertiary">
        Tip: Templates work outside Twilio's 24-hour window. Sandbox freeform only works within 24h of the recipient last messaging your Twilio number.
      </p>
    </>
  );
}
