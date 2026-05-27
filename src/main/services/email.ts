import nodemailer from 'nodemailer';
import { getDb } from '../db/database';

function loadSmtp() {
  const db = getDb();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get('smtp') as { value: string } | undefined;
  if (!row) throw new Error('SMTP not configured');
  return JSON.parse(row.value) as { host: string; port: number; user: string; pass: string; from: string };
}

export async function sendEmail(to: string, subject: string, body: string, isHtml = false) {
  const cfg = loadSmtp();
  if (!cfg.host || !cfg.user) throw new Error('SMTP not configured. Set it in Settings → Email.');

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  const info = await transporter.sendMail({
    from: cfg.from || cfg.user,
    to,
    subject,
    [isHtml ? 'html' : 'text']: body,
  });

  return { messageId: info.messageId };
}
