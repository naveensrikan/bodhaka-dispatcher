import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Plus, Activity, BookOpen, Zap } from 'lucide-react';
import type { Agent } from '../types/api';

export function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    window.api.agents.list().then(setAgents);
    window.api.config.get().then(setConfig);
  }, []);

  const configReady = config?.llm?.apiKey?.length > 0;
  const enabledAgents = agents.filter((a) => a.enabled).length;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="font-display text-4xl tracking-tight mb-1">
          Hello{config?.profile?.name ? `, ${config.profile.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-ink-300 text-sm">Your AI agents, ready when you are.</p>
      </header>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <StatCard icon={<Bot size={18} />} label="Agents" value={String(agents.length)} sub={`${enabledAgents} active`} />
        <StatCard icon={<Activity size={18} />} label="Status" value={configReady ? 'Ready' : 'Setup needed'} sub={configReady ? 'LLM connected' : 'Add an API key'} />
        <StatCard icon={<Zap size={18} />} label="Model" value={config?.llm?.model?.split('-').slice(0, 2).join('-') || '—'} sub={config?.llm?.provider || ''} />
      </div>

      {/* Setup checklist if not ready */}
      {!configReady && (
        <div className="card p-6 mb-8 border-accent/40">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <Zap size={18} className="text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg mb-1">Finish setup</h3>
              <p className="text-sm text-ink-300 mb-4">
                Add your LLM API key to start building agents. Your key stays on this device.
              </p>
              <Link to="/configuration" className="btn-primary">
                Go to Configuration →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recent agents */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl tracking-tight">Your Agents</h2>
          <Link to="/agents/new" className="btn-primary">
            <Plus size={14} /> New Agent
          </Link>
        </div>

        {agents.length === 0 ? (
          <div className="card p-12 text-center">
            <BookOpen size={28} className="mx-auto mb-3 text-ink-400" />
            <p className="text-ink-200 mb-1">No agents yet</p>
            <p className="text-sm text-ink-400">Build your first one in the Agent Builder.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {agents.slice(0, 6).map((a) => (
              <Link
                key={a.id}
                to={`/agents/${a.id}`}
                className="card p-4 hover:border-accent/40 transition-colors group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-display text-base group-hover:text-accent transition-colors">
                    {a.name}
                  </div>
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${a.enabled ? 'bg-emerald-400' : 'bg-ink-500'}`} />
                </div>
                <div className="text-xs text-ink-400 line-clamp-2">{a.description || 'No description'}</div>
                {a.schedule && (
                  <div className="mt-3 text-[10px] font-mono text-ink-400 uppercase tracking-wider">
                    {a.schedule}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-ink-300 mb-3">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-display text-2xl mb-1">{value}</div>
      <div className="text-xs text-ink-400">{sub}</div>
    </div>
  );
}
