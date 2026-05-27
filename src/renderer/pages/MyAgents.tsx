import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Play, Trash2, Loader2, Clock } from 'lucide-react';
import type { Agent } from '../types/api';

export function MyAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

  async function refresh() {
    const list = await window.api.agents.list();
    setAgents(list);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function runNow(id: string) {
    setRunningIds((s) => new Set(s).add(id));
    await window.api.agents.runNow(id);
    setRunningIds((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }

  async function deleteAgent(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await window.api.agents.delete(id);
    await refresh();
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl tracking-tight">My Agents</h1>
          <p className="text-ink-300 text-sm mt-1">All your custom-built workflows.</p>
        </div>
        <Link to="/agents/new" className="btn-primary">
          <Plus size={14} /> New Agent
        </Link>
      </header>

      {agents.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="font-display text-2xl mb-2 text-ink-200">Build your first agent</div>
          <p className="text-sm text-ink-400 mb-6 max-w-md mx-auto">
            Try something simple: "Every morning at 7am, summarize the next chapter of my Physics textbook and email it to me."
          </p>
          <Link to="/agents/new" className="btn-primary">
            <Plus size={14} /> Start Building
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map((a) => (
            <div key={a.id} className="card p-5 flex items-center gap-4">
              <div className={`w-2 h-12 rounded-full ${a.enabled ? 'bg-emerald-400' : 'bg-ink-500'}`} />

              <Link to={`/agents/${a.id}`} className="flex-1 min-w-0 group">
                <div className="font-display text-base group-hover:text-accent transition-colors">{a.name}</div>
                <div className="text-xs text-ink-400 mt-1 line-clamp-1">
                  {a.description || `${a.definition?.nodes?.length || 0} blocks`}
                </div>
                {a.schedule && (
                  <div className="text-[10px] font-mono text-ink-400 mt-1.5 uppercase tracking-wider flex items-center gap-1">
                    <Clock size={10} /> {a.schedule}
                  </div>
                )}
              </Link>

              <button
                onClick={() => runNow(a.id)}
                disabled={runningIds.has(a.id)}
                className="btn-secondary"
              >
                {runningIds.has(a.id) ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Run
              </button>
              <button onClick={() => deleteAgent(a.id, a.name)} className="btn-ghost text-red-400 hover:bg-red-500/10">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
