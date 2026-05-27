import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, X } from 'lucide-react';

export function Onboarding() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    window.api.config.get().then((c) => {
      if (!c.ui?.onboardingDone) setShow(true);
    });
  }, []);

  async function dismiss() {
    const current = await window.api.config.get();
    await window.api.config.update({ ui: { ...current.ui, onboardingDone: true } });
    setShow(false);
  }

  async function goSetup() {
    await dismiss();
    navigate('/configuration');
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="card p-8 max-w-lg w-full mx-4 shadow-win-flyout relative">
        <button onClick={dismiss} className="absolute top-3 right-3 text-text-tertiary hover:text-text-primary">
          <X size={16} />
        </button>

        <div className="w-12 h-12 rounded-win bg-accent-subtle dark:bg-accent-subtle-dark flex items-center justify-center mb-4">
          <Sparkles size={22} className="text-accent" />
        </div>

        <h2 className="text-xl font-semibold mb-2">Welcome to Agent Studio</h2>
        <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark mb-6">
          Build AI agents that work for you — daily study summaries, motivational messages,
          research briefings, quiz generators, and more. All running locally, with your own API key.
        </p>

        <div className="space-y-3 mb-6">
          <Step number={1} title="Connect an AI provider">
            Bring your own Anthropic, OpenAI, Gemini, or local Ollama key.
          </Step>
          <Step number={2} title="Configure email">
            So your agents can send results to your inbox.
          </Step>
          <Step number={3} title="Pick a template or build from scratch">
            12 ready-made agents available, or design your own.
          </Step>
        </div>

        <div className="flex gap-2">
          <button onClick={dismiss} className="btn-secondary flex-1">Maybe later</button>
          <button onClick={goSetup} className="btn-primary flex-1">
            Get started <ArrowRight size={14} />
          </button>
        </div>

        <p className="text-[11px] text-text-tertiary mt-4 text-center">
          Everything stays on your machine. We never see your data or keys.
        </p>
      </div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-6 h-6 rounded-full bg-accent text-white text-[11px] font-semibold flex items-center justify-center shrink-0">{number}</div>
      <div>
        <div className="font-medium text-[13px] mb-0.5">{title}</div>
        <div className="text-[12px] text-text-secondary dark:text-text-secondary-dark">{children}</div>
      </div>
    </div>
  );
}
