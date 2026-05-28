import { getDb } from '../db/database';
import { WHATSAPP_TEMPLATES, findTemplateSpec, type WhatsAppTemplateSpec } from './whatsappTemplates';

/**
 * State of a template on the student's Twilio account.
 */
export interface TemplateState {
  name: string;
  displayName: string;
  description: string;
  category: string;
  contentSid: string | null;          // Twilio HX... SID once created
  approvalStatus: 'not_provisioned' | 'received' | 'pending' | 'approved' | 'rejected' | 'unsubmitted';
  rejectionReason: string | null;
  createdAt: number | null;
  updatedAt: number | null;
}

function loadTwilio() {
  const db = getDb();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get('twilio') as { value: string } | undefined;
  if (!row) throw new Error('Twilio not configured. Add credentials in Settings.');
  const cfg = JSON.parse(row.value);
  if (!cfg.accountSid || !cfg.authToken) throw new Error('Twilio credentials incomplete.');
  return cfg as { accountSid: string; authToken: string; from: string };
}

function basicAuth(sid: string, token: string): string {
  return 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');
}

/**
 * Initialize the wa_templates table for tracking per-account template state.
 * The composite primary key (account_sid, template_name) means each Twilio
 * account has its own row per template — supports a user switching Twilio accounts.
 */
export function initTemplateTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS wa_templates (
      account_sid TEXT NOT NULL,
      template_name TEXT NOT NULL,
      content_sid TEXT,
      approval_status TEXT NOT NULL DEFAULT 'not_provisioned',
      rejection_reason TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      PRIMARY KEY (account_sid, template_name)
    );
  `);
}

/**
 * Get current state of all 8 Bodhaka templates for the current Twilio account.
 * Templates that haven't been provisioned yet show as 'not_provisioned'.
 */
export function getTemplateStates(): TemplateState[] {
  const cfg = loadTwilio();
  const db = getDb();
  const rows = db.prepare('SELECT * FROM wa_templates WHERE account_sid = ?').all(cfg.accountSid) as any[];
  const byName = new Map(rows.map((r) => [r.template_name, r]));

  return WHATSAPP_TEMPLATES.map((spec) => {
    const row = byName.get(spec.name);
    return {
      name: spec.name,
      displayName: spec.displayName,
      description: spec.description,
      category: spec.category,
      contentSid: row?.content_sid || null,
      approvalStatus: (row?.approval_status as any) || 'not_provisioned',
      rejectionReason: row?.rejection_reason || null,
      createdAt: row?.created_at || null,
      updatedAt: row?.updated_at || null,
    };
  });
}

/**
 * Create a single template on the student's Twilio account via Content API,
 * then submit it for WhatsApp approval.
 */
async function provisionOne(spec: WhatsAppTemplateSpec, cfg: { accountSid: string; authToken: string }): Promise<{
  contentSid: string;
  approvalStatus: string;
}> {
  const auth = basicAuth(cfg.accountSid, cfg.authToken);

  // Step 1: Create the Content Template
  const createBody = {
    friendly_name: spec.name,
    language: spec.language,
    variables: spec.variableSamples,
    types: {
      [spec.contentType]: { body: spec.body },
    },
  };

  const createRes = await fetch('https://content.twilio.com/v1/Content', {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(createBody),
  });

  if (!createRes.ok) {
    const err: any = await createRes.json().catch(() => ({}));
    throw new Error(err.message || `Content create failed: HTTP ${createRes.status}`);
  }

  const created: any = await createRes.json();
  const contentSid = created.sid;

  // Step 2: Submit for WhatsApp approval
  const approvalRes = await fetch(`https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests/whatsapp`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: spec.name,
      category: spec.category,
    }),
  });

  let approvalStatus = 'received';
  if (approvalRes.ok) {
    const approval: any = await approvalRes.json();
    approvalStatus = approval.status || 'received';
  } else {
    // Approval submission failed but content was created — let the user retry
    const err: any = await approvalRes.json().catch(() => ({}));
    console.error(`Approval submission failed for ${spec.name}:`, err);
    approvalStatus = 'unsubmitted';
  }

  return { contentSid, approvalStatus };
}

/**
 * Provision all 8 templates. Skips templates that are already provisioned.
 * Returns updated state for all 8.
 */
export async function provisionAllTemplates(): Promise<{
  provisioned: number;
  skipped: number;
  failed: { name: string; error: string }[];
  states: TemplateState[];
}> {
  initTemplateTable();
  const cfg = loadTwilio();
  const db = getDb();
  const now = Date.now();

  const existingRows = db.prepare('SELECT template_name, content_sid FROM wa_templates WHERE account_sid = ?').all(cfg.accountSid) as { template_name: string; content_sid: string }[];
  const existing = new Set(existingRows.filter((r) => r.content_sid).map((r) => r.template_name));

  let provisioned = 0;
  let skipped = 0;
  const failed: { name: string; error: string }[] = [];

  for (const spec of WHATSAPP_TEMPLATES) {
    if (existing.has(spec.name)) {
      skipped++;
      continue;
    }
    try {
      const result = await provisionOne(spec, cfg);
      db.prepare(`
        INSERT INTO wa_templates (account_sid, template_name, content_sid, approval_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(account_sid, template_name) DO UPDATE SET
          content_sid = excluded.content_sid,
          approval_status = excluded.approval_status,
          updated_at = excluded.updated_at
      `).run(cfg.accountSid, spec.name, result.contentSid, result.approvalStatus, now, now);
      provisioned++;
    } catch (err: any) {
      failed.push({ name: spec.displayName, error: err.message });
    }
  }

  return { provisioned, skipped, failed, states: getTemplateStates() };
}

/**
 * Refresh approval status for all provisioned templates by querying Twilio.
 */
export async function refreshApprovalStatuses(): Promise<TemplateState[]> {
  initTemplateTable();
  const cfg = loadTwilio();
  const db = getDb();
  const auth = basicAuth(cfg.accountSid, cfg.authToken);

  const rows = db.prepare(
    `SELECT template_name, content_sid FROM wa_templates WHERE account_sid = ? AND content_sid IS NOT NULL`
  ).all(cfg.accountSid) as { template_name: string; content_sid: string }[];

  for (const row of rows) {
    try {
      const res = await fetch(`https://content.twilio.com/v1/Content/${row.content_sid}/ApprovalRequests`, {
        headers: { Authorization: auth },
      });
      if (!res.ok) continue;
      const data: any = await res.json();
      const wa = data.whatsapp;
      if (wa) {
        db.prepare(
          `UPDATE wa_templates SET approval_status = ?, rejection_reason = ?, updated_at = ? WHERE account_sid = ? AND template_name = ?`
        ).run(
          wa.status || 'pending',
          wa.rejection_reason || null,
          Date.now(),
          cfg.accountSid,
          row.template_name
        );
      }
    } catch (err) {
      console.error('Refresh failed for', row.template_name, err);
    }
  }

  return getTemplateStates();
}

/**
 * Look up the Content SID for a template by name (for the current Twilio account).
 * Returns null if not provisioned or not approved.
 */
export function getApprovedContentSid(templateName: string): string | null {
  const cfg = loadTwilio();
  const db = getDb();
  const row = db.prepare(
    `SELECT content_sid, approval_status FROM wa_templates WHERE account_sid = ? AND template_name = ?`
  ).get(cfg.accountSid, templateName) as { content_sid: string; approval_status: string } | undefined;

  if (!row) return null;
  if (row.approval_status !== 'approved') return null;
  return row.content_sid;
}

/**
 * Send a WhatsApp message using a Content Template SID.
 */
export async function sendTemplatedWhatsApp(
  templateName: string,
  to: string,
  variables: Record<string, string>
): Promise<{ sent: boolean; sid?: string; error?: string }> {
  const cfg = loadTwilio();
  const spec = findTemplateSpec(templateName);
  if (!spec) return { sent: false, error: `Unknown template: ${templateName}` };

  const contentSid = getApprovedContentSid(templateName);
  if (!contentSid) {
    return { sent: false, error: `Template "${spec.displayName}" is not yet approved. Check the WhatsApp Templates page.` };
  }

  // Truncate each variable to 800 chars to stay under template body limit (1024 total)
  const safeVars: Record<string, string> = {};
  for (const [k, v] of Object.entries(variables)) {
    safeVars[k] = (v || '').slice(0, 800);
  }

  const fromAddr = cfg.from.startsWith('whatsapp:') ? cfg.from : `whatsapp:${cfg.from.replace(/\s/g, '')}`;
  const toAddr = to.startsWith('whatsapp:') ? to : `whatsapp:${to.replace(/\s/g, '')}`;

  const params = new URLSearchParams({
    From: fromAddr,
    To: toAddr,
    ContentSid: contentSid,
    ContentVariables: JSON.stringify(safeVars),
  });

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: basicAuth(cfg.accountSid, cfg.authToken),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const json: any = await res.json();
    if (!res.ok) return { sent: false, error: json.message || `HTTP ${res.status}` };
    return { sent: true, sid: json.sid };
  } catch (err: any) {
    return { sent: false, error: err.message };
  }
}
