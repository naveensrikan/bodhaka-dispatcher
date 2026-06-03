import { useState, useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';

/**
 * AI Safety notice shown once per app launch (per session). Dismissed for the
 * session with the X button. It re-appears the next time the app is launched.
 *
 * Uses sessionStorage so the dismissal does not persist across launches but
 * does persist within a single launch (avoids the notice flashing across page
 * navigations).
 */
export function AISafetyNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem('ai-safety-notice-dismissed');
      if (!dismissed) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    try { sessionStorage.setItem('ai-safety-notice-dismissed', '1'); } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="mx-4 mt-3 mb-1 rounded-win p-3 flex items-start gap-2.5"
      style={{
        background: '#eef4ff',
        border: '1px solid #1e2a8a',
        color: '#1a1a1a',
      }}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: '#1e2a8a' }}
      >
        <ShieldCheck size={13} color="#ffffff" />
      </div>
      <div className="flex-1 text-[12px] leading-relaxed">
        <strong>A note on safe AI use.</strong>{' '}
        Bodhaka Dispatcher is a tool for learning. You are responsible for the prompts you write, the agents you design, and how you use AI responses. AI safety depends on both you and your chosen AI provider (Anthropic, OpenAI, Google, or Ollama). BuoyantWave Learning Technologies LLP does not train or control any AI model and is not responsible for AI-generated content. Please use this app for genuine educational purposes.
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 text-text-tertiary hover:text-text-primary"
        title="Dismiss for this session"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
