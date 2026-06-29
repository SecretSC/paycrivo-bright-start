# PayCrivo Admin Guide

This guide explains how to operate the PayCrivo Support & Operations Center.

## 1. Admin login URL

- Local / self-hosted frontend: `https://paycrivo.com/admin`
- The admin area is isolated from the customer app and uses a separate
  `admin_users` table — customer accounts can never sign in here.

## 2. Seeding the first admin

The first admin account is created from environment variables on the backend.

```bash
cd /var/www/paycrivo.com/server
npm run seed:admin        # safe to re-run; skips if the admin already exists
npm run seed:settings     # seeds default platform settings
```

## 3. ADMIN_EMAIL / ADMIN_PASSWORD setup

Set these in `server/.env` **before** running `seed:admin`:

```env
ADMIN_EMAIL=admin@paycrivo.com
ADMIN_PASSWORD=ChangeThisStrongPassword123!
ADMIN_NAME=PayCrivo Admin
```

> The values above are EXAMPLES ONLY. You MUST change `ADMIN_PASSWORD`
> (and ideally `ADMIN_EMAIL`) to your own strong, private credentials before
> going to production. Never ship the default password live.

A strong password is 12+ characters with upper, lower, number and symbol.

## 4. Viewing customers

`Admin → Customers`. Search by name or email, open a profile to see account
details, linked orders, saved wallets and reward status. Sensitive fields are
redacted — admins never see passwords, OTP codes, private keys or full card data.

## 5. Viewing orders

`Admin → Orders`. Filter by Buy / Exchange, status, asset or date. Open an order
to see amounts, fees, destination wallet, and current status timeline.

## 6. Using the support inbox

`Admin → Conversations`. A three-pane inbox:
- Left: conversation list with unread counters and priority.
- Center: the live chat. Reply, attach files, insert canned responses,
  add internal notes (never visible to the customer), assign agents.
- Right: customer context — profile, recent orders, checkout metadata.

Reminder shown in-app: never request seed phrases, private keys, passwords or
full card details from customers.

## 7. Using Live Ops

`Admin → Live Ops`. Real-time operations center showing active visitors, in-flight
Buy/Exchange checkouts, open chats, recent signups and orders, failed validations,
wallet errors, OTP failures, reward claims and API/system health. Use the visitor
table to suggest navigation, open a ticket/profile, or flag a visitor for help.

## 8. Viewing rewards

`Admin → Rewards`. Review $20 welcome reward claims, the chosen asset / network /
destination address, and ownership-verification status. Approve or follow up
from here.

## 9. Reading logs

`Admin → Live Ops` (event timeline) for real-time activity, and the server logs
for backend detail:

```bash
sudo journalctl -u paycrivo-api -f          # live API logs
sudo journalctl -u paycrivo-api --since today
```

Logs never contain secrets (passwords, OTP codes, private keys, full card data).

## 10. Changing settings

`Admin → Settings`. Adjust platform configuration. Values are persisted in the
database via the backend; secrets (SMTP, JWT) are managed only through
`server/.env`, never the UI.

## 11. Resetting the admin password safely

Option A — re-seed with a new password:

```bash
cd /var/www/paycrivo.com/server
# edit server/.env -> set a new ADMIN_PASSWORD (and matching ADMIN_EMAIL)
nano .env
npm run seed:admin -- --force   # re-applies the password for that admin email
```

Option B — change it from the admin UI under `Admin → Settings → Security`
while signed in.

Never store the production admin password in chat, screenshots, or the repo.
