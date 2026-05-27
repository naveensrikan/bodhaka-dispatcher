import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { useToast } from '../components/Toast';
import type { TemplateInfo } from '../types/api';

const CATEGORY_LABEL: Record<string, string> = {
  study: 'Study',
  recreation: 'Recreation',
  wellness: 'Wellness',
  utility: 'Utility',
  productivity: 'Productivity',
};

const CATEGORY_CHIP: Record<string, string> = {
  study: 'chip-study',
  recreation: 'chip-recreation',
  wellness: 'chip-wellness',
  utility: 'chip-utility',
  productivity: 'chip-productivity',
};

export function Templates() {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [creating, setCreating] = useState<string | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => { window.api.templates.list().then(setTemplates); }, []);

  async function use(t: TemplateInfo) {
    setCreating(t.id);
    try {
      const { id } = await window.api.templates.create(t.id);
      toast.show(`Created "${t.name}"`, 'success');
      setTimeout(() => navigate(`/agents/${id}`), 500);
    } catch (err: any) {
      toast.show(`Failed: ${err.message}`, 'error');
      setCreating(null);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-brand" />
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        </div>
        <p className="text-text-secondary dark:text-text-secondary-dark text-[13px]">
          Pre-built agents to get you started. Pick one, customize it, and run it.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {templates.map((t) => (
          <div key={t.id} className="card p-5 flex flex-col">
            <div className="flex items-start gap-3 mb-3">
              <div className="text-2xl leading-none">{t.icon}</div>
              <div className="flex-1">
                <div className="font-semibold text-[14px] mb-1.5">{t.name}</div>
                <span className={CATEGORY_CHIP[t.category] || 'chip'}>
                  {CATEGORY_LABEL[t.category] || t.category}
                </span>
              </div>
            </div>
            <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark flex-1 mb-4">
              {t.description}
            </p>
            <div className="flex items-center justify-between gap-2">
              {t.schedule ? (
                <div className="text-[10px] font-mono text-text-tertiary flex items-center gap-1 uppercase tracking-wider">
                  <Clock size={10} /> {t.schedule}
                </div>
              ) : (
                <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Manual run</div>
              )}
              <button onClick={() => use(t)} disabled={!!creating} className="btn-primary">
                {creating === t.id ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                Use template
              </button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="card p-12 text-center text-text-tertiary text-sm">Loading templates...</div>
      )}
    </div>
  );
}
