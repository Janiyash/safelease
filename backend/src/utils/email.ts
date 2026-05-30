import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const brandColor  = '#4361ee';
const brandDark   = '#1e2140';
const textMuted   = '#8b90b8';
const textBody    = '#4a4e7a';
const bgLight     = '#f0f2fb';

const baseTemplate = (content: string, preheader = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>SafeLease</title>
  ${preheader ? `<div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#e8eaf6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#e8eaf6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(67,97,238,0.13);">
        <!-- HEADER -->
        <tr>
          <td style="background:${brandColor};padding:24px 32px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="padding-right:10px;vertical-align:middle;">
                        <div style="width:36px;height:36px;background:rgba(255,255,255,0.15);border-radius:10px;display:inline-block;text-align:center;line-height:36px;font-size:18px;">🛡️</div>
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Safe<span style="opacity:0.85;">Lease</span></span>
                      </td>
                    </tr>
                  </table>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span style="color:rgba(255,255,255,0.7);font-size:12px;font-weight:500;letter-spacing:0.05em;text-transform:uppercase;">Security Alert</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- BODY -->
        <tr>
          <td style="padding:36px 32px 28px;">
            ${content}
          </td>
        </tr>
        <!-- DIVIDER -->
        <tr>
          <td style="padding:0 32px;">
            <div style="height:1px;background:#e8eaf6;"></div>
          </td>
        </tr>
        <!-- FOOTER -->
        <tr>
          <td style="padding:20px 32px 28px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td>
                  <p style="margin:0 0 6px;font-size:12px;color:${textMuted};">If you didn't request this, please <a href="mailto:security@safelease.com" style="color:${brandColor};text-decoration:none;font-weight:600;">contact our security team</a> immediately.</p>
                  <p style="margin:0;font-size:11px;color:#b0b5d8;">© ${new Date().getFullYear()} SafeLease. All rights reserved. &nbsp;·&nbsp; <a href="${process.env.FRONTEND_URL}/settings/security" style="color:${textMuted};text-decoration:none;">Security Settings</a> &nbsp;·&nbsp; <a href="mailto:support@safelease.com" style="color:${textMuted};text-decoration:none;">Help</a></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const deviceBox = (ip: string) => `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;">
    <tr>
      <td style="background:${bgLight};border-radius:12px;padding:16px 20px;border-left:4px solid ${brandColor};">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:${textMuted};text-transform:uppercase;letter-spacing:0.06em;">Session Details</p>
        <p style="margin:0;font-size:13px;color:${textBody};">IP Address: <strong>${ip}</strong></p>
        <p style="margin:4px 0 0;font-size:12px;color:${textMuted};">Time: ${new Date().toUTCString()}</p>
      </td>
    </tr>
  </table>`;

const ctaButton = (text: string, href: string, color = brandColor) =>
  `<a href="${href}" style="display:inline-block;padding:13px 28px;background:${color};color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:0.01em;box-shadow:0 4px 12px ${color}40;">${text}</a>`;

const send = async (options: EmailOptions) => {
  if (process.env.NODE_ENV === 'test') return;
  await transporter.sendMail({
    from: `"SafeLease Security" <${process.env.EMAIL_FROM || 'no-reply@safelease.com'}>`,
    ...options,
  });
};

// ── Welcome / General Emails ──────────────────────────────────────────────────

export const sendWelcomeEmail = async (to: string, name: string, verificationToken: string) => {
  const link = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  await send({
    to, subject: 'Welcome to SafeLease — Verify Your Email',
    html: baseTemplate(`
      <h2 style="color:${brandDark};margin:0 0 12px;font-size:22px;font-weight:700;">Welcome, ${name}! 🎉</h2>
      <p style="color:${textBody};line-height:1.7;margin:0 0 20px;">Thanks for joining SafeLease. Please verify your email address to activate your account and access all features.</p>
      ${ctaButton('Verify Email Address', link)}
      <p style="color:${textMuted};font-size:13px;margin:20px 0 0;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
    `, `Welcome to SafeLease — please verify your email`),
  });
};

export const sendPasswordResetEmail = async (to: string, name: string, resetToken: string) => {
  const link = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await send({
    to, subject: 'SafeLease — Reset Your Password',
    html: baseTemplate(`
      <h2 style="color:${brandDark};margin:0 0 12px;font-size:22px;font-weight:700;">Reset Your Password</h2>
      <p style="color:${textBody};line-height:1.7;margin:0 0 20px;">Hi ${name}, we received a request to reset your SafeLease password. Click below to set a new one.</p>
      ${ctaButton('Reset Password', link)}
      <p style="color:${textMuted};font-size:13px;margin:20px 0 0;">This link expires in 1 hour. If you didn't request this, please ignore this email and your password will remain unchanged.</p>
    `, `Reset your SafeLease password`),
  });
};

export const sendComplaintNotification = async (to: string, name: string, complaintTitle: string, status: string) => {
  await send({
    to, subject: `SafeLease — Complaint Update: ${complaintTitle}`,
    html: baseTemplate(`
      <h2 style="color:${brandDark};margin:0 0 12px;font-size:22px;font-weight:700;">Complaint Status Updated</h2>
      <p style="color:${textBody};line-height:1.7;">Hi ${name}, your complaint "<strong>${complaintTitle}</strong>" has been updated to:</p>
      <div style="margin:20px 0;padding:16px;background:${bgLight};border-radius:12px;font-size:18px;font-weight:700;color:${brandColor};text-align:center;text-transform:capitalize;">${status.replace('_',' ')}</div>
      ${ctaButton('View Complaint', `${process.env.FRONTEND_URL}/complaints`)}
    `),
  });
};

// ── 2FA Emails ────────────────────────────────────────────────────────────────

export const send2FAEnabledEmail = async (to: string, name: string, ip: string) => {
  await send({
    to,
    subject: '✅ SafeLease — Two-Factor Authentication Enabled',
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="width:56px;height:56px;background:#d1fae5;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:16px;">✅</div>
        <h2 style="color:${brandDark};margin:0;font-size:22px;font-weight:700;">Two-Factor Authentication Enabled</h2>
      </div>
      <p style="color:${textBody};line-height:1.7;margin:0 0 8px;">Hi <strong>${name}</strong>,</p>
      <p style="color:${textBody};line-height:1.7;margin:0 0 20px;">Two-factor authentication has been successfully enabled on your SafeLease account. Your account is now protected with an additional layer of security.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 24px;">
        <tr>
          <td style="background:#d1fae5;border-radius:12px;padding:16px 20px;border-left:4px solid #10b981;">
            <p style="margin:0;font-size:14px;color:#065f46;font-weight:600;">🔐 Your account now requires a 6-digit code from your authenticator app at each login.</p>
          </td>
        </tr>
      </table>
      ${deviceBox(ip)}
      <p style="color:${textBody};line-height:1.7;margin:0 0 20px;">Make sure to <strong>keep your recovery codes in a safe place</strong>. They are the only way to access your account if you lose your authenticator device.</p>
      ${ctaButton('Manage Security Settings', `${process.env.FRONTEND_URL}/settings/security`)}
      <p style="color:#dc2626;font-size:13px;font-weight:600;margin:20px 0 0;">⚠️ If you did not enable 2FA, please secure your account immediately.</p>
    `, `2FA was just enabled on your SafeLease account`),
  });
};

export const send2FADisabledEmail = async (to: string, name: string, ip: string) => {
  await send({
    to,
    subject: '⚠️ SafeLease — Two-Factor Authentication Disabled',
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="width:56px;height:56px;background:#fef3c7;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:16px;">⚠️</div>
        <h2 style="color:${brandDark};margin:0;font-size:22px;font-weight:700;">Two-Factor Authentication Disabled</h2>
      </div>
      <p style="color:${textBody};line-height:1.7;margin:0 0 8px;">Hi <strong>${name}</strong>,</p>
      <p style="color:${textBody};line-height:1.7;margin:0 0 20px;">Two-factor authentication has been <strong>disabled</strong> on your SafeLease account. Your account is now protected only by your password.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 24px;">
        <tr>
          <td style="background:#fef3c7;border-radius:12px;padding:16px 20px;border-left:4px solid #f59e0b;">
            <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">🔓 We strongly recommend re-enabling 2FA to keep your account secure.</p>
          </td>
        </tr>
      </table>
      ${deviceBox(ip)}
      ${ctaButton('Re-enable 2FA', `${process.env.FRONTEND_URL}/settings/security`, '#f59e0b')}
      <p style="color:#dc2626;font-size:13px;font-weight:600;margin:20px 0 0;">⚠️ If you did not disable 2FA, please change your password and contact support immediately.</p>
    `, `2FA was just disabled on your SafeLease account`),
  });
};

export const sendRecoveryCodeUsedEmail = async (to: string, name: string, ip: string, remaining: number) => {
  await send({
    to,
    subject: '🔑 SafeLease — Recovery Code Used',
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="width:56px;height:56px;background:#ede9fe;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:16px;">🔑</div>
        <h2 style="color:${brandDark};margin:0;font-size:22px;font-weight:700;">Recovery Code Used</h2>
      </div>
      <p style="color:${textBody};line-height:1.7;margin:0 0 8px;">Hi <strong>${name}</strong>,</p>
      <p style="color:${textBody};line-height:1.7;margin:0 0 20px;">A recovery code was just used to access your SafeLease account. Recovery codes are single-use and that code is now permanently invalidated.</p>
      ${deviceBox(ip)}
      ${remaining <= 2 ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 24px;">
        <tr>
          <td style="background:#fef2f2;border-radius:12px;padding:16px 20px;border-left:4px solid #ef4444;">
            <p style="margin:0;font-size:14px;color:#991b1b;font-weight:600;">🚨 You only have <strong>${remaining}</strong> recovery code${remaining === 1 ? '' : 's'} remaining. Regenerate them now.</p>
          </td>
        </tr>
      </table>
      ` : `<p style="color:${textBody};line-height:1.7;margin:0 0 24px;">You have <strong>${remaining}</strong> recovery codes remaining.</p>`}
      ${ctaButton('Manage Recovery Codes', `${process.env.FRONTEND_URL}/settings/security`)}
    `, `A recovery code was used to access your SafeLease account`),
  });
};

// ── Rent Emails ────────────────────────────────────────────────────────────────

export const sendRentReminderEmail = async (
  to: string, name: string, propertyTitle: string,
  amount: number, dueDateStr: string,
  type: 'new' | 'upcoming' | 'due_today'
) => {
  const subjects: Record<string, string> = {
    new:       `SafeLease — Rent Due: ₹${amount.toLocaleString('en-IN')} on ${dueDateStr}`,
    upcoming:  `SafeLease — Upcoming Rent Reminder for ${propertyTitle}`,
    due_today: `SafeLease — Rent Due Today for ${propertyTitle}`,
  };
  const headings: Record<string, string> = {
    new:       'New Rent Generated',
    upcoming:  'Upcoming Rent Reminder',
    due_today: '⚠️ Rent Due Today',
  };
  const messages: Record<string, string> = {
    new:       `A new rent of <strong>₹${amount.toLocaleString('en-IN')}</strong> has been generated for <strong>${propertyTitle}</strong>, due on <strong>${dueDateStr}</strong>.`,
    upcoming:  `Your rent of <strong>₹${amount.toLocaleString('en-IN')}</strong> for <strong>${propertyTitle}</strong> is due on <strong>${dueDateStr}</strong>. Please arrange payment in time.`,
    due_today: `Your rent of <strong>₹${amount.toLocaleString('en-IN')}</strong> for <strong>${propertyTitle}</strong> is <strong>due today</strong>. Pay now to avoid late fees.`,
  };
  await send({
    to,
    subject: subjects[type],
    html: baseTemplate(`
      <h2 style="color:${brandDark};margin:0 0 12px;font-size:22px;font-weight:700;">${headings[type]}</h2>
      <p style="color:${textBody};line-height:1.7;">Hi ${name},</p>
      <p style="color:${textBody};line-height:1.7;">${messages[type]}</p>
      <div style="margin:20px 0;padding:20px;background:${bgLight};border-radius:12px;text-align:center;">
        <div style="font-size:13px;color:${textMuted};margin-bottom:4px;">Amount Due</div>
        <div style="font-size:28px;font-weight:700;color:${brandColor};">₹${amount.toLocaleString('en-IN')}</div>
        <div style="font-size:13px;color:${textMuted};margin-top:4px;">Due: ${dueDateStr}</div>
      </div>
      ${ctaButton('Pay Now', `${process.env.FRONTEND_URL}/tenant/payments`)}
    `),
  });
};

export const sendOverdueEmail = async (
  to: string, name: string, propertyTitle: string,
  amount: number, month: string
) => {
  await send({
    to,
    subject: `SafeLease — OVERDUE: ₹${amount.toLocaleString('en-IN')} Rent for ${month}`,
    html: baseTemplate(`
      <h2 style="color:#dc2626;margin:0 0 12px;font-size:22px;font-weight:700;">⚠️ Rent Overdue</h2>
      <p style="color:${textBody};line-height:1.7;">Hi ${name},</p>
      <p style="color:${textBody};line-height:1.7;">Your rent for <strong>${propertyTitle}</strong> for <strong>${month}</strong> is now <strong style="color:#dc2626;">overdue</strong>. Please pay immediately to avoid further action.</p>
      <div style="margin:20px 0;padding:20px;background:#fef2f2;border-radius:12px;text-align:center;border:1px solid #fecaca;">
        <div style="font-size:13px;color:#9ca3af;margin-bottom:4px;">Overdue Amount</div>
        <div style="font-size:28px;font-weight:700;color:#dc2626;">₹${amount.toLocaleString('en-IN')}</div>
        <div style="font-size:13px;color:#9ca3af;margin-top:4px;">Month: ${month}</div>
      </div>
      ${ctaButton('Pay Overdue Rent', `${process.env.FRONTEND_URL}/tenant/payments`, '#dc2626')}
    `),
  });
};

// ── Email OTP (new — replaces TOTP authenticator) ─────────────────────────────
export const sendLoginOtpEmail = async (to: string, name: string, otp: string) => {
  const formatted = `${otp.slice(0, 3)} ${otp.slice(3)}`;
  await send({
    to,
    subject: `${otp} is your SafeLease verification code`,
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="width:64px;height:64px;background:linear-gradient(135deg,${brandColor},#7c3aed);border-radius:20px;display:inline-flex;align-items:center;justify-content:center;font-size:30px;margin-bottom:16px;box-shadow:0 8px 24px rgba(67,97,238,0.35);">🔐</div>
        <h2 style="color:${brandDark};margin:0;font-size:22px;font-weight:800;">Verify Your Login</h2>
        <p style="color:${textMuted};font-size:14px;margin:6px 0 0;">Two-factor authentication code</p>
      </div>
      <p style="color:${textBody};line-height:1.7;margin:0 0 4px;">Hi <strong>${name}</strong>,</p>
      <p style="color:${textBody};line-height:1.7;margin:0 0 24px;">Enter this code to complete your SafeLease sign-in. Never share this code with anyone.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 24px;">
        <tr>
          <td align="center" style="background:linear-gradient(135deg,#f0f2fb,#e8eaf6);border-radius:16px;padding:28px 24px;border:2px solid #c7d0f8;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:${textMuted};text-transform:uppercase;letter-spacing:0.1em;">Your Verification Code</p>
            <div style="font-size:44px;font-weight:900;letter-spacing:14px;color:${brandColor};font-family:'Courier New',monospace;line-height:1.2;">${formatted}</div>
            <p style="margin:12px 0 0;font-size:13px;color:${textMuted};">⏱ Expires in <strong>10 minutes</strong></p>
          </td>
        </tr>
      </table>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 20px;">
        <tr>
          <td style="background:#fef3c7;border-radius:12px;padding:14px 18px;border-left:4px solid #f59e0b;">
            <p style="margin:0;font-size:13px;color:#92400e;font-weight:600;">⚠️ SafeLease will NEVER ask for this code by phone or chat. If someone is asking — it is a scam.</p>
          </td>
        </tr>
      </table>
      <p style="color:${textMuted};font-size:13px;line-height:1.6;margin:0;">This code is single-use and expires in 10 minutes. If you didn't attempt to sign in, <a href="mailto:security@safelease.com" style="color:${brandColor};font-weight:600;text-decoration:none;">contact support</a> immediately.</p>
    `, `${otp} — your SafeLease login verification code`),
  });
};
