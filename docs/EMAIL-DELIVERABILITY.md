# PayCrivo Email Deliverability Checklist

PayCrivo sends **transactional** email only (one-time verification codes, password
resets, and reward-claim confirmations). No marketing, no bulk campaigns. The notes
below are best-practice configuration to maximise inbox placement.

> Honesty note: no provider can guarantee 100% inbox delivery. This checklist
> follows industry best practices to give transactional email the best chance of
> landing in the inbox instead of spam.

## 1. Sender identity (Mailjet)

- Current sender: `noreply@panema.it` (From name: **PayCrivo**).
- The sending domain (`panema.it`) **must** be verified and authenticated in
  Mailjet before it can deliver reliably. Unverified domains land in spam.
- Keep the From name consistent: always **PayCrivo**.
- Keep `Reply-To` pointed at a monitored support address (placeholder:
  `support@panema.it`). Set `SMTP_REPLY_TO` to override.

## 2. DNS records to configure (at the domain's DNS host)

| Record | Purpose | Notes |
| ------ | ------- | ----- |
| **SPF** | Authorises Mailjet to send for the domain | Add Mailjet's `include:spf.mailjet.com` to the domain TXT SPF record. Only one SPF record per domain. |
| **DKIM** | Cryptographically signs messages | Copy the DKIM TXT record Mailjet generates for the domain (Account → Sender domains → DNS settings). |
| **DMARC** | Tells inbox providers how to handle auth failures | Start with `v=DMARC1; p=none; rua=mailto:dmarc@panema.it;` then tighten to `p=quarantine` / `p=reject` once aligned. |
| **From-domain alignment** | The visible From domain must match the authenticated (SPF/DKIM) domain | Send from `@panema.it`, authenticate `panema.it`. Do not mix domains. |

## 3. Future branded domain

When PayCrivo owns `paycrivo.com`, switch to a branded sender such as
`noreply@paycrivo.com` and repeat SPF + DKIM + DMARC for that domain. A branded,
aligned domain improves trust and deliverability.

## 4. Reputation & warm-up

- Warm up a new sender/domain slowly — start with low daily volume and ramp up.
- Avoid sending repeated OTP test emails to many recipients (this looks abusive
  and hurts reputation). Use one or two test inboxes you control.
- Monitor Mailjet **reputation, bounce, and spam-complaint logs** regularly.
- Remove hard-bouncing addresses promptly.

## 5. Message hygiene (already implemented in the template)

- HTML **and** plain-text parts included.
- No tracking pixels.
- Minimal external links and no large/attached images.
- No spammy copy, ALL-CAPS, or false security/regulatory claims.
- Hidden preheader text and clear, consistent transactional subject lines.
- `X-Entity-Ref-ID` (unique message id) header set per send.
- No `List-Unsubscribe` on OTP mail — these are transactional, not marketing.

## 6. Required environment variables (backend only)

```
SMTP_HOST=in-v3.mailjet.com
SMTP_PORT=587
SMTP_USER=<mailjet api key>
SMTP_PASS=<mailjet secret key>
SMTP_FROM_EMAIL=noreply@panema.it
SMTP_FROM_NAME=PayCrivo
SMTP_REPLY_TO=support@panema.it   # optional
```

These must never be exposed in the frontend bundle. They are read only inside
server routes / server-side email code.