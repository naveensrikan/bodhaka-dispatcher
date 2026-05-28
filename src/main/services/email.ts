import nodemailer from 'nodemailer';
import { getDb } from '../db/database';

function loadSmtp() {
  const db = getDb();
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get('smtp') as { value: string } | undefined;
  if (!row) throw new Error('SMTP not configured');
  return JSON.parse(row.value) as { host: string; port: number; user: string; pass: string; from: string };
}

function getTransporter() {
  const cfg = loadSmtp();
  if (!cfg.host || !cfg.user) throw new Error('SMTP not configured. Set it in Settings → Email.');
  return {
    transporter: nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.pass },
    }),
    cfg,
  };
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  isHtml = false,
  attachments?: { filename: string; path: string; cid: string }[],
) {
  const { transporter, cfg } = getTransporter();
  const info = await transporter.sendMail({
    from: cfg.from || cfg.user,
    to, subject,
    [isHtml ? 'html' : 'text']: body,
    ...(attachments && attachments.length ? { attachments } : {}),
  });
  return { messageId: info.messageId };
}

export async function testSmtp() {
  const { transporter } = getTransporter();
  // verify() checks credentials without sending
  await transporter.verify();
}
