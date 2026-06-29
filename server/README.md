# PayCrivo Backend (standalone API)

Node.js + Express + PostgreSQL + Prisma. Runs independently from the frontend so
PayCrivo stays self-host ready. The frontend talks to it only through
`VITE_API_BASE_URL`.

## Requirements
- Node.js 18+
- PostgreSQL 13+

## Setup
```bash
cd server
cp .env.example .env          # fill in DATABASE_URL, JWT secrets, ADMIN_*, SMTP_*
npm install
npx prisma migrate dev --name init   # first run creates tables
npm run seed:admin            # creates the first super_admin from ADMIN_EMAIL/ADMIN_PASSWORD
npm run seed:settings         # seeds default platform settings (optional)
npm run dev                   # http://localhost:4000
```

For production:
```bash
npx prisma migrate deploy
npm run build
npm start
```

## Environment
See `.env.example`. Key vars:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_CUSTOMER_SECRET`, `JWT_ADMIN_SECRET` — separate signing secrets
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — seeded super admin (never shipped to frontend)
- `SMTP_*` — transactional OTP email (the password is never exposed by any API)
- `CORS_ORIGINS` — comma-separated allowed frontend origins

## API surface
Customer: `/api/auth/*`, `/api/email/*`, `/api/orders`, `/api/wallets`,
`/api/support/*`, `/api/live/*`.
Admin: `/api/admin/*` (login, stats, overview, live-sessions, support, users,
orders, rewards, settings, logs).

## Security notes
- Passwords hashed with bcrypt; never returned by any endpoint.
- OTP codes are stored hashed and never exposed to admins.
- Live panel and admin lists return shortened wallet addresses only.
- Messages that look like seed phrases / private keys are redacted before storage.
- All admin mutations are written to `admin_action_logs`.
- Admin roles: `super_admin`, `support_agent`, `order_manager`, `viewer`.

> Note: this server cannot run inside the Lovable preview (Cloudflare Workers
> target). Host it on a VPS / Node-capable cPanel / any Node host, then point the
> frontend's `VITE_API_BASE_URL` at it. See `docs/DEPLOYMENT-*.md`.