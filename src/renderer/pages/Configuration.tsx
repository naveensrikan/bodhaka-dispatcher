import { useEffect, useState } from 'react';
import { User, Key, Mail, Phone, Check, X, Loader2 } from 'lucide-react';
import type { ConfigShape } from '../types/api';

const PROVIDER_RECOMMENDATIONS = {
  anthropic: {
    name: 'Anthropic Claude',
    recommendedModel: 'claude-sonnet-4-6',
    note: 'Recommended: best balance of capability and cost for student workflows.',
  },
  openai: {
    name: 'OpenAI',
    recommendedModel: 'gpt-4o-mini',
    note: 'Good for tight budgets; supports embeddings for knowledge base search.',
  },
};

export function Configuration() {
  const [config, setConfig] = useState<ConfigShape | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.api.config.get().then((c) => {
      setConfig(c);
      window.api.llm.listModels(c.llm.provider).then(setModels);
    });
  }, []);

  function update<K extends keyof ConfigShape>(key: K, patch: Partial<ConfigShape[K]>) {
    setConfig((prev) => (prev ? { ...prev, [key]: { ...prev[key], ...patch } } : prev));
    setTestResult(null);
  }

  async function changeProvider(provider: 'openai' | 'anthropic') {
    const list = await window.api.llm.listModels(provider);
    setModels(list);
    update('llm', { provider, model: PROVIDER_RECOMMENDATIONS[provider].recommendedModel, apiKey: '' });
    setTestResult(null);
  }

  async function testKey() {
    if (!config?.llm?.apiKey) return;
    setTesting(true);
    setTestResult(null);
    const res = await window.api.llm.testKey(config.llm.provider, config.llm.apiKey);
    setTestResult(res.success ? 'ok' : 'fail');
    setTesting(false);
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    await window.api.config.update(config);
    setSaving(false);
  }

  if (!config) return <div className="p-8 text-ink-400">Loading…</div>;

  const rec = PROVIDER_RECOMMENDATIONS[config.llm.provider];

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Configuration</h1>
        <p className="text-ink-300 text-sm mt-1">Set up your profile, API access, and how your agents reach you.</p>
      </header>

      {/* Profile */}
      <Section icon={<User size={16} />} title="Your Profile">
        <Field label="Name">
          <input
            className="input w-full"
            value={config.profile.name}
            onChange={(e) => update('profile', { name: e.target.value })}
            placeholder="e.g. Priya Sharma"
          />
        </Field>
        <Field label="Grade / Year">
          <input
            className="input w-full"
            value={config.profile.grade}
            onChange={(e) => update('profile', { grade: e.target.value })}
            placeholder="e.g. Class 12, 2nd year B.Tech"
          />
        </Field>
        <Field label="Interests (comma-separated)">
          <input
            className="input w-full"
            value={config.profile.interests.join(', ')}
            onChange={(e) => update('profile', { interests: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            placeholder="e.g. physics, chess, anime, startups"
          />
        </Field>
      </Section>

      {/* LLM */}
      <Section icon={<Key size={16} />} title="AI Model (Bring Your Own Key)">
        <Field label="Provider">
          <div className="grid grid-cols-2 gap-2">
            {(['anthropic', 'openai'] as const).map((p) => (
              <button
                key={p}
                onClick={() => changeProvider(p)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  config.llm.provider === p
                    ? 'border-accent bg-accent/10'
                    : 'border-ink-700 bg-ink-800/40 hover:border-ink-600'
                }`}
              >
                <div className="font-display text-sm mb-0.5">{PROVIDER_RECOMMENDATIONS[p].name}</div>
                <div className="text-[11px] text-ink-400">{PROVIDER_RECOMMENDATIONS[p].note}</div>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Model">
          <select
            className="input w-full"
            value={config.llm.model}
            onChange={(e) => update('llm', { model: e.target.value })}
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
                {m === rec.recommendedModel ? ' ★ recommended' : ''}
              </option>
            ))}
          </select>
        </Field>

        <Field label="API Key">
          <div className="flex gap-2">
            <input
              type="password"
              className="input flex-1"
              value={config.llm.apiKey}
              onChange={(e) => update('llm', { apiKey: e.target.value })}
              placeholder={config.llm.provider === 'anthropic' ? 'sk-ant-…' : 'sk-…'}
            />
            <button onClick={testKey} disabled={!config.llm.apiKey || testing} className="btn-secondary">
              {testing ? <Loader2 size={14} className="animate-spin" /> : 'Test'}
            </button>
          </div>
          {testResult === 'ok' && (
            <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
              <Check size={12} /> Key verified
            </div>
          )}
          {testResult === 'fail' && (
            <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
              <X size={12} /> Could not validate
            </div>
          )}
        </Field>
      </Section>

      {/* Contact */}
      <Section icon={<Mail size={16} />} title="How Your Agents Reach You">
        <Field label="Email">
          <input
            className="input w-full"
            type="email"
            value={config.contact.email}
            onChange={(e) => update('contact', { email: e.target.value })}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="WhatsApp Number">
          <input
            className="input w-full"
            value={config.contact.whatsapp}
            onChange={(e) => update('contact', { whatsapp: e.target.value })}
            placeholder="+91 98765 43210"
          />
          <p className="text-[11px] text-ink-400 mt-1">WhatsApp delivery needs Twilio setup — coming in v1.1.</p>
        </Field>
      </Section>

      {/* SMTP */}
      <Section icon={<Phone size={16} />} title="Email Sending (SMTP)">
        <p className="text-xs text-ink-400 mb-4 -mt-2">
          To let agents send you email, give us your SMTP credentials. For Gmail, create an{' '}
          <a href="#" className="text-accent">app password</a>.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="SMTP Host">
            <input className="input w-full" value={config.smtp.host} onChange={(e) => update('smtp', { host: e.target.value })} placeholder="smtp.gmail.com" />
          </Field>
          <Field label="Port">
            <input className="input w-full" type="number" value={config.smtp.port} onChange={(e) => update('smtp', { port: parseInt(e.target.value) || 587 })} />
          </Field>
          <Field label="Username">
            <input className="input w-full" value={config.smtp.user} onChange={(e) => update('smtp', { user: e.target.value })} placeholder="you@gmail.com" />
          </Field>
          <Field label="Password / App Password">
            <input className="input w-full" type="password" value={config.smtp.pass} onChange={(e) => update('smtp', { pass: e.target.value })} />
          </Field>
        </div>
        <Field label="From address (optional)">
          <input className="input w-full" value={config.smtp.from} onChange={(e) => update('smtp', { from: e.target.value })} placeholder="Defaults to username" />
        </Field>
      </Section>

      {/* Save bar */}
      <div className="sticky bottom-0 -mx-8 px-8 py-4 bg-ink-900/80 backdrop-blur border-t border-ink-700/60 flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-ink-700/60 flex items-center justify-center text-ink-200">{icon}</div>
        <h2 className="font-display text-lg tracking-tight">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
