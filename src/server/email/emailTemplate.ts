// Server-only PayCrivo email templates (dark, purple/lavender fintech style).
// Table-based layout, inline CSS, no tracking pixels, minimal external links.

// Absolute HTTPS logo. Falls back to clean "PayCrivo" wordmark via alt text +
// a styled text wordmark when the image is blocked.
const LOGO_URL = "https://paycrivo-bright-start.lovable.app/paycrivo-email-logo.png";

export type EmailPurpose =
  | "signup"
  | "buy_checkout"
  | "exchange_checkout"
  | "forgot_password"
  | "login_security";

const TITLES: Record<
  EmailPurpose,
  { subject: string; heading: string; intro: string; preheader: string }
> = {
  signup: {
    subject: "Your PayCrivo verification code",
    heading: "Verify your email",
    intro: "Use this code to verify your email for PayCrivo.",
    preheader: "Use this 4-digit code to verify your PayCrivo email.",
  },
  buy_checkout: {
    subject: "Your PayCrivo purchase verification code",
    heading: "Verify your email",
    intro: "Use this code to verify your email for your PayCrivo purchase.",
    preheader: "Use this 4-digit code to verify your PayCrivo email.",
  },
  exchange_checkout: {
    subject: "Your PayCrivo exchange verification code",
    heading: "Verify your email",
    intro: "Use this code to verify your email for your PayCrivo exchange.",
    preheader: "Use this 4-digit code to verify your PayCrivo email.",
  },
  forgot_password: {
    subject: "Reset your PayCrivo password",
    heading: "Reset your password",
    intro: "Use this code to confirm it's you and set a new PayCrivo password.",
    preheader: "Use this 4-digit code to reset your PayCrivo password.",
  },
  login_security: {
    subject: "Your PayCrivo security code",
    heading: "Confirm it's you",
    intro: "Use this code to confirm this sign-in to your PayCrivo account.",
    preheader: "Use this 4-digit code to confirm your PayCrivo sign-in.",
  },
};

export function subjectFor(purpose: EmailPurpose): string {
  return (TITLES[purpose] ?? TITLES.signup).subject;
}

function shell(opts: {
  preheader: string;
  heading: string;
  bodyHtml: string;
}): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"></head>
<body style="margin:0;padding:0;background:#07060f;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${opts.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#07060f;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding-bottom:22px;">
          <img src="${LOGO_URL}" alt="PayCrivo" width="150" style="display:block;width:150px;height:auto;border:0;outline:none;text-decoration:none;" />
          <div style="margin-top:8px;font-size:13px;font-weight:800;letter-spacing:0.5px;color:#a78bfa;font-family:Arial,Helvetica,sans-serif;">PayCrivo</div>
        </td></tr>
        <tr><td style="background:#0d0b1c;border:1px solid #221b40;border-radius:22px;padding:34px 30px;">
          <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">${opts.heading}</h1>
          ${opts.bodyHtml}
        </td></tr>
        <tr><td align="center" style="padding-top:22px;">
          <p style="margin:0;font-size:11px;line-height:18px;color:#615b82;font-family:Arial,Helvetica,sans-serif;">If you did not request this email, you can safely ignore it.<br/>© 2026 PayCrivo · Buy &amp; exchange crypto<br/>This is an automated message, please do not reply.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function renderOtpEmail(purpose: EmailPurpose, code: string): { html: string; text: string } {
  const t = TITLES[purpose] ?? TITLES.signup;
  const digits = code
    .split("")
    .map(
      (d) =>
        `<td style="padding:0 6px;"><div style="width:54px;height:64px;line-height:64px;text-align:center;font-size:30px;font-weight:800;color:#ffffff;background:#13132b;border:1px solid #2a2150;border-radius:14px;font-family:Arial,Helvetica,sans-serif;">${d}</div></td>`,
    )
    .join("");

  const bodyHtml = `
    <p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#b9b4d6;font-family:Arial,Helvetica,sans-serif;">${t.intro}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 22px;"><tr>${digits}</tr></table>
    <p style="margin:0 0 6px;font-size:13px;color:#9b95c0;text-align:center;font-family:Arial,Helvetica,sans-serif;">This code expires in 10 minutes.</p>
    <div style="height:1px;background:#221b40;margin:24px 0;"></div>
    <p style="margin:0;font-size:12px;line-height:20px;color:#7c769c;font-family:Arial,Helvetica,sans-serif;">Never share this code with anyone. PayCrivo will never ask for your password or wallet secret.</p>`;

  const html = shell({ preheader: t.preheader, heading: t.heading, bodyHtml });
  const text = `PayCrivo\n\n${t.heading}\n\nYour PayCrivo verification code is ${code}. It expires in 10 minutes. Never share this code.\n\nIf you did not request this code, you can safely ignore this email.\n\n© 2026 PayCrivo`;
  return { html, text };
}

export function renderRewardEmail(opts: {
  amountUsd: number;
  asset: string;
  network: string;
}): { subject: string; html: string; text: string } {
  const subject = "Your PayCrivo welcome reward claim";
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#b9b4d6;font-family:Arial,Helvetica,sans-serif;">Your PayCrivo welcome reward claim was received.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;">
      <tr><td style="padding:6px 0;font-size:13px;color:#9b95c0;">Reward amount</td><td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#ffffff;">$${opts.amountUsd} equivalent</td></tr>
      <tr><td style="padding:6px 0;font-size:13px;color:#9b95c0;">Asset</td><td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#ffffff;">${opts.asset}</td></tr>
      <tr><td style="padding:6px 0;font-size:13px;color:#9b95c0;">Network</td><td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#ffffff;">${opts.network}</td></tr>
    </table>
    <p style="margin:0;font-size:12px;line-height:20px;color:#7c769c;font-family:Arial,Helvetica,sans-serif;">We'll review your claim and update its status in your dashboard. One reward per customer; availability may vary.</p>`;
  const html = shell({
    preheader: "Your PayCrivo welcome reward claim was received.",
    heading: "Welcome reward claim received",
    bodyHtml,
  });
  const text = `PayCrivo\n\nYour PayCrivo welcome reward claim was received.\nReward amount: $${opts.amountUsd} equivalent\nAsset: ${opts.asset}\nNetwork: ${opts.network}\n\nWe'll review your claim and update its status in your dashboard.\n\n© 2026 PayCrivo`;
  return { subject, html, text };
}

export { LOGO_URL };
