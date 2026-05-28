import { useEffect, useState } from 'react';
import { DollarSign, Save, Loader2, RotateCcw, Info } from 'lucide-react';
import { useToast } from '../components/Toast';
import { ExtLink } from '../components/ExtLink';
import type { ConfigShape } from '../types/api';

const PROVIDER_OF: Record<string, string> = {
  'gpt-4o': 'OpenAI', 'gpt-4o-mini': 'OpenAI', 'gpt-4.1': 'OpenAI', 'gpt-4.1-mini': 'OpenAI',
  'claude-opus-4-7': 'Anthropic', 'claude-sonnet-4-6': 'Anthropic', 'claude-haiku-4-5-20251001': 'Anthropic',
  'gemini-1.5-pro-latest': 'Google', 'gemini-1.5-flash-latest': 'Google', 'gemini-2.0-flash': 'Google',
};

const PRICING_LINKS: Record<string, string> = {
  OpenAI: 'https://openai.com/api/pricing/',
  Anthropic: 'https://www.anthropic.com/pricing',
  Google: 'https://ai.google.dev/pricing',
};

const DEFAULT_PRICING: Record<string, [number, number]> = {
  'gpt-4o': [0.0025, 0.01], 'gpt-4o-mini': [0.00015, 0.0006],
  'gpt-4.1': [0.002, 0.008], 'gpt-4.1-mini': [0.0004, 0.0016],
  'claude-opus-4-7': [0.015, 0.075], 'claude-sonnet-4-6': [0.003, 0.015],
  'claude-haiku-4-5-20251001': [0.001, 0.005],
  'gemini-1.5-pro-latest': [0.00125, 0.005],
  'gemini-1.5-flash-latest': [0.000075, 0.0003], 'gemini-2.0-flash': [0.0001, 0.0004],
};

export function Pricing() {
  const [config, setConfig] = useState<ConfigShape | null>(null);
  const [pricing, setPricing] = useState<Record<string, [number, number]>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    window.api.config.get().then((c) => {
      setConfig(c);
      setPricing(c.pricing || DEFAULT_PRICING);
    });
  }, []);

  function updatePrice(model: string, idx: 0 | 1, value: string) {
    const num = parseFloat(value) || 0;
    setPricing((prev) => {
      const pair = [...(prev[model] || [0, 0])] as [number, number];
      pair[idx] = num;
      return { ...prev, [model]: pair };
    });
  }

  async function save() {
    setSaving(true);
    await window.api.config.update({ pricing });
    setSaving(false);
    toast.show('Pricing saved', 'success');
  }

  function resetDefaults() {
    setPricing({ ...DEFAULT_PRICING });
    toast.show('Reset to defaults, remember to Save', 'info');
  }

  if (!config) return <div className="p-8 text-text-tertiary text-sm">Loading…</div>;

  const currency = config.currency || { code: 'USD', symbol: '$', rateFromUsd: 1 };
  const models = Object.keys(pricing).length ? Object.keys(pricing) : Object.keys(DEFAULT_PRICING);

  // Group by provider
  const byProvider: Record<string, string[]> = {};
  for (const m of models) {
    const p = PROVIDER_OF[m] || 'Other';
    (byProvider[p] ||= []).push(m);
  }

  return (
    <div className="p-8 max-w-3xl mx-auto pb-24">
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign size={20} className="text-brand" />
          <h1 className="text-2xl font-semibold tracking-tight">Model Pricing</h1>
        </div>
        <p className="text-text-secondary dark:text-text-secondary-dark text-[13px]">
          These rates are used to estimate how much each agent run costs. Providers change prices over time , 
          if a rate is out of date, update it here.
        </p>
      </header>

      <div className="card p-4 mb-5">
        <div className="flex items-start gap-2 text-[12px] text-text-secondary dark:text-text-secondary-dark">
          <Info size={14} className="text-brand shrink-0 mt-0.5" />
          <div>
            Prices are in <strong>USD per 1,000 tokens</strong>, one value for input (what you send) and one for
            output (what the AI writes back). A token is roughly ¾ of a word. Check the latest official prices:{' '}
            <ExtLink href="https://openai.com/api/pricing/" showIcon>OpenAI</ExtLink>,{' '}
            <ExtLink href="https://www.anthropic.com/pricing" showIcon>Anthropic</ExtLink>,{' '}
            <ExtLink href="https://ai.google.dev/pricing" showIcon>Google</ExtLink>.
          </div>
        </div>
      </div>

      {Object.entries(byProvider).map(([provider, ms]) => (
        <section key={provider} className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">{provider}</h2>
            {PRICING_LINKS[provider] && (
              <ExtLink href={PRICING_LINKS[provider]} showIcon className="text-[11px]">Official prices</ExtLink>
            )}
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-[10px] uppercase tracking-wider text-text-tertiary font-medium px-1">
              <span>Model</span>
              <span className="w-28 text-right">Input /1K</span>
              <span className="w-28 text-right">Output /1K</span>
            </div>
            {ms.map((m) => (
              <div key={m} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
                <span className="text-[12px] font-mono truncate">{m}</span>
                <div className="w-28 relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary text-[11px]">$</span>
                  <input
                    type="number" step="0.0001" min="0"
                    className="input w-full text-right text-[12px] pl-5"
                    value={pricing[m]?.[0] ?? 0}
                    onChange={(e) => updatePrice(m, 0, e.target.value)}
                  />
                </div>
                <div className="w-28 relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary text-[11px]">$</span>
                  <input
                    type="number" step="0.0001" min="0"
                    className="input w-full text-right text-[12px] pl-5"
                    value={pricing[m]?.[1] ?? 0}
                    onChange={(e) => updatePrice(m, 1, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {currency.code !== 'USD' && (
        <p className="text-[11px] text-text-tertiary mb-4">
          Note: prices are entered in USD. Your dashboard shows costs converted to {currency.code} at your configured rate ({currency.symbol}{currency.rateFromUsd} per $1).
        </p>
      )}

      <div className="sticky bottom-0 -mx-8 px-8 py-3 bg-bg-base/95 dark:bg-bg-dark/95 backdrop-blur border-t border-border dark:border-border-dark flex justify-between gap-2">
        <button onClick={resetDefaults} className="btn-ghost">
          <RotateCcw size={14} /> Reset to defaults
        </button>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save pricing
        </button>
      </div>
    </div>
  );
}
