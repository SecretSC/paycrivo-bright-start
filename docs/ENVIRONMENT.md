# Environment Variables

PayCrivo has two environment files: one for the frontend and one for the API
server. Never commit real `.env` files — only the `*.example` templates.

## Frontend (`/.env.production`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Public URL of the API, e.g. `https://api.paycrivo.com` |
| `VITE_SHOW_DEV_CODES` | No | Leave unset in production. |

The frontend is a static build — variables are baked in at build time, so you
must rebuild (`npm run build`) after changing them.

## Server (`/server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Port the API listens on (default `4100`) |
| `NODE_ENV` | Yes | `production` |
| `CORS_ORIGINS` | Yes | Comma-separated allowed frontend origins |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Long random string |
| `JWT_CUSTOMER_SECRET` | Yes | Long random string (customer tokens) |
| `JWT_ADMIN_SECRET` | Yes | Different long random string (admin tokens) |
| `JWT_CUSTOMER_TTL` | No | Customer token lifetime (default `7d`) |
| `JWT_ADMIN_TTL` | No | Admin token lifetime (default `12h`) |
| `ADMIN_EMAIL` | Yes | First admin account email |
| `ADMIN_PASSWORD` | Yes | First admin account password |
| `ADMIN_NAME` | No | Display name for the admin |
| `SMTP_HOST` | Yes | SMTP host for OTP & support email |
| `SMTP_PORT` | Yes | Usually `587` (STARTTLS) or `465` (TLS) |
| `SMTP_USER` | Yes | SMTP username |
| `SMTP_PASS` | Yes | SMTP password (never exposed by any API) |
| `SMTP_FROM_EMAIL` | Yes | From address, e.g. `no-reply@paycrivo.com` |
| `SMTP_FROM_NAME` | No | From name (default `PayCrivo`) |
| `OTP_TTL_MINUTES` | No | OTP validity window (default `10`) |
| `OTP_MAX_ATTEMPTS` | No | Max OTP attempts (default `5`) |
| `OTP_RESEND_COOLDOWN_SECONDS` | No | Resend cooldown (default `60`) |

### Generating strong secrets

```bash
openssl rand -hex 48   # run once per JWT secret
```