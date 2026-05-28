import { useEffect, useState } from 'react';
import { Clock, Play, X, Loader2 } from 'lucide-react';

interface Missed {
  agentId: string;
  agentName: string;
  schedule: string;
  missedCount: number;
  lastMissedAt: number;
}

export function MissedRunsBanner() {
  const [missed, setMissed] = useState<Missed[]>([]);
  const [running, setRunning] = useState<string | null>(null);

  async function load() {
    try {
      const config = await window.api.config.get();
      // Only show the review banner in "ask" mode
      if (config.scheduling?.catchUpMode === 'auto') return;
      const found = await window.api.catchup.find();
      if (Array.isArray(found) && found.length > 0) setMissed(found);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    load();
    const unsub = window.api.catchup.onMissed((data: Missed[]) => {
      if (Array.isArray(data)) setMissed(data);
    });
    return unsub;
  }, []);

  async function runOne(m: Missed) {
    setRunning(m.agentId);
    try {
      await window.api.catchup.run(m.agentId);
    } finally {
      setRunning(null);
      setMissed((prev) => prev.filter((x) => x.agentId !== m.agentId));
    }
  }

  function dismissOne(agentId: string) {
    setMissed((prev) => prev.filter((x) => x.agentId !== agentId));
  }

  function dismissAll() {
    setMissed([]);
  }

  if (missed.length === 0) return null;

  return (
    <div className="mx-4 mt-3 card p-4 border-warning/40">
      <div className="flex items-center gap-2 mb-2">
        <Clock size={15} className="text-warning" />
        <h3 className="font-semibold text-[13px] flex-1">
          Missed scheduled agents
        </h3>
        <button onClick={dismissAll} className="text-[11px] text-text-tertiary hover:text-text-primary">
          Dismiss all
        </button>
      </div>
      <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark mb-3">
        These ran behind because your PC was off at their scheduled time. Run them now or dismiss.
      </p>
      <div className="space-y-1.5">
        {missed.map((m) => (
          <div key={m.agentId} className="flex items-center gap-3 p-2 rounded-win bg-bg-hover dark:bg-bg-dark-subtle">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{m.agentName}</div>
              <div className="text-[11px] text-text-tertiary">
                missed {m.missedCount} time{m.missedCount > 1 ? 's' : ''} · last due {new Date(m.lastMissedAt).toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => runOne(m)}
              disabled={running === m.agentId}
              className="btn-secondary text-[11px] py-1"
            >
              {running === m.agentId ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
              Run
            </button>
            <button
              onClick={() => dismissOne(m.agentId)}
              className="btn-ghost text-[11px] py-1"
            >
              <X size={11} /> Dismiss
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
