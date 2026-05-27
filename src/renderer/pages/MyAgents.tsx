import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Play, Trash2, Loader2, Clock, Sparkles, Upload, Copy as CopyIcon, Download } from 'lucide-react';
import { useToast } from '../components/Toast';
import type { Agent } from '../types/api';

export function MyAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const toast = useToast();

  async function refresh() { setAgents(await window.api.agents.list()); }
  useEffect(() => { refresh(); }, []);

  async function runNow(id: string, name: string) {
    setRunningIds((s) => new Set(s).add(id));
    toast.show(`Running "${name}"...`, 'info');
    try {
      const result = await window.api.agents.runNow(id);
      if (result.status === 'success') toast.show(`"${name}" completed`, 'success');
      else toast.show(`"${name}" failed: ${result.error || ''}`, 'error');
    } catch (err: any) {
      toast.show(`Run failed: ${err.message}`, 'error');
    } finally {
      setRunningIds((s) => { const next = new Set(s); next.delete(id); return next; });
    }
  }

  async function deleteAgent(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await window.api.agents.delete(id);
    await refresh();
    toast.show('Agent deleted', 'success');
  }

  async function duplicate(id: string) {
    await window.api.agents.duplicate(id);
    await refresh();
    toast.show('Duplicated', 'success');
  }

  async function exportOne(id: string) {
    const result = await window.api.agents.export(id);
    if (result.exported) toast.show(`Exported to ${result.path}`, 'success');
  }

  async function importAgent() {
    const result = await window.api.agents.import();
    if (result.imported) {
      await refresh();
      toast.show('Imported successfully', 'success');
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Agents</h1>
          <p className="text-text-secondary dark:text-text-secondary-dark text-[13px] mt-1">
            All your custom workflows.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={importAgent} className="btn-ghost"><Upload size={14} /> Import</button>
          <Link to="/templates" className="btn-secondary"><Sparkles size={14} /> Templates</Link>
          <Link to="/agents/new" className="btn-primary"><Plus size={14} /> New Agent</Link>
        </div>
      </header>

      {agents.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-base font-semibold mb-2">Build your first agent</div>
          <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark mb-5 max-w-md mx-auto">
            Start from a ready-made template, or design your own workflow on the visual canvas.
          </p>
          <div className="flex gap-2 justify-center">
            <Link to="/templates" className="btn-primary"><Sparkles size={14} /> Browse 12 templates</Link>
            <Link to="/agents/new" className="btn-secondary"><Plus size={14} /> Start blank</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {agents.map((a) => (
            <div key={a.id} className="card p-4 flex items-center gap-4">
              <div className={`w-1 h-10 rounded-full ${a.enabled ? 'bg-success' : 'bg-text-tertiary/40'}`} />
              <Link to={`/agents/${a.id}`} className="flex-1 min-w-0 group">
                <div className="font-medium text-[13px] group-hover:text-accent transition-colors">{a.name}</div>
                <div className="text-[12px] text-text-secondary dark:text-text-secondary-dark mt-0.5 line-clamp-1">
                  {a.description || `${a.definition?.nodes?.length || 0} blocks`}
                </div>
                {a.schedule && (
                  <div className="text-[10px] font-mono text-text-tertiary mt-1.5 uppercase tracking-wider flex items-center gap-1">
                    <Clock size={9} /> {a.schedule}
                  </div>
                )}
              </Link>
              <button onClick={() => runNow(a.id, a.name)} disabled={runningIds.has(a.id)} className="btn-secondary">
                {runningIds.has(a.id) ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                Run
              </button>
              <button onClick={() => duplicate(a.id)} className="btn-ghost" title="Duplicate"><CopyIcon size={13} /></button>
              <button onClick={() => exportOne(a.id)} className="btn-ghost" title="Export"><Download size={13} /></button>
              <button onClick={() => deleteAgent(a.id, a.name)} className="btn-ghost text-danger hover:bg-danger/10"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
