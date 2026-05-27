import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Key, Mail, Send, Check, X, Loader2, ExternalLink, Eye, EyeOff,
  MessageCircle, Globe, Search as SearchIcon
} from 'lucide-react';
import { useToast } from '../components/Toast';
import type { ConfigShape } from '../types/api';

const PROVIDER_INFO = {
  anthropic: {
    name: 'Anthropic Claude',
    recommendedModel: 'claude-sonnet-4-6',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    placeholder: 'sk-ant-...',
    note: 'Best reasoning for student work. Has built-in web search.',
  },
  openai: {
    name: 'OpenAI',
    recommendedModel: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-...',
    note: 'Cheaper option. Supports embeddings for semantic search.',
  },
  gemini: {
    name: 'Google Gemini',
    recommendedModel: 'gemini-1.5-flash-latest',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AIza...',
    note: 'Free tier available. Fast and capable.',
  },
  ollama: {
    name: 'Ollama (Local)',
    recommendedModel: 'llama3.2',
    keyUrl: 'https://ollama.com',
    placeholder: 'No key needed',
    note: 'Run models locally on your machine. 100% private, free, but requires setup.',
  },
};

export function Configuration() {
  const [config, setConfig] = useState<ConfigShape | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testingTwilio, setTestingTwilio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [interestsText, setInterestsText] = useState('');

  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    window.api.config.get().then(async (c) => {
      setConfig(c);
      setInterestsText((c.profile?.interests || []).join(', '));
      const list = await window.api.llm.listModels(c.llm.provider);
      setModels(list);
    });
  }, []);

  function update<K extends keyof ConfigShape>(key: K, patch: Partial<ConfigShape[K]>) {
    setConfig((prev) => (prev ? { ...prev, [key]: { ...prev[key], ...patch } } : prev));
  }

  async function changeProvider(provider: 'openai' | 'anthropic' | 'gemini' | 'ollama') {
    const list = await window.api.llm.listModels(provider);
    setModels(list);
    update('llm', { provider, model: PROVIDER_INFO[provider].recommendedModel, apiKey: '' });
    setTestResult(null);
  }

  async function testKey() {
    if (!config) return;
    setTesting(true);
    setTestResult(null);
    const res = await window.api.llm.testKey(config.llm.provider, config.llm.apiKey, config.llm.ollamaUrl);
    setTestResult(res.success ? 'ok' : 'fail');
    setTesting(false);
    if (res.success) toast.show('Provider connection verified', 'success');
    else toast.show(`Test failed: ${res.error || 'unknown'}`, 'error');
  }

  async function testSmtp() {
    setTestingSmtp(true);
    // Save current SMTP first
    if (config) await window.api.config.update({ smtp: config.smtp });
    const res = await window.api.smtp.test();
    setTestingSmtp(false);
    if (res.success) toast.show('SMTP connection verified', 'success');
    else toast.show(`SMTP test failed: ${res.error}`, 'error');
  }

  async function testTwilio() {
    if (!config) return;
    setTestingTwilio(true);
    const res = await window.api.twilio.test(config.twilio.accountSid, config.twilio.authToken);
    setTestingTwilio(false);
    if (res.ok) toast.show('Twilio credentials verified', 'success');
    else toast.show(`Twilio test failed: ${res.error}`, 'error');
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    const interests = interestsText.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    const toSave = { ...config, profile: { ...config.profile, interests }, ui: { ...config.ui, onboardingDone: true } };
    try {
      await window.api.config.update(toSave);
      setConfig(toSave);
      toast.show('Settings saved', 'success');
      setTimeout(() => navigate('/dashboard'), 600);
    } catch (err: any) {
      toast.show(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!config) return <div className="p-8 text-text-tertiary text-sm">Loading…</div>;
  const providerInfo = PROVIDER_INFO[config.llm.provider];

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-5 pb-24">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-text-secondary dark:text-text-secondary-dark text-[13px] mt-1">
          Configure your profile, AI provider, and how your agents reach you. All data stays on this device.
        </p>
      </header>

      <Section icon={<User size={15} />} title="Your Profile">
        <Field label="Name">
          <input className="input w-full" value={config.profile.name} onChange={(e) => update('profile', { name: e.target.value })} placeholder="e.g. Naveen Srikan" />
        </Field>
        <Field label="Grade / Year">
          <input className="input w-full" value={config.profile.grade} onChange={(e) => update('profile', { grade: e.target.value })} placeholder="e.g. Class 12 · 2nd year B.Tech" />
        </Field>
        <Field label="Interests" hint="Separate with commas. Spaces are fine.">
          <input className="input w-full" value={interestsText} onChange={(e) => setInterestsText(e.target.value)} placeholder="e.g. physics, chess, anime, startups, cricket" />
        </Field>
      </Section>

      <Section icon={<Key size={15} />} title="AI Provider">
        <Field label="Provider">
          <div className="grid grid-cols-2 gap-2">
            {(['anthropic', 'openai', 'gemini', 'ollama'] as const).map((p) => (
              <button
                key={p}
                onClick={() => changeProvider(p)}
                className={`p-3 rounded-win border text-left transition-all ${
                  config.llm.provider === p
                    ? 'border-accent bg-accent-subtle dark:bg-accent-subtle-dark'
                    : 'border-border-strong dark:border-border-dark-strong bg-bg-layer dark:bg-bg-dark-layer hover:border-accent/50'
                }`}
              >
                <div className="text-[13px] font-semibold mb-0.5">{PROVIDER_INFO[p].name}</div>
                <div className="text-[11px] text-text-secondary dark:text-text-secondary-dark">{PROVIDER_INFO[p].note}</div>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Model">
          <select className="input w-full" value={config.llm.model} onChange={(e) => update('llm', { model: e.target.value })}>
            {models.map((m) => (
              <option key={m} value={m}>{m}{m === providerInfo.recommendedModel ? ' — recommended' : ''}</option>
            ))}
          </select>
        </Field>

        {config.llm.provider === 'ollama' ? (
          <Field label="Ollama Server URL" hint="Default: http://localhost:11434">
            <div className="flex gap-2">
              <input className="input flex-1" value={config.llm.ollamaUrl || ''} onChange={(e) => update('llm', { ollamaUrl: e.target.value })} placeholder="http://localhost:11434" />
              <button onClick={testKey} disabled={testing} className="btn-secondary">
                {testing ? <Loader2 size={14} className="animate-spin" /> : 'Test'}
              </button>
            </div>
            {testResult === 'ok' && <div className="mt-2 text-[12px] text-success flex items-center gap-1.5"><Check size={12} /> Connected</div>}
            {testResult === 'fail' && <div className="mt-2 text-[12px] text-danger flex items-center gap-1.5"><X size={12} /> Could not reach Ollama</div>}
          </Field>
        ) : (
          <Field label="API Key" hint={<a href={providerInfo.keyUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline inline-flex items-center gap-1">Get a key <ExternalLink size={10} /></a>}>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input type={showKey ? 'text' : 'password'} className="input w-full pr-9" value={config.llm.apiKey} onChange={(e) => { update('llm', { apiKey: e.target.value }); setTestResult(null); }} placeholder={providerInfo.placeholder} />
                <button type="button" onClick={() => setShowKey((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary">
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button onClick={testKey} disabled={!config.llm.apiKey || testing} className="btn-secondary">
                {testing ? <Loader2 size={14} className="animate-spin" /> : 'Test'}
              </button>
            </div>
            {testResult === 'ok' && <div className="mt-2 text-[12px] text-success flex items-center gap-1.5"><Check size={12} /> Verified</div>}
            {testResult === 'fail' && <div className="mt-2 text-[12px] text-danger flex items-center gap-1.5"><X size={12} /> Validation failed</div>}
          </Field>
        )}
      </Section>

      <Section icon={<Mail size={15} />} title="Contact">
        <Field label="Email" hint="Default destination for email-sending agents.">
          <input className="input w-full" type="email" value={config.contact.email} onChange={(e) => update('contact', { email: e.target.value })} placeholder="you@example.com" />
        </Field>
        <Field label="WhatsApp Number" hint="Include country code (e.g. +91 for India).">
          <input className="input w-full" value={config.contact.whatsapp} onChange={(e) => update('contact', { whatsapp: e.target.value })} placeholder="+91 98765 43210" />
        </Field>
      </Section>

      <Section icon={<Send size={15} />} title="Email Sending (SMTP)">
        <p className="text-[12px] text-text-secondary -mt-1 mb-2">
          For Gmail, create an{' '}
          <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-accent hover:underline">app password</a>.
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
        <Field label="From address" hint="Defaults to username">
          <input className="input w-full" value={config.smtp.from} onChange={(e) => update('smtp', { from: e.target.value })} placeholder="(optional)" />
        </Field>
        <div>
          <button onClick={testSmtp} disabled={testingSmtp || !config.smtp.host} className="btn-secondary">
            {testingSmtp ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Test SMTP Connection
          </button>
        </div>
      </Section>

      <Section icon={<MessageCircle size={15} />} title="WhatsApp via Twilio (optional)">
        <p className="text-[12px] text-text-secondary -mt-1 mb-2">
          Get credentials from{' '}
          <a href="https://www.twilio.com/console" target="_blank" rel="noreferrer" className="text-accent hover:underline">Twilio Console</a>.
          Then activate the{' '}
          <a href="https://www.twilio.com/console/sms/whatsapp/sandbox" target="_blank" rel="noreferrer" className="text-accent hover:underline">WhatsApp Sandbox</a>.
        </p>
        <Field label="Account SID">
          <input className="input w-full" value={config.twilio.accountSid} onChange={(e) => update('twilio', { accountSid: e.target.value })} placeholder="AC..." />
        </Field>
        <Field label="Auth Token">
          <input type="password" className="input w-full" value={config.twilio.authToken} onChange={(e) => update('twilio', { authToken: e.target.value })} />
        </Field>
        <Field label="From WhatsApp number" hint="The Twilio-provisioned sender (e.g. +14155238886 for the sandbox)">
          <input className="input w-full" value={config.twilio.from} onChange={(e) => update('twilio', { from: e.target.value })} placeholder="+14155238886" />
        </Field>
        <div>
          <button onClick={testTwilio} disabled={testingTwilio || !config.twilio.accountSid} className="btn-secondary">
            {testingTwilio ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
            Test Twilio Credentials
          </button>
        </div>
      </Section>

      <Section icon={<SearchIcon size={15} />} title="Web Search (optional)">
        <p className="text-[12px] text-text-secondary -mt-1 mb-2">
          Add a search API key for the Web Search node. Without one, Anthropic's built-in search is used as a fallback.
        </p>
        <Field label="Tavily API Key" hint={<a href="https://app.tavily.com/" target="_blank" rel="noreferrer" className="text-accent hover:underline">Get one (1000 free/month)</a>}>
          <input type="password" className="input w-full" value={config.search.tavilyKey} onChange={(e) => update('search', { tavilyKey: e.target.value })} placeholder="tvly-..." />
        </Field>
        <Field label="Brave Search API Key" hint={<a href="https://api.search.brave.com/app/keys" target="_blank" rel="noreferrer" className="text-accent hover:underline">Alternative — get one</a>}>
          <input type="password" className="input w-full" value={config.search.braveKey} onChange={(e) => update('search', { braveKey: e.target.value })} placeholder="BSA..." />
        </Field>
      </Section>

      <div className="sticky bottom-0 -mx-8 px-8 py-3 bg-bg-base/95 dark:bg-bg-dark/95 backdrop-blur border-t border-border dark:border-border-dark flex justify-end gap-2">
        <button onClick={() => navigate('/dashboard')} className="btn-secondary">Cancel</button>
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
    <section className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-win bg-bg-hover dark:bg-bg-dark-subtle flex items-center justify-center text-text-secondary">{icon}</div>
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <div className="space-y-3.5">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <div className="mt-1 text-[11px] text-text-tertiary">{hint}</div>}
    </div>
  );
}
