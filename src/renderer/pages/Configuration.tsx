import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Key, Mail, Send, Check, Loader2, Eye, EyeOff,
  MessageCircle, Search as SearchIcon, Award, Coins, AlertTriangle, Clock, FileText,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { InfoTooltip } from '../components/InfoTooltip';
import { ExtLink } from '../components/ExtLink';
import { SETUP_STEPS } from '../lib/setupSteps';
import { CURRENCIES } from '../lib/currencies';
import type { ConfigShape } from '../types/api';

const PROVIDER_INFO = {
  anthropic: { name: 'Anthropic Claude', recommendedModel: 'claude-sonnet-4-6', placeholder: 'sk-ant-...', note: 'Best reasoning. Built-in web search.' },
  openai:    { name: 'OpenAI',           recommendedModel: 'gpt-4o-mini',       placeholder: 'sk-...',     note: 'Cheaper. Supports embeddings.' },
  gemini:    { name: 'Google Gemini',    recommendedModel: 'gemini-1.5-flash-latest', placeholder: 'AIza...', note: 'Generous free tier.' },
  ollama:    { name: 'Ollama (Local)',   recommendedModel: 'llama3.2',          placeholder: 'No key needed', note: 'Run models locally. Free and private.' },
};

export function Configuration() {
  const [config, setConfig] = useState<ConfigShape | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testingTwilio, setTestingTwilio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [interestsText, setInterestsText] = useState('');
  const [encrypted, setEncrypted] = useState<boolean | null>(null);

  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    window.api.config.get().then(async (c) => {
      setConfig(c);
      setInterestsText((c.profile?.interests || []).join(', '));
      const list = await window.api.llm.listModels(c.llm.provider);
      setModels(list);
    });
    window.api.config.encryptionStatus().then((s) => setEncrypted(s.available)).catch(() => setEncrypted(null));
  }, []);

  function update<K extends keyof ConfigShape>(key: K, patch: Partial<ConfigShape[K]>) {
    setConfig((prev) => (prev ? { ...prev, [key]: { ...prev[key], ...patch } } : prev));
  }
  function setVerified(which: 'llm' | 'smtp' | 'twilio', value: boolean) {
    setConfig((prev) => prev ? { ...prev, verified: { ...prev.verified, [which]: value } } : prev);
  }

  async function changeProvider(provider: 'openai' | 'anthropic' | 'gemini' | 'ollama') {
    const list = await window.api.llm.listModels(provider);
    setModels(list);
    update('llm', { provider, model: PROVIDER_INFO[provider].recommendedModel, apiKey: '' });
    setVerified('llm', false);
  }

  async function testKey() {
    if (!config) return;
    setTesting(true);
    const res = await window.api.llm.testKey(config.llm.provider, config.llm.apiKey, config.llm.ollamaUrl);
    setTesting(false);
    if (res.success) {
      setVerified('llm', true);
      await window.api.config.update({
        llm: config.llm,
        verified: { ...config.verified, llm: true },
      });
    } else {
      setVerified('llm', false);
      toast.show(`Test failed: ${res.error || 'invalid credentials'}`, 'error');
    }
  }

  async function testSmtp() {
    if (!config) return;
    setTestingSmtp(true);
    await window.api.config.update({ smtp: config.smtp });
    const res = await window.api.smtp.test();
    setTestingSmtp(false);
    if (res.success) {
      setVerified('smtp', true);
      await window.api.config.update({ smtp: config.smtp, verified: { ...config.verified, smtp: true } });
    } else {
      setVerified('smtp', false);
      toast.show(`SMTP test failed: ${res.error}`, 'error');
    }
  }

  async function testTwilio() {
    if (!config) return;
    setTestingTwilio(true);
    const res = await window.api.twilio.test(config.twilio.accountSid, config.twilio.authToken);
    setTestingTwilio(false);
    if (res.ok) {
      setVerified('twilio', true);
      await window.api.config.update({ twilio: config.twilio, verified: { ...config.verified, twilio: true } });
    } else {
      setVerified('twilio', false);
      toast.show(`Twilio test failed: ${res.error}`, 'error');
    }
  }

  async function save() {
    if (!config) return;
    if ((config.contact.email || config.contact.whatsapp) && !config.profile.ownershipConfirmed) {
      toast.show('Please tick the box confirming these contact details are your own and for personal use.', 'error');
      return;
    }
    setSaving(true);
    const interests = interestsText.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    const toSave = { ...config, profile: { ...config.profile, interests }, ui: { ...config.ui, onboardingDone: true } };
    try {
      await window.api.config.update(toSave);
      setConfig(toSave);
      toast.show('Settings saved', 'success');
      setTimeout(() => navigate('/dashboard'), 500);
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
          Configure your profile, AI provider, and delivery channels. All data stays on this device.
        </p>
      </header>

      {encrypted !== null && (
        <div className={`card p-3 flex items-center gap-2.5 ${encrypted ? 'border-success/30' : 'border-warning/40'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${encrypted ? 'bg-success/15' : 'bg-warning/15'}`}>
            <Key size={13} className={encrypted ? 'text-success' : 'text-warning'} />
          </div>
          <div className="text-[12px] text-text-secondary dark:text-text-secondary-dark">
            {encrypted ? (
              <><strong className="text-text-primary dark:text-text-primary-dark">Your keys and passwords are encrypted on this device</strong> using Windows' built-in protection (tied to your login). They are stored only here, never sent to us or any server.</>
            ) : (
              <><strong className="text-text-primary dark:text-text-primary-dark">Keys are stored locally on this device only.</strong> OS encryption is unavailable on this system, so keys are kept in the app's local data. They are never sent to us or any server.</>
            )}
          </div>
        </div>
      )}

      <Section icon={<User size={15} />} title="Your Profile">
        <Field label="Name">
          <input className="input w-full" value={config.profile.name} onChange={(e) => update('profile', { name: e.target.value })} placeholder="e.g. Aarav Mehta" />
        </Field>
        <Field label="Grade / Year">
          <input className="input w-full" value={config.profile.grade} onChange={(e) => update('profile', { grade: e.target.value })} placeholder="e.g. 2nd year B.Tech, MBA student" />
        </Field>
        <Field label="Hobbies & Interests" hint="Separate with commas. These help personalize your agents' tone.">
          <input
            className="input w-full"
            value={interestsText}
            onChange={(e) => setInterestsText(e.target.value)}
            placeholder="e.g. chess, photography, cricket, gaming, reading, music, hiking, cooking"
          />
        </Field>
      </Section>

      <Section
        icon={<Key size={15} />}
        title="AI Provider"
        verified={config.verified?.llm}
        info={<InfoTooltip title={SETUP_STEPS[config.llm.provider].title} steps={SETUP_STEPS[config.llm.provider].steps} />}
      >
        <Field label="Provider">
          <div className="grid grid-cols-2 gap-2">
            {(['anthropic', 'openai', 'gemini', 'ollama'] as const).map((p) => (
              <button
                key={p}
                onClick={() => changeProvider(p)}
                className={`p-3 rounded-win border text-left transition-all ${
                  config.llm.provider === p
                    ? 'border-brand bg-brand-subtle dark:bg-brand-subtle-dark'
                    : 'border-border-strong dark:border-border-dark-strong bg-bg-layer dark:bg-bg-dark-layer hover:border-brand/50'
                }`}
              >
                <div className="text-[13px] font-semibold mb-0.5">{PROVIDER_INFO[p].name}</div>
                <div className="text-[11px] text-text-secondary dark:text-text-secondary-dark">{PROVIDER_INFO[p].note}</div>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Model">
          <div className="flex items-center gap-2">
            <select className="input flex-1" value={config.llm.model} onChange={(e) => update('llm', { model: e.target.value })}>
              {models.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
            {config.llm.model === providerInfo.recommendedModel && (
              <span className="chip-gold shrink-0">
                <Award size={11} /> Recommended
              </span>
            )}
          </div>
          {config.llm.model !== providerInfo.recommendedModel && (
            <div className="mt-1.5 text-[11px] text-text-tertiary">
              ★ <button onClick={() => update('llm', { model: providerInfo.recommendedModel })} className="text-brand hover:underline">
                Use recommended: {providerInfo.recommendedModel}
              </button>
            </div>
          )}
        </Field>

        {config.llm.provider === 'ollama' ? (
          <Field label="Ollama Server URL" hint="Default: http://localhost:11434">
            <div className="flex gap-2">
              <input className="input flex-1" value={config.llm.ollamaUrl || ''} onChange={(e) => { update('llm', { ollamaUrl: e.target.value }); setVerified('llm', false); }} placeholder="http://localhost:11434" />
              <button onClick={testKey} disabled={testing} className="btn-secondary">
                {testing ? <Loader2 size={14} className="animate-spin" /> : 'Test'}
              </button>
            </div>
            {config.verified?.llm && <VerifiedBadge text="Connected to Ollama" />}
          </Field>
        ) : (
          <Field label="API Key">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="input w-full pr-9"
                  value={config.llm.apiKey}
                  onChange={(e) => { update('llm', { apiKey: e.target.value }); setVerified('llm', false); }}
                  placeholder={providerInfo.placeholder}
                />
                <button type="button" onClick={() => setShowKey((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary">
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button onClick={testKey} disabled={!config.llm.apiKey || testing} className="btn-secondary">
                {testing ? <Loader2 size={14} className="animate-spin" /> : 'Test'}
              </button>
            </div>
            {config.verified?.llm && <VerifiedBadge text="API key verified" />}
          </Field>
        )}
      </Section>

      <Section icon={<Mail size={15} />} title="Your Contact Details (personal use only)">
        <div className="p-3 mb-1 rounded-win bg-warning/10 border border-warning/30 text-[12px] text-text-secondary dark:text-text-secondary-dark">
          These are the <strong>only</strong> addresses your agents can send to. This keeps Bodhaka Dispatcher a personal-use tool and prevents misuse for bulk messaging.
        </div>

        <ContactVerification config={config} setConfig={setConfig} toast={toast} />

        <label className="flex items-start gap-2.5 cursor-pointer pt-2">
          <input
            type="checkbox"
            checked={config.profile.ownershipConfirmed || false}
            onChange={(e) => update('profile', { ownershipConfirmed: e.target.checked })}
            className="mt-0.5"
          />
          <span className="text-[12px] text-text-primary dark:text-text-primary-dark leading-relaxed">
            I confirm that the email address and phone number above are <strong>my own</strong>, and that I will use Bodhaka Dispatcher
            and any agents I build <strong>solely for my personal learning</strong>, not for sending bulk or unsolicited messages to others.
          </span>
        </label>
      </Section>

      <Section icon={<Coins size={15} />} title="Your Choice of Currency">
        <p className="text-[12px] text-text-secondary -mt-1 mb-2">
          Model prices are in USD. Choose your local currency and the conversion rate to see costs in your money on the Dashboard.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Currency">
            <select
              className="input w-full"
              value={config.currency?.code || 'USD'}
              onChange={(e) => {
                const cur = CURRENCIES.find((c) => c.code === e.target.value);
                if (cur) update('currency', { code: cur.code, symbol: cur.symbol } as any);
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code}, {c.name} ({c.symbol})</option>
              ))}
            </select>
          </Field>
          <Field label="Rate: units per $1 USD">
            <input
              type="number" step="0.01" className="input w-full"
              value={config.currency?.rateFromUsd ?? 1}
              onChange={(e) => update('currency', { rateFromUsd: parseFloat(e.target.value) || 1 } as any)}
              placeholder="83"
            />
          </Field>
        </div>
        <p className="hint">
          Symbol auto-fills: <strong>{config.currency?.symbol || '$'}</strong>. Check today's rate at{' '}
          <ExtLink href="https://www.google.com/search?q=usd+to+inr" showIcon>Google</ExtLink> or{' '}
          <ExtLink href="https://www.xe.com/currencyconverter/" showIcon>xe.com</ExtLink>, then enter how many units equal $1 (e.g. 83 for INR).
        </p>
      </Section>

      <Section
        icon={<Send size={15} />}
        title="Email Sending (SMTP)"
        verified={config.verified?.smtp}
        info={<InfoTooltip title={SETUP_STEPS.smtp.title} steps={SETUP_STEPS.smtp.steps} />}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="SMTP Host">
            <input className="input w-full" value={config.smtp.host} onChange={(e) => { update('smtp', { host: e.target.value }); setVerified('smtp', false); }} placeholder="smtp.gmail.com" />
          </Field>
          <Field label="Port">
            <input className="input w-full" type="number" value={config.smtp.port} onChange={(e) => { update('smtp', { port: parseInt(e.target.value) || 587 }); setVerified('smtp', false); }} />
          </Field>
          <Field label="Username">
            <input className="input w-full" value={config.smtp.user} onChange={(e) => { update('smtp', { user: e.target.value }); setVerified('smtp', false); }} placeholder="you@gmail.com" />
          </Field>
          <Field label="Password / App Password">
            <input className="input w-full" type="password" value={config.smtp.pass} onChange={(e) => { update('smtp', { pass: e.target.value }); setVerified('smtp', false); }} />
          </Field>
        </div>
        <Field label="From address" hint="Defaults to username">
          <input className="input w-full" value={config.smtp.from} onChange={(e) => update('smtp', { from: e.target.value })} placeholder="(optional)" />
        </Field>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={testSmtp} disabled={testingSmtp || !config.smtp.host} className="btn-secondary">
            {testingSmtp ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Test SMTP Connection
          </button>
          {config.verified?.smtp && <VerifiedBadge text="SMTP connection verified" />}
        </div>
      </Section>

      <Section
        icon={<MessageCircle size={15} />}
        title="WhatsApp via Twilio (optional)"
        verified={config.verified?.twilio}
        info={<InfoTooltip title={SETUP_STEPS.twilio.title} steps={SETUP_STEPS.twilio.steps} />}
      >
        <Field label="Account SID">
          <input className="input w-full" value={config.twilio.accountSid} onChange={(e) => { update('twilio', { accountSid: e.target.value }); setVerified('twilio', false); }} placeholder="AC..." />
        </Field>
        <Field label="Auth Token">
          <input type="password" className="input w-full" value={config.twilio.authToken} onChange={(e) => { update('twilio', { authToken: e.target.value }); setVerified('twilio', false); }} />
        </Field>
        <Field label="From WhatsApp number" hint="Sandbox default: +14155238886">
          <input className="input w-full" value={config.twilio.from} onChange={(e) => update('twilio', { from: e.target.value })} placeholder="+14155238886" />
        </Field>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={testTwilio} disabled={testingTwilio || !config.twilio.accountSid} className="btn-secondary">
            {testingTwilio ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
            Test Twilio Credentials
          </button>
          {config.verified?.twilio && <VerifiedBadge text="Twilio account verified" />}
        </div>
      </Section>

      <Section icon={<SearchIcon size={15} />} title="Web Search (optional)">
        <p className="text-[12px] text-text-secondary -mt-1 mb-2">
          Add a search API key for the Web Search node. Without one, Anthropic's built-in search is used as a fallback.
        </p>
        <Field
          label="Tavily API Key"
          info={<InfoTooltip title={SETUP_STEPS.tavily.title} steps={SETUP_STEPS.tavily.steps} />}
          hint={<ExtLink href="https://app.tavily.com/" showIcon>Get one, 1,000 free/month</ExtLink>}
        >
          <input type="password" className="input w-full" value={config.search.tavilyKey} onChange={(e) => update('search', { tavilyKey: e.target.value })} placeholder="tvly-..." />
        </Field>
        <Field
          label="Brave Search API Key"
          info={<InfoTooltip title={SETUP_STEPS.brave.title} steps={SETUP_STEPS.brave.steps} />}
          hint={<>Alternative, <ExtLink href="https://api.search.brave.com/app/keys" showIcon>get one</ExtLink></>}
        >
          <input type="password" className="input w-full" value={config.search.braveKey} onChange={(e) => update('search', { braveKey: e.target.value })} placeholder="BSA..." />
        </Field>
      </Section>

      <Section icon={<Clock size={15} />} title="Scheduling & Background Running">
        <div className="p-3 mb-1 rounded-win bg-brand-subtle dark:bg-brand-subtle-dark border border-brand/20 text-[12px] text-text-secondary dark:text-text-secondary-dark leading-relaxed">
          <strong className="text-text-primary dark:text-text-primary-dark">How scheduling works:</strong> For scheduled agents to run, Bodhaka Dispatcher must be running, either open, or minimized in the system tray. Turn on "Launch on startup" below so it's always ready whenever your PC is on. If it wasn't running at the scheduled time, it'll catch up when you next open it.
        </div>
        <p className="text-[12px] text-text-secondary -mt-1 mb-2">
          These settings help it stay running and catch up on anything missed while your PC was off.
        </p>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={config.scheduling?.launchOnStartup || false}
            onChange={(e) => update('scheduling', { launchOnStartup: e.target.checked } as any)}
            className="mt-0.5"
          />
          <span className="text-[12px] leading-relaxed">
            <strong>Launch on startup</strong>, open automatically (minimized to the system tray) when you turn on your PC, so scheduled agents are always armed.
          </span>
        </label>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={config.scheduling?.minimizeToTray !== false}
            onChange={(e) => update('scheduling', { minimizeToTray: e.target.checked } as any)}
            className="mt-0.5"
          />
          <span className="text-[12px] leading-relaxed">
            <strong>Keep running in the tray when I close the window</strong>, closing the window hides it to the tray instead of quitting. (Quit anytime from the tray icon.)
          </span>
        </label>

        <Field label="When my PC turns on and agents were missed">
          <select
            className="input w-full"
            value={config.scheduling?.catchUpMode || 'ask'}
            onChange={(e) => update('scheduling', { catchUpMode: e.target.value } as any)}
          >
            <option value="ask">Ask me, show missed agents with Run / Dismiss options</option>
            <option value="auto">Run them automatically</option>
          </select>
        </Field>

        <Field label="How many missed runs to catch up">
          <select
            className="input w-full"
            value={config.scheduling?.missedPolicy || 'recent'}
            onChange={(e) => update('scheduling', { missedPolicy: e.target.value } as any)}
          >
            <option value="recent">Just once, only the most recent missed run (recommended)</option>
            <option value="all">All missed runs (up to 5), e.g. catch every missed quiz</option>
            <option value="skip">Skip missed runs, only run on schedule going forward</option>
          </select>
          <p className="hint">
            "Just once" means if your PC was off for 3 days, you get <strong>one</strong> fresh morning boost when you return, not three stale ones piled up.
          </p>
        </Field>

        <div className="p-3 rounded-win bg-bg-hover dark:bg-bg-dark-subtle text-[11px] text-text-secondary dark:text-text-secondary-dark">
          <AlertTriangle size={12} className="inline mr-1 text-warning" />
          Honest note: no app can run while your PC is fully <strong>off</strong>. Scheduled agents fire only when your PC is on. If your PC was off at the scheduled time, Bodhaka Dispatcher catches up the next time you turn it on. For guaranteed on-time delivery even when your PC is off, a cloud version would be needed.
        </div>
      </Section>

      <Section icon={<FileText size={15} />} title="Troubleshooting">
        <p className="text-[12px] text-text-secondary -mt-1 mb-2">
          If the app misbehaves or closes unexpectedly, the log files help find out why. Open the folder and share the most recent <span className="font-mono">main.log</span> so the issue can be fixed.
        </p>
        <button onClick={() => window.api.shell.openLogs()} className="btn-secondary w-fit">
          <FileText size={14} /> Open logs folder
        </button>
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

function ContactVerification({
  config, setConfig, toast,
}: {
  config: ConfigShape;
  setConfig: React.Dispatch<React.SetStateAction<ConfigShape | null>>;
  toast: ReturnType<typeof useToast>;
}) {
  const [emailDraft, setEmailDraft] = useState(config.contact.email || '');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState(config.contact.whatsapp || '');

  const emailLocked = config.contact.emailLocked && config.contact.emailVerified;
  const phoneCount = config.contact.phoneChangeCount || 0;
  const phoneLocked = config.contact.phoneLocked || phoneCount >= 3;
  const phoneChangesLeft = Math.max(0, 3 - phoneCount);

  function patchContact(patch: Record<string, any>) {
    setConfig((prev) => prev ? { ...prev, contact: { ...prev.contact, ...patch } } : prev);
  }

  async function sendOtp() {
    if (!config.smtp?.host) {
      toast.show('Set up and test your SMTP (email sending) first, the code is sent via your own email.', 'error');
      return;
    }
    setSending(true);
    // Persist current SMTP so the OTP service can use it
    await window.api.config.update({ smtp: config.smtp });
    const res = await window.api.config.sendEmailOtp(emailDraft);
    setSending(false);
    if (res.ok) {
      setOtpSent(true);
      toast.show('Verification code sent to your email', 'success');
    } else {
      toast.show(res.error || 'Failed to send code', 'error');
    }
  }

  async function verifyOtp() {
    setVerifying(true);
    const res = await window.api.config.verifyEmailOtp(emailDraft, otpCode);
    setVerifying(false);
    if (res.ok) {
      patchContact({ email: emailDraft, emailVerified: true, emailLocked: true });
      setOtpSent(false);
      setOtpCode('');
      toast.show('Email verified and locked', 'success');
    } else {
      toast.show(res.error || 'Verification failed', 'error');
    }
  }

  async function changeEmail() {
    await window.api.config.unlockEmail();
    patchContact({ emailVerified: false, emailLocked: false });
    setOtpSent(false);
    toast.show('Email unlocked. Verify the new address to lock it again.', 'info');
  }

  function savePhone() {
    if (phoneLocked) return;
    const newCount = phoneCount + 1;
    const willLock = newCount >= 3;
    patchContact({ whatsapp: phoneDraft, phoneChangeCount: newCount, phoneLocked: willLock });
    // Persist immediately so the counter survives
    window.api.config.update({
      contact: { ...config.contact, whatsapp: phoneDraft, phoneChangeCount: newCount, phoneLocked: willLock },
    });
    if (willLock) {
      toast.show('Phone number is now permanently locked.', 'info');
    } else {
      toast.show(`Phone saved. ${3 - newCount} change(s) remaining.`, 'success');
    }
  }

  return (
    <div className="space-y-4">
      {/* EMAIL */}
      <div>
        <label className="label">Email address</label>
        {emailLocked ? (
          <div className="flex items-center gap-2">
            <div className="input w-full flex items-center justify-between bg-bg-hover dark:bg-bg-dark-subtle">
              <span>{config.contact.email}</span>
              <VerifiedBadge text="Verified" />
            </div>
            <button onClick={changeEmail} className="btn-secondary whitespace-nowrap">Change</button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                className="input flex-1" type="email" value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                placeholder="you@example.com"
                disabled={otpSent}
              />
              {!otpSent ? (
                <button onClick={sendOtp} disabled={sending || !emailDraft} className="btn-primary whitespace-nowrap">
                  {sending ? <Loader2 size={14} className="animate-spin" /> : 'Send code'}
                </button>
              ) : (
                <button onClick={() => { setOtpSent(false); setOtpCode(''); }} className="btn-secondary">Cancel</button>
              )}
            </div>
            {otpSent && (
              <div className="flex gap-2">
                <input
                  className="input flex-1 font-mono tracking-widest" value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
                <button onClick={verifyOtp} disabled={verifying || otpCode.length !== 6} className="btn-primary whitespace-nowrap">
                  {verifying ? <Loader2 size={14} className="animate-spin" /> : 'Verify'}
                </button>
              </div>
            )}
            <p className="hint">
              We email a 6-digit code to confirm this address is yours. The code is sent via your own SMTP, so set up Email Sending below first.
            </p>
          </div>
        )}
      </div>

      {/* PHONE */}
      <div>
        <label className="label">WhatsApp number</label>
        {phoneLocked ? (
          <div className="input w-full flex items-center justify-between bg-bg-hover dark:bg-bg-dark-subtle">
            <span>{config.contact.whatsapp || '(not set)'}</span>
            <span className="inline-flex items-center gap-1 text-[12px] text-text-tertiary">
              <Check size={12} /> Locked
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                className="input flex-1" value={phoneDraft}
                onChange={(e) => setPhoneDraft(e.target.value)}
                placeholder="+91 98765 43210"
              />
              <button onClick={savePhone} disabled={!phoneDraft || phoneDraft === config.contact.whatsapp} className="btn-secondary whitespace-nowrap">
                Save number
              </button>
            </div>
            {phoneCount >= 1 && phoneChangesLeft <= 2 && (
              <div className="p-2.5 rounded-win bg-warning/10 border border-warning/30 text-[11px] text-text-secondary dark:text-text-secondary-dark">
                <AlertTriangle size={12} className="inline mr-1 text-warning" />
                This is a personal-use-only app, so frequent phone number changes aren't allowed. You have{' '}
                <strong>{phoneChangesLeft} change{phoneChangesLeft !== 1 ? 's' : ''} remaining</strong>, after which the last number you enter becomes permanently fixed and cannot be edited.
              </div>
            )}
            <p className="hint">Include country code. Used as the only WhatsApp recipient for your agents.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  icon, title, verified, info, children,
}: {
  icon: React.ReactNode; title: string; verified?: boolean;
  info?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-win bg-bg-hover dark:bg-bg-dark-subtle flex items-center justify-center text-text-secondary">{icon}</div>
        <h2 className="font-semibold text-sm flex-1 flex items-center gap-1.5">
          {title}
          {info}
        </h2>
        {verified && (
          <span className="chip-success">
            <Check size={11} /> Verified
          </span>
        )}
      </div>
      <div className="space-y-3.5">{children}</div>
    </section>
  );
}

function Field({
  label, hint, info, children,
}: {
  label: string; hint?: React.ReactNode; info?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">
        {label}
        {info}
      </label>
      {children}
      {hint && <div className="mt-1 text-[11px] text-text-tertiary">{hint}</div>}
    </div>
  );
}

function VerifiedBadge({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-[12px] text-success font-medium">
      <div className="w-4 h-4 rounded-full bg-success flex items-center justify-center">
        <Check size={11} className="text-white" strokeWidth={3} />
      </div>
      {text}
    </div>
  );
}
