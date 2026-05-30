import { getDb } from '../db/database';
import { sendEmail } from './email';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

/**
 * Email OTP verification. Codes are stored in-memory (per app session) with a
 * short expiry. We deliberately don't persist the code to disk.
 *
 * Flow:
 *  1. sendEmailOtp(email), generates a 6-digit code, emails it via the user's
 *     own SMTP, holds it in memory for 10 minutes.
 *  2. verifyEmailOtp(email, code), checks the code; on success marks the email
 *     verified in config and locks it.
 */

interface PendingOtp {
  code: string;
  email: string;
  expiresAt: number;
  attempts: number;
}

let pending: PendingOtp | null = null;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendEmailOtp(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  const code = generateCode();
  pending = { code, email, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 };

  const subject = 'Your Bodhaka Dispatcher verification code';

  // Locate the logo (works in dev and packaged app)
  const candidates = [
    path.join(process.resourcesPath || '', 'email-logo.png'),
    path.join(__dirname, '..', '..', 'resources', 'email-logo.png'),
    path.join(app.getAppPath(), 'resources', 'email-logo.png'),
  ];
  const logoPath = candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } });

  const logoBlock = logoPath
    ? `<img src="cid:bodhakalogo" alt="Bodhaka" width="64" height="64" style="display:block; margin:0 auto 12px;" />`
    : '';

  const html = `
    <div style="font-family: -apple-system, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; text-align: center;">
      ${logoBlock}
      <h2 style="color: #1e2a8a; margin: 0 0 4px;">Verify your email</h2>
      <p style="color: #5a5e75; margin: 0 0 16px;">Enter this code in Bodhaka Dispatcher to verify your email address:</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1d2e; background: #eef0f6; padding: 16px; border-radius: 8px; margin: 0 0 16px;">${code}</div>
      <p style="color: #8a8fa6; font-size: 12px; margin: 0 0 16px;">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
      <div style="border-top: 1px solid #e3e5ec; padding-top: 14px; color: #8a8fa6; font-size: 11px; line-height: 1.6;">
        Please note: Bodhaka Dispatcher is meant for your own personal, agentic learning use only. The agents you build are for you, and should not be used to send messages to other people.
      </div>
    </div>`;

  const text = `Your Bodhaka Dispatcher verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not request it, ignore this email.\n\nPlease note: Bodhaka Dispatcher is for your own personal, agentic learning use only.`;

  try {
    const attachments = logoPath
      ? [{ filename: 'logo.png', path: logoPath, cid: 'bodhakalogo' }]
      : undefined;
    await sendEmail(email, subject, html, true, attachments);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: `Could not send code: ${err.message}. Check your SMTP settings.` };
  }
}

export function verifyEmailOtp(email: string, code: string): { ok: boolean; error?: string } {
  if (!pending) return { ok: false, error: 'No code was sent. Request a new code.' };
  if (pending.email !== email) return { ok: false, error: 'Email changed since the code was sent. Request a new code.' };
  if (Date.now() > pending.expiresAt) { pending = null; return { ok: false, error: 'Code expired. Request a new one.' }; }

  pending.attempts++;
  if (pending.attempts > 5) { pending = null; return { ok: false, error: 'Too many attempts. Request a new code.' }; }

  if (pending.code !== code.trim()) return { ok: false, error: 'Incorrect code. Try again.' };

  // Success, mark verified and lock in config
  const db = getDb();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get('contact') as { value: string } | undefined;
  const contact = row ? JSON.parse(row.value) : {};
  contact.email = email;
  contact.emailVerified = true;
  contact.emailLocked = true;
  db.prepare(`INSERT INTO config (key, value, updated_at) VALUES ('contact', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .run(JSON.stringify(contact), Date.now());

  pending = null;
  return { ok: true };
}

/** Unlock email for re-verification (user wants to change it) */
export function unlockEmail(): void {
  const db = getDb();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get('contact') as { value: string } | undefined;
  const contact = row ? JSON.parse(row.value) : {};
  contact.emailVerified = false;
  contact.emailLocked = false;
  db.prepare(`UPDATE config SET value = ?, updated_at = ? WHERE key = 'contact'`)
    .run(JSON.stringify(contact), Date.now());
}
