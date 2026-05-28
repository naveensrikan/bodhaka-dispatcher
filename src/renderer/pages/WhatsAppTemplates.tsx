import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageCircle, RefreshCw, Loader2, CheckCircle2, Clock, AlertTriangle,
  XCircle, Zap, Settings as SettingsIcon, Info, Plus, Trash2,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { ExtLink } from '../components/ExtLink';
import type { WhatsAppTemplateState } from '../types/api';

export function WhatsAppTemplates() {
  const [templates, setTemplates] = useState<WhatsAppTemplateState[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [provisioningOne, setProvisioningOne] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [twilioConfigured, setTwilioConfigured] = useState(true);
  const [twilioVerified, setTwilioVerified] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const toast = useToast();

  async function refresh() {
    const result: any = await window.api.whatsapp.listTemplates();
    if (result?.error) {
      setTwilioConfigured(false);
    } else if (Array.isArray(result)) {
      setTemplates(result);
      setTwilioConfigured(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    window.api.config.get().then((c) => {
      setTwilioVerified(!!c.verified?.twilio);
    });
    refresh();
  }, []);

  async function provisionAll() {
    setProvisioning(true);
    toast.show('Provisioning templates on your Twilio account...', 'info');
    const result: any = await window.api.whatsapp.provisionTemplates();
    setProvisioning(false);

    if (result?.error) {
      toast.show(`Provisioning failed: ${result.error}`, 'error');
      return;
    }

    setTemplates(result.states || []);
    if (result.provisioned > 0) {
      toast.show(
        `Submitted ${result.provisioned} templates for Meta approval. ${result.skipped} already existed.`,
        'success'
      );
    } else if (result.skipped > 0) {
      toast.show(`All ${result.skipped} templates already exist`, 'info');
    }
    if (result.failed?.length > 0) {
      toast.show(`${result.failed.length} failed: ${result.failed[0].error}`, 'error');
    }
  }

  async function refreshStatus() {
    setRefreshing(true);
    const result: any = await window.api.whatsapp.refreshStatus();
    setRefreshing(false);
    if (result?.error) {
      toast.show(`Refresh failed: ${result.error}`, 'error');
    } else if (Array.isArray(result)) {
      setTemplates(result);
      toast.show('Status refreshed', 'success');
    }
  }

  async function provisionOne(name: string, displayName: string) {
    setProvisioningOne(name);
    const result: any = await window.api.whatsapp.provisionOne(name);
    setProvisioningOne(null);
    if (result?.ok) {
      toast.show(`"${displayName}" submitted for approval`, 'success');
      await refresh();
    } else {
      toast.show(`Failed: ${result?.error || 'unknown'}`, 'error');
    }
  }

  const totals = {
    approved: templates.filter((t) => t.approvalStatus === 'approved').length,
    pending: templates.filter((t) => ['received', 'pending'].includes(t.approvalStatus)).length,
    rejected: templates.filter((t) => t.approvalStatus === 'rejected').length,
    notProvisioned: templates.filter((t) => t.approvalStatus === 'not_provisioned').length,
  };

  if (loading) {
    return (
      <div className="p-8 text-text-tertiary text-sm">
        <Loader2 className="animate-spin inline mr-2" size={16} />
        Loading templates...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle size={20} className="text-brand" />
          <h1 className="text-2xl font-semibold tracking-tight">WhatsApp Templates</h1>
        </div>
        <p className="text-text-secondary dark:text-text-secondary-dark text-[13px]">
          Provision and manage your WhatsApp Business message templates. These let your agents send messages outside Twilio's 24-hour window.
        </p>
      </header>

      {/* Twilio not configured */}
      {!twilioConfigured && (
        <div className="card p-6 mb-6 border-warning/40">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Twilio not configured</h3>
              <p className="text-[13px] text-text-secondary dark:text-text-secondary-dark mb-3">
                Connect your Twilio account first in Settings before provisioning templates.
              </p>
              <Link to="/configuration" className="btn-primary">
                <SettingsIcon size={13} /> Go to Settings
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Production account warning */}
      {twilioConfigured && !twilioVerified && (
        <div className="card p-5 mb-6 border-warning/40">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
            <div className="flex-1 text-[13px]">
              <p className="font-medium mb-1">Test your Twilio credentials first</p>
              <p className="text-text-secondary dark:text-text-secondary-dark mb-2">
                Go to Settings → WhatsApp → Test Twilio Credentials, and confirm the green "Verified" tick before provisioning.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Important info card */}
      {twilioConfigured && (
        <div className="card p-5 mb-6">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-brand shrink-0 mt-0.5" />
            <div className="text-[12px] space-y-2 text-text-secondary dark:text-text-secondary-dark">
              <p className="font-medium text-text-primary dark:text-text-primary-dark">How this works:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Click <strong>Provision templates</strong>. Bodhaka Forge creates all 8 templates on <strong>your</strong> Twilio account.</li>
                <li>Each template is submitted to Meta for approval. Most are approved within minutes.</li>
                <li>Click <strong>Refresh status</strong> to check approval progress.</li>
                <li>Once a template shows ✓ Approved, your agents can use it in the WhatsApp Send node.</li>
              </ol>
              <p className="mt-2">
                <strong>Note:</strong> Requires a paid Twilio account with a registered WhatsApp Business Sender (not the sandbox).
                See <ExtLink href="https://www.twilio.com/docs/whatsapp/api/send-whatsapp-templated-messages" showIcon>Twilio docs</ExtLink>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      {twilioConfigured && templates.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard icon={<CheckCircle2 size={15} />} label="Approved" value={totals.approved} color="success" />
          <StatCard icon={<Clock size={15} />} label="Pending" value={totals.pending} color="warning" />
          <StatCard icon={<XCircle size={15} />} label="Rejected" value={totals.rejected} color="danger" />
          <StatCard icon={<Zap size={15} />} label="Not provisioned" value={totals.notProvisioned} color="muted" />
        </div>
      )}

      {/* Action buttons */}
      {twilioConfigured && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button onClick={provisionAll} disabled={provisioning} className="btn-primary">
            {provisioning ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {totals.notProvisioned > 0 ? `Provision all (${totals.notProvisioned})` : 'Provision missing'}
          </button>
          {totals.pending > 0 && (
            <button onClick={refreshStatus} disabled={refreshing} className="btn-secondary">
              {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Refresh status
            </button>
          )}
          <button onClick={() => setShowCustomForm((s) => !s)} className="btn-secondary">
            <Plus size={14} /> Create custom template
          </button>
        </div>
      )}

      {/* Custom template form */}
      {twilioConfigured && showCustomForm && (
        <CustomTemplateForm
          onClose={() => setShowCustomForm(false)}
          onCreated={async () => { setShowCustomForm(false); await refresh(); }}
        />
      )}

      {/* Templates list */}
      {twilioConfigured && (
        <div className="space-y-2">
          {templates.map((t) => (
            <TemplateRow
              key={t.name}
              template={t}
              provisioningOne={provisioningOne}
              onProvision={() => provisionOne(t.name, t.displayName)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode; label: string; value: number; color: 'success' | 'warning' | 'danger' | 'muted';
}) {
  const colorClass = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    muted: 'text-text-tertiary',
  }[color];
  return (
    <div className="card p-3">
      <div className={`flex items-center gap-1.5 mb-2 ${colorClass}`}>
        {icon}
        <span className="text-[11px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function TemplateRow({
  template, provisioningOne, onProvision,
}: {
  template: WhatsAppTemplateState;
  provisioningOne: string | null;
  onProvision: () => void;
}) {
  const statusInfo = {
    approved: { icon: CheckCircle2, color: 'text-success', label: 'Approved', bg: 'bg-success/10 border-success/30' },
    pending: { icon: Clock, color: 'text-warning', label: 'Pending approval', bg: 'bg-warning/10 border-warning/30' },
    received: { icon: Clock, color: 'text-warning', label: 'Submitted to Meta', bg: 'bg-warning/10 border-warning/30' },
    rejected: { icon: XCircle, color: 'text-danger', label: 'Rejected', bg: 'bg-danger/10 border-danger/30' },
    unsubmitted: { icon: AlertTriangle, color: 'text-warning', label: 'Needs resubmission', bg: 'bg-warning/10 border-warning/30' },
    not_provisioned: { icon: Zap, color: 'text-text-tertiary', label: 'Not provisioned', bg: '' },
  }[template.approvalStatus];

  const StatusIcon = statusInfo.icon;
  const canProvision = template.approvalStatus === 'not_provisioned' || template.approvalStatus === 'unsubmitted';

  return (
    <div className="card p-4">
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 rounded-win bg-brand-subtle dark:bg-brand-subtle-dark flex items-center justify-center text-brand shrink-0">
          <MessageCircle size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-[14px]">{template.displayName}</span>
            <span className="chip">{template.category}</span>
            {template.builtin === false && <span className="chip-gold">Custom</span>}
          </div>
          <p className="text-[12px] text-text-secondary dark:text-text-secondary-dark mb-2">
            {template.description}
          </p>
          {template.contentSid && (
            <div className="text-[10px] font-mono text-text-tertiary">SID: {template.contentSid}</div>
          )}
          {template.rejectionReason && (
            <div className={`mt-2 p-2 rounded ${statusInfo.bg} text-[11px]`}>
              <strong>Rejection reason:</strong> {template.rejectionReason}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${statusInfo.color} ${statusInfo.bg} border`}>
            <StatusIcon size={11} />
            {statusInfo.label}
          </div>
          {canProvision && (
            <button
              onClick={onProvision}
              disabled={provisioningOne === template.name}
              className="btn-secondary text-[11px] py-1"
            >
              {provisioningOne === template.name ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
              Provision
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomTemplateForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Count variables in body
  const varMatches = body.match(/\{\{(\d+)\}\}/g) || [];
  const uniqueVars = [...new Set(varMatches)];

  // Live validation
  const trimmed = body.trim();
  let validationError = '';
  if (trimmed && /^\{\{/.test(trimmed)) validationError = 'Body cannot start with a variable — add text before {{1}}.';
  else if (trimmed && /\}\}$/.test(trimmed)) validationError = 'Body cannot end with a variable — add text after the last variable.';
  else if (trimmed.length > 1024) validationError = 'Body exceeds 1024 characters.';

  async function save() {
    if (!displayName.trim() || !body.trim()) {
      toast.show('Name and body are required', 'error');
      return;
    }
    if (validationError) {
      toast.show(validationError, 'error');
      return;
    }
    setSaving(true);
    const name = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
    const variableSamples: Record<string, string> = {};
    const variableLabels: string[] = [];
    uniqueVars.forEach((v, i) => {
      const num = v.replace(/[{}]/g, '');
      variableSamples[num] = `Sample ${i + 1}`;
      variableLabels.push(`Variable ${num}`);
    });
    const spec = {
      name: `custom_${name}`,
      displayName: displayName.trim(),
      description: description.trim() || 'Custom template',
      category: 'UTILITY',
      contentType: 'twilio/text',
      language: 'en',
      body: body.trim(),
      variableSamples,
      variableLabels,
      builtin: false,
    };
    const result: any = await window.api.whatsapp.saveCustom(spec);
    setSaving(false);
    if (result?.ok) {
      toast.show('Custom template created. Now provision it.', 'success');
      onCreated();
    } else {
      toast.show(`Failed: ${result?.error || 'unknown'}`, 'error');
    }
  }

  return (
    <div className="card p-5 mb-5 border-brand/40">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Create a custom WhatsApp template</h3>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary text-[12px]">Cancel</button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="label">Display name</label>
          <input className="input w-full" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Exam Countdown" />
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input w-full" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this template is for" />
        </div>
        <div>
          <label className="label">Message body</label>
          <textarea
            className="input w-full min-h-[100px] resize-none font-mono text-[12px]"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={"Your exam is in {{1}} days. Focus area today: {{2}}. You can do it!"}
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] text-text-tertiary">
              {uniqueVars.length} variable{uniqueVars.length !== 1 ? 's' : ''} · {body.length}/1024 chars
            </span>
          </div>
          {validationError && (
            <div className="mt-1.5 text-[11px] text-danger flex items-center gap-1">
              <AlertTriangle size={11} /> {validationError}
            </div>
          )}
          <div className="mt-2 p-2.5 rounded-win bg-bg-hover dark:bg-bg-dark-subtle text-[11px] text-text-secondary">
            <strong>Rules:</strong> Use <code className="font-mono">{'{{1}}'}</code>, <code className="font-mono">{'{{2}}'}</code> for variables.
            Body must NOT start or end with a variable. Keep it factual (UTILITY category) to pass Meta approval.
          </div>
        </div>
        <button onClick={save} disabled={saving || !!validationError} className="btn-primary">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Create template
        </button>
      </div>
    </div>
  );
}
