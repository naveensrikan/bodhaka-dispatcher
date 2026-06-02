import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Plus, Activity, BookOpen, Zap, Sparkles, ChevronRight, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';
import { cronToHuman } from '../lib/cron';
import { AnnouncementsCard } from '../components/AnnouncementsCard';
import type { Agent, ConfigShape, Stats } from '../types/api';

export function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [config, setConfig] = useState<ConfigShape | null>(null);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    window.api.agents.list().then(setAgents);
    window.api.config.get().then(setConfig);
    window.api.agents.getAllRuns().then((r) => setRecentRuns(r.slice(0, 5)));
    window.api.agents.stats().then(setStats);
  }, []);

  const llmReady = !!config?.llm?.apiKey || config?.llm?.provider === 'ollama';
  const smtpReady = !!config?.smtp?.host;
  const emailVerified = !!(config?.contact?.emailVerified && config?.contact?.email);
  const enabledAgents = agents.filter((a) => a.enabled).length;

  const currency = config?.currency || { code: 'USD', symbol: '$', rateFromUsd: 1 };
  const hasLocalCurrency = currency.code !== 'USD' && currency.rateFromUsd && currency.rateFromUsd !== 1;
  const [showLocal, setShowLocal] = useState(false);

  const hasScheduledAgents = agents.some((a) => a.enabled && a.schedule);
  const schedulingActive = !!config?.scheduling?.launchOnStartup && config?.scheduling?.minimizeToTray !== false;

  function fmtCost(usd: number): string {
    if (showLocal && hasLocalCurrency) {
      return `${currency.symbol}${(usd * currency.rateFromUsd).toFixed(2)}`;
    }
    return `$${usd.toFixed(3)}`;
  }

  const setupSteps = [
    { done: !!config?.profile?.name, label: 'Add your profile', to: '/configuration' },
    { done: llmReady, label: 'Connect an AI provider', to: '/configuration' },
    { done: emailVerified, label: 'Verify your email for delivery', to: '/configuration' },
    { done: agents.length > 0, label: 'Create your first agent', to: '/templates' },
  ];
  const setupComplete = setupSteps.every((s) => s.done);

  return (
    <div className="dashboard-animated-bg min-h-full">
      <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1" style={{ color: '#ffffff' }}>
          {config?.profile?.name ? `Welcome back, ${config.profile.name.split(' ')[0]}` : 'Welcome'}
        </h1>
        <p className="text-[13px]" style={{ color: '#ffffff' }}>
          Your AI agents, ready when you are.
        </p>
      </header>

      <AnnouncementsCard />

      {hasScheduledAgents && (
        schedulingActive ? (
          <div className="card p-3 mb-6 border-success/30 flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-success/15 flex items-center justify-center shrink-0">
              <CheckCircle2 size={14} className="text-success" />
            </div>
            <div className="text-[12px] text-text-secondary dark:text-text-secondary-dark">
              <strong className="text-text-primary dark:text-text-primary-dark">Scheduling active.</strong> Bodhaka Dispatcher launches on startup and runs in the tray, so your scheduled agents fire whenever your PC is on.
            </div>
          </div>
        ) : (
          <Link to="/configuration" className="card p-3 mb-6 border-warning/40 flex items-center gap-2.5 hover:border-warning transition-colors">
            <div className="w-6 h-6 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
              <AlertCircle size={14} className="text-warning" />
            </div>
            <div className="text-[12px] text-text-secondary dark:text-text-secondary-dark flex-1">
              <strong className="text-text-primary dark:text-text-primary-dark">Scheduling only works while the app is open.</strong> Your agents won't run on time if Bodhaka Dispatcher is closed. Turn on "Launch on startup" in Settings so it's always ready when your PC is on.
            </div>
            <ChevronRight size={14} className="text-text-tertiary shrink-0" />
          </Link>
        )
      )}

      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatCard tint="mint" icon={<Bot size={16} />} label="Agents" value={String(agents.length)} sub={`${enabledAgents} enabled`} />
        <StatCard
          tint="sky"
          icon={<Activity size={16} />} label="Provider"
          value={llmReady ? (config?.llm?.provider || ', ') : 'Not set'}
          sub={llmReady ? config?.llm?.model?.split('-').slice(0,3).join('-') : 'Setup needed'}
        />
        <StatCard
          tint="lime"
          icon={<Zap size={16} />} label="Runs (7d)"
          value={String(stats?.last7Days?.runs || 0)}
          sub={`${recentRuns.filter((r) => r.status === 'success').length} successful`}
        />
        <StatCard
          tint="peach"
          icon={<DollarSign size={16} />} label={`Cost (7d)`}
          value={fmtCost(stats?.last7Days?.cost || 0)}
          sub={`${fmtCost(stats?.totalCost || 0)} all time`}
          action={hasLocalCurrency ? (
            <button
              onClick={() => setShowLocal((s) => !s)}
              className="text-[10px] hover:underline mt-1"
              style={{ color: '#1e2a8a' }}
            >
              Show in {showLocal ? 'USD' : currency.code}
            </button>
          ) : undefined}
        />
      </div>

      {!setupComplete && (
        <div className="card p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-accent" />
            <h3 className="font-semibold text-sm">Finish setup</h3>
          </div>
          <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark mb-4">
            Complete these to start building agents.
          </p>
          <div className="space-y-2">
            {setupSteps.map((s, i) => (
              <Link
                key={i} to={s.to}
                className="flex items-center justify-between py-2 px-3 rounded-win hover:bg-bg-hover dark:hover:bg-bg-dark-subtle transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${s.done ? 'bg-success' : 'border-2 border-border-strong dark:border-border-dark-strong'}`}>
                    {s.done && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  <span className={`text-[13px] ${s.done ? 'text-text-tertiary line-through' : ''}`}>{s.label}</span>
                </div>
                {!s.done && <ChevronRight size={14} className="text-text-tertiary group-hover:text-accent" />}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link to="/templates" className="card p-5 hover:border-accent transition-colors group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-win bg-accent-subtle dark:bg-accent-subtle-dark flex items-center justify-center">
              <Sparkles size={16} className="text-accent" />
            </div>
            <div className="font-semibold text-sm group-hover:text-accent transition-colors">Start from a template</div>
          </div>
          <div className="text-[13px] text-text-secondary dark:text-text-secondary-dark">
            12 ready-made agents, study, motivation, research, recreation.
          </div>
        </Link>
        <Link to="/agents/new" className="card p-5 hover:border-accent transition-colors group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-win bg-accent-subtle dark:bg-accent-subtle-dark flex items-center justify-center">
              <Plus size={16} className="text-accent" />
            </div>
            <div className="font-semibold text-sm group-hover:text-accent transition-colors">Build from scratch</div>
          </div>
          <div className="text-[13px] text-text-secondary dark:text-text-secondary-dark">
            Open the visual canvas and design your own agent.
          </div>
        </Link>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Your Agents</h2>
          {agents.length > 0 && <Link to="/agents" className="text-[12px] text-accent hover:underline">View all →</Link>}
        </div>

        {agents.length === 0 ? (
          <div className="card p-12 text-center">
            <BookOpen size={24} className="mx-auto mb-3 text-text-tertiary" />
            <p className="text-sm mb-1">No agents yet</p>
            <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark mb-5">Pick a template to get started.</p>
            <Link to="/templates" className="btn-primary"><Sparkles size={14} /> Browse templates</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {agents.slice(0, 4).map((a) => (
              <Link key={a.id} to={`/agents/${a.id}`} className="card p-4 hover:border-accent transition-colors group">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="font-medium text-[13px] group-hover:text-accent transition-colors">{a.name}</div>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${a.enabled ? 'bg-success' : 'bg-text-tertiary'}`} />
                </div>
                <div className="text-[12px] text-text-secondary dark:text-text-secondary-dark line-clamp-2">
                  {a.description || `${a.definition?.nodes?.length || 0} blocks`}
                </div>
                {a.schedule && (
                  <div className="mt-3 text-[10px] text-text-tertiary">{cronToHuman(a.schedule)}</div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, action, tint }: { icon: React.ReactNode; label: string; value: string; sub: string; action?: React.ReactNode; tint?: 'mint' | 'sky' | 'lime' | 'peach' }) {
  const tints: Record<string, string> = {
    mint: '#e6f7ee',
    sky: '#e6f1fb',
    lime: '#f0f7da',
    peach: '#fdeede',
  };
  const bg = tint ? tints[tint] : '#ffffff';
  return (
    <div
      className="rounded-win p-4"
      style={{ background: bg, border: '1px solid #000000' }}
    >
      <div className="flex items-center gap-1.5 mb-2.5" style={{ color: '#000000' }}>
        {icon}
        <span className="text-[11px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className="text-xl font-bold mb-0.5 truncate" style={{ color: '#000000' }}>{value}</div>
      <div className="text-[11px] truncate" style={{ color: 'rgba(0,0,0,0.6)' }}>{sub}</div>
      {action}
    </div>
  );
}
