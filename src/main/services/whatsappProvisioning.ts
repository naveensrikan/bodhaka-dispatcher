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
  builtin?: boolean;
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
 * Provision a single template by name. Used for the "provision individual" feature.
 */
export async function provisionSingleTemplate(templateName: string): Promise<{
  ok: boolean;
  state?: TemplateState;
  error?: string;
}> {
  initTemplateTable();
  const cfg = loadTwilio();
  const db = getDb();
  const now = Date.now();

  // Find spec — either builtin or a user-created custom one stored in DB
  let spec = findTemplateSpec(templateName);
  if (!spec) {
    const customRow = db.prepare('SELECT spec FROM wa_custom_templates WHERE name = ?').get(templateName) as { spec: string } | undefined;
    if (customRow) spec = JSON.parse(customRow.spec);
  }
  if (!spec) return { ok: false, error: 'Template spec not found' };

  try {
    const result = await provisionOne(spec, cfg);
    db.prepare(`
      INSERT INTO wa_templates (account_sid, template_name, content_sid, approval_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_sid, template_name) DO UPDATE SET
        content_sid = excluded.content_sid, approval_status = excluded.approval_status, updated_at = excluded.updated_at
    `).run(cfg.accountSid, spec.name, result.contentSid, result.approvalStatus, now, now);
    const states = getTemplateStates();
    return { ok: true, state: states.find((s) => s.name === templateName) };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Initialize the custom templates table.
 */
export function initCustomTemplateTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS wa_custom_templates (
      name TEXT PRIMARY KEY,
      spec TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
}

/**
 * Save a user-created custom template spec (does not provision it yet).
 */
export function saveCustomTemplate(spec: WhatsAppTemplateSpec): { ok: boolean; error?: string } {
  initCustomTemplateTable();
  const { validateTemplateBody } = require('./whatsappTemplates');
  const err = validateTemplateBody(spec.body);
  if (err) return { ok: false, error: err };

  const db = getDb();
  // Normalize name to lowercase alphanumeric+underscore
  spec.name = spec.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (findTemplateSpec(spec.name)) return { ok: false, error: 'A built-in template already uses this name' };

  db.prepare('INSERT OR REPLACE INTO wa_custom_templates (name, spec, created_at) VALUES (?, ?, ?)')
    .run(spec.name, JSON.stringify({ ...spec, builtin: false, category: 'UTILITY', contentType: 'twilio/text', language: spec.language || 'en' }), Date.now());
  return { ok: true };
}

export function listCustomTemplates(): WhatsAppTemplateSpec[] {
  initCustomTemplateTable();
  const db = getDb();
  const rows = db.prepare('SELECT spec FROM wa_custom_templates ORDER BY created_at DESC').all() as { spec: string }[];
  return rows.map((r) => JSON.parse(r.spec));
}

export function deleteCustomTemplate(name: string): void {
  const db = getDb();
  db.prepare('DELETE FROM wa_custom_templates WHERE name = ?').run(name);
}

/**
 * Get current state of all 8 Bodhaka templates for the current Twilio account.
 * Templates that haven't been provisioned yet show as 'not_provisioned'.
 */
export function getTemplateStates(): TemplateState[] {
  const cfg = loadTwilio();
  const db = getDb();
  initCustomTemplateTable();
  const rows = db.prepare('SELECT * FROM wa_templates WHERE account_sid = ?').all(cfg.accountSid) as any[];
  const byName = new Map(rows.map((r) => [r.template_name, r]));

  const custom = listCustomTemplates();
  const allSpecs = [...WHATSAPP_TEMPLATES, ...custom];

  return allSpecs.map((spec) => {
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
      builtin: (spec as any).builtin !== false,
    };
  });
}

/**
/**
 * Fetch ALL existing Content templates from the Twilio account (paginated).
 * Returns a map of friendly_name -> { sid, body, language, variables }.
 * Used to avoid creating duplicates and to import templates created earlier.
 */
async function fetchTwilioContents(cfg: { accountSid: string; authToken: string }): Promise<
  Array<{ sid: string; friendlyName: string; language: string; body: string; variables: Record<string, string>; contentType: string }>
> {
  const auth = basicAuth(cfg.accountSid, cfg.authToken);
  const out: Array<{ sid: string; friendlyName: string; language: string; body: string; variables: Record<string, string>; contentType: string }> = [];
  let url: string | null = 'https://content.twilio.com/v1/Content?PageSize=50';

  // Follow pagination via meta.next_page_url
  let guard = 0;
  while (url && guard < 20) {
    guard++;
    const res: Response = await fetch(url, { headers: { Authorization: auth } });
    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to list templates: HTTP ${res.status}`);
    }
    const data: any = await res.json();
    const contents: any[] = data.contents || [];
    for (const c of contents) {
      // types is an object keyed by content type (e.g. "twilio/text")
      const typeKeys = c.types ? Object.keys(c.types) : [];
      const contentType = typeKeys[0] || 'twilio/text';
      const body = (c.types && c.types[contentType] && c.types[contentType].body) || '';
      out.push({
        sid: c.sid,
        friendlyName: c.friendly_name || '',
        language: c.language || 'en',
        body,
        variables: c.variables || {},
        contentType,
      });
    }
    url = data.meta && data.meta.next_page_url ? data.meta.next_page_url : null;
  }
  return out;
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

  // Guard against duplicates: if a Content template with the same friendly_name
  // already exists on this Twilio account, reuse it instead of creating another.
  try {
    const existing = await fetchTwilioContents(cfg);
    const match = existing.find((c) => c.friendlyName === spec.name);
    if (match) {
      // Already exists on Twilio — reuse its SID. Check approval status.
      let approvalStatus = 'received';
      try {
        const apRes = await fetch(`https://content.twilio.com/v1/Content/${match.sid}/ApprovalRequests`, {
          headers: { Authorization: auth },
        });
        if (apRes.ok) {
          const ap: any = await apRes.json();
          approvalStatus = ap?.whatsapp?.status || ap?.status || 'received';
        }
      } catch { /* ignore, keep default */ }
      return { contentSid: match.sid, approvalStatus };
    }
  } catch (e) {
    // If the lookup fails (network etc.), fall through to normal creation.
    console.error('Duplicate-check lookup failed, proceeding to create:', e);
  }

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

  const allSpecs = [...WHATSAPP_TEMPLATES, ...listCustomTemplates()];
  for (const spec of allSpecs) {
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

  // Twilio's ContentVariables must be a JSON object whose keys are the numeric
  // placeholders the template declares ("1", "2", ...). If keys are missing or
  // mismatched, Twilio returns "The Content Variables parameter is invalid".
  // So we build the map strictly from the template's declared variables.
  const declared = Object.keys(spec.variableSamples || {});
  const safeVars: Record<string, string> = {};

  if (declared.length > 0) {
    // Fill each declared placeholder. Prefer a provided value (by numeric key),
    // fall back to the template's sample, then to a single space (Twilio rejects
    // empty strings for a declared variable).
    for (const key of declared) {
      const provided = variables[key];
      const sample = spec.variableSamples[key];
      let val = (provided != null && provided !== '') ? provided : (sample || ' ');
      safeVars[key] = String(val).slice(0, 800);
    }
  } else {
    // Template declares no variables — send an empty object (valid for Twilio).
    // Do NOT inject a "1" here, that would be invalid for a no-variable template.
  }

  const fromAddr = cfg.from.startsWith('whatsapp:') ? cfg.from : `whatsapp:${cfg.from.replace(/\s/g, '')}`;
  const toAddr = to.startsWith('whatsapp:') ? to : `whatsapp:${to.replace(/\s/g, '')}`;

  const params = new URLSearchParams({
    From: fromAddr,
    To: toAddr,
    ContentSid: contentSid,
  });
  // Only include ContentVariables when there are variables to send
  if (Object.keys(safeVars).length > 0) {
    params.set('ContentVariables', JSON.stringify(safeVars));
  }

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

/**
 * Sync existing templates FROM the connected Twilio account into the app.
 *
 * Solves the duplicate problem: if you have provisioned templates on this
 * Twilio account before (in a previous install or session), this pulls them in
 * so the app knows they already exist and will not re-create them.
 *
 * For each Content template found on Twilio:
 *  - If its friendly_name matches a built-in Bodhaka template -> record its
 *    content_sid + approval status against that built-in (marks it provisioned).
 *  - If it matches an existing custom template -> same, updates its state.
 *  - If it matches nothing the app knows -> import it as a NEW custom template
 *    and record its state, so you can see and reuse it.
 *
 * Returns a summary so the UI can tell the user what happened.
 */
export async function syncFromTwilio(): Promise<{
  matchedBuiltin: number;
  matchedCustom: number;
  importedCustom: number;
  total: number;
  importedNames: string[];
}> {
  const cfg = loadTwilio();
  const db = getDb();
  initTemplateTable();
  initCustomTemplateTable();

  const existing = await fetchTwilioContents(cfg);

  const builtinNames = new Set(WHATSAPP_TEMPLATES.map((t) => t.name));
  const customNames = new Set(listCustomTemplates().map((t) => t.name));

  let matchedBuiltin = 0;
  let matchedCustom = 0;
  let importedCustom = 0;
  const importedNames: string[] = [];

  const auth = basicAuth(cfg.accountSid, cfg.authToken);

  for (const c of existing) {
    const name = c.friendlyName;
    if (!name) continue;

    // Determine approval status for this content (best effort)
    let approvalStatus = 'received';
    try {
      const apRes = await fetch(`https://content.twilio.com/v1/Content/${c.sid}/ApprovalRequests`, {
        headers: { Authorization: auth },
      });
      if (apRes.ok) {
        const ap: any = await apRes.json();
        approvalStatus = ap?.whatsapp?.status || ap?.status || 'received';
      }
    } catch { /* keep default */ }

    const isBuiltin = builtinNames.has(name);
    const isCustom = customNames.has(name);

    // If unknown to the app, import it as a custom template so it is reusable
    if (!isBuiltin && !isCustom) {
      // Rebuild variableSamples/labels from Twilio's variables map
      const variableSamples: Record<string, string> = c.variables || {};
      const variableLabels = Object.keys(variableSamples).map((k) => `Variable ${k}`);
      const spec: WhatsAppTemplateSpec = {
        name,
        displayName: name.replace(/_/g, ' '),
        description: 'Imported from your Twilio account',
        category: 'UTILITY',
        contentType: c.contentType || 'twilio/text',
        language: c.language || 'en',
        body: c.body || '',
        variableSamples,
        variableLabels,
        builtin: false,
      } as WhatsAppTemplateSpec;
      // Store directly (skip validation, since it already exists on Twilio)
      db.prepare('INSERT OR REPLACE INTO wa_custom_templates (name, spec, created_at) VALUES (?, ?, ?)')
        .run(name, JSON.stringify(spec), Date.now());
      importedCustom++;
      importedNames.push(name);
    } else if (isBuiltin) {
      matchedBuiltin++;
    } else {
      matchedCustom++;
    }

    // Record the per-account state so the app treats it as provisioned
    db.prepare(`
      INSERT INTO wa_templates (account_sid, template_name, content_sid, approval_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_sid, template_name) DO UPDATE SET
        content_sid = excluded.content_sid,
        approval_status = excluded.approval_status,
        updated_at = excluded.updated_at
    `).run(cfg.accountSid, name, c.sid, approvalStatus, Date.now(), Date.now());
  }

  return {
    matchedBuiltin,
    matchedCustom,
    importedCustom,
    total: existing.length,
    importedNames,
  };
}
