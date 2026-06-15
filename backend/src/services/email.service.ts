import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!env.email.user || !env.email.appPassword) {
    logger.warn('⚠️  Email not configured (EMAIL_USER / EMAIL_APP_PASSWORD) — emails will be skipped');
    return null;
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.email.user,
      pass: env.email.appPassword.replace(/\s+/g, ''), // Gmail app passwords are shown with spaces
    },
  });
  return transporter;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

/** Send an email. Never throws — logs failures so callers aren't broken by SMTP issues. */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const tx = getTransporter();
  if (!tx) return false;
  try {
    await tx.sendMail({
      from: `"${env.email.fromName}" <${env.email.user}>`,
      to: Array.isArray(params.to) ? params.to.join(',') : params.to,
      subject: params.subject,
      html: params.html,
    });
    return true;
  } catch (err) {
    logger.error('Failed to send email', err);
    return false;
  }
}

/** Verify SMTP credentials at startup (optional, logs result). */
export async function verifyEmailTransport(): Promise<void> {
  const tx = getTransporter();
  if (!tx) return;
  try {
    await tx.verify();
    logger.info('✅ Email transport verified');
  } catch (err) {
    logger.warn('⚠️  Email transport verification failed', err);
  }
}
