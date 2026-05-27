import { getDb } from '../db/database';

/**
 * WhatsApp via Twilio. Users provide their Twilio Account SID, Auth Token,
 * and a WhatsApp-enabled sender number. We use Twilio's REST API directly
 * to avoid pulling in their SDK (smaller bundle, fewer native deps).
 */
export async function sendWhatsApp(to: string, body: string): Promise<{ sent: boolean; sid?: string; error?: string }> {
  const db = getDb();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get('twilio') as { value: string } | undefined;
  if (!row) return { sent: false, error: 'Twilio not configured. Add credentials in Settings.' };

  const cfg = JSON.parse(row.value) as { accountSid: string; authToken: string; from: string };
  if (!cfg.accountSid || !cfg.authToken || !cfg.from) {
    return { sent: false, error: 'Twilio credentials incomplete. Check Settings.' };
  }

  // Normalize numbers — Twilio WhatsApp requires "whatsapp:+<E.164>"
  const fromAddr = cfg.from.startsWith('whatsapp:') ? cfg.from : `whatsapp:${cfg.from}`;
  const toAddr = to.startsWith('whatsapp:') ? to : `whatsapp:${to.replace(/\s/g, '')}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`;
  const params = new URLSearchParams({ From: fromAddr, To: toAddr, Body: body.slice(0, 1600) });

  const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
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

export async function testTwilio(accountSid: string, authToken: string): Promise<{ ok: boolean; error?: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  try {
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) {
      const json: any = await res.json().catch(() => ({}));
      return { ok: false, error: json.message || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
