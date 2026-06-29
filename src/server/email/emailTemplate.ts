// Server-only PayCrivo OTP email template (dark, purple/lavender fintech style).

const LOGO_URL = "https://paycrivo-bright-start.lovable.app/paycrivo-email-logo.png";

export type EmailPurpose =
  | "signup"
  | "buy_checkout"
  | "exchange_checkout"
  | "forgot_password"
  | "login_security";

const TITLES: Record<EmailPurpose, { subject: string; heading: string; intro: string }> = {
  signup: {
    subject: "Your PayCrivo verification code",
    heading: "Verify your email",
    intro: "Use this code to verify your email address and finish creating your PayCrivo account.",
  },
  buy_checkout: {
    subject: "Verify your PayCrivo purchase email",
    heading: "Verify your email",
    intro: "Use this code to verify your email so we can send your purchase updates.",
  },
  exchange_checkout: {
    subject: "Verify your PayCrivo exchange email",
    heading: "Verify your email",
    intro: "Use this code to verify your email so we can send your exchange updates.",
  },
  forgot_password: {
    subject: "Reset your PayCrivo password",
    heading: "Reset your password",
    intro: "Use this code to confirm it's you and set a new PayCrivo password.",
  },
  login_security: {
    subject: "Your PayCrivo security code",
    heading: "Confirm it's you",
    intro: "Use this code to confirm this sign-in to your PayCrivo account.",
  },
};

export function subjectFor(purpose: EmailPurpose): string {
  return (TITLES[purpose] ?? TITLES.signup).subject;
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

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"></head>
<body style="margin:0;padding:0;background:#07060f;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${t.heading} — your PayCrivo code is ${code}. Expires in 10 minutes.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07060f;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td align="center" style="padding-bottom:22px;">
          <img src="${LOGO_URL}" alt="PayCrivo" width="160" style="display:block;width:160px;height:auto;" />
        </td></tr>
        <tr><td style="background:#0d0b1c;border:1px solid #221b40;border-radius:22px;padding:34px 30px;background-image:linear-gradient(180deg,#0f0c22 0%,#0a0817 100%);">
          <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">${t.heading}</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#b9b4d6;font-family:Arial,Helvetica,sans-serif;">${t.intro}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 22px;"><tr>${digits}</tr></table>
          <p style="margin:0 0 6px;font-size:13px;color:#9b95c0;text-align:center;font-family:Arial,Helvetica,sans-serif;">Your code expires in 10 minutes.</p>
          <div style="height:1px;background:#221b40;margin:24px 0;"></div>
          <p style="margin:0;font-size:12px;line-height:20px;color:#7c769c;font-family:Arial,Helvetica,sans-serif;">If you did not request this code, you can safely ignore this email. For your security, never share this code with anyone.</p>
        </td></tr>
        <tr><td align="center" style="padding-top:22px;">
          <p style="margin:0;font-size:11px;color:#615b82;font-family:Arial,Helvetica,sans-serif;">© ${new Date().getFullYear()} PayCrivo · Buy &amp; exchange crypto<br/>This is an automated message, please do not reply.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `${t.heading}\n\n${t.intro}\n\nYour code: ${code}\nThis code expires in 10 minutes.\n\nIf you did not request this code, you can ignore this email.\n\n© ${new Date().getFullYear()} PayCrivo`;
  return { html, text };
}

export { LOGO_URL };