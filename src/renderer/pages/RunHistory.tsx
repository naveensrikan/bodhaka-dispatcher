import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { Markdown } from '../components/Markdown';
import type { AgentRun } from '../types/api';

export function RunHistory() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [selected, setSelected] = useState<AgentRun | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setRuns(await window.api.agents.getAllRuns());
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  function getOutputContent(output: string | null): string {
    if (!output) return '';
    try {
      const parsed = JSON.parse(output);
      return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
    } catch {
      return output;
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Run History</h1>
          <p className="text-text-secondary dark:text-text-secondary-dark text-[13px] mt-1">
            Every agent run, with full logs, output, and cost.
          </p>
        </div>
        <button onClick={refresh} className="btn-secondary">
          <RefreshCw size={13} /> Refresh
        </button>
      </header>

      {loading ? (
        <div className="card p-10 text-center text-text-tertiary text-sm">
          <Loader2 className="animate-spin mx-auto mb-3" size={20} /> Loading...
        </div>
      ) : runs.length === 0 ? (
        <div className="card p-12 text-center">
          <Clock size={24} className="mx-auto mb-3 text-text-tertiary" />
          <p className="text-sm">No runs yet</p>
          <p className="text-[12px] text-text-secondary mt-1">Once you run an agent, its history will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2 space-y-1.5 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
            {runs.map((r) => (
              <button
                key={r.id} onClick={() => setSelected(r)}
                className={`w-full card p-3 text-left transition-colors ${
                  selected?.id === r.id ? 'border-brand' : 'hover:border-brand/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <StatusIcon status={r.status} />
                  <span className="font-medium text-[13px] truncate flex-1">{r.agent_name || 'Deleted agent'}</span>
                </div>
                <div className="text-[11px] text-text-tertiary flex items-center justify-between">
                  <span>{new Date(r.started_at).toLocaleString()}</span>
                  <span>
                    {r.finished_at && `${((r.finished_at - r.started_at) / 1000).toFixed(1)}s`}
                    {r.cost > 0 && ` · $${r.cost.toFixed(4)}`}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="col-span-3">
            {!selected ? (
              <div className="card p-10 text-center text-text-tertiary text-sm">
                Select a run on the left to see its details
              </div>
            ) : (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <StatusIcon status={selected.status} />
                  <h3 className="font-semibold text-[14px] flex-1">{selected.agent_name || 'Deleted agent'}</h3>
                  <span className="text-[11px] text-text-tertiary">
                    {new Date(selected.started_at).toLocaleString()}
                  </span>
                </div>

                {selected.error && (
                  <div className="mb-4 p-3 rounded-win bg-danger/10 border border-danger/30">
                    <div className="text-[11px] uppercase tracking-wider text-danger font-medium mb-1">Error</div>
                    <div className="text-[13px] text-danger">{selected.error}</div>
                  </div>
                )}

                <div className="mb-4">
                  <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-medium mb-1.5">Logs</div>
                  <div className="bg-bg-hover dark:bg-bg-dark-subtle rounded-win p-3 max-h-60 overflow-y-auto font-mono text-[11px] leading-relaxed">
                    {selected.logs
                      ? JSON.parse(selected.logs).map((line: string, i: number) => <div key={i}>{line}</div>)
                      : <span className="text-text-tertiary">No logs</span>}
                  </div>
                </div>

                {selected.output && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-medium mb-1.5">Output</div>
                    <div className="bg-bg-hover dark:bg-bg-dark-subtle rounded-win p-4 max-h-96 overflow-y-auto">
                      <Markdown content={getOutputContent(selected.output)} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'success') return <CheckCircle2 size={14} className="text-success shrink-0" />;
  if (status === 'failed') return <XCircle size={14} className="text-danger shrink-0" />;
  return <Loader2 size={14} className="animate-spin text-brand shrink-0" />;
}
