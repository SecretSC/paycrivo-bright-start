# Static Hosting Deployment (Phase 4)

PayCrivo's frontend can be deployed to any static host that also supports
PHP in subdirectories (cPanel, Hostinger, shared LAMP, etc.). The existing
Node/Postgres backend keeps running on a subdomain (e.g.
`https://api.paycrivo.com`) and continues to serve auth, orders, admin,
support inbox, audit logs, and audit-grade SMTP.

## 1. Build the frontend

```bash
VITE_API_BASE_URL="https://api.paycrivo.com" \
VITE_STATIC_MAIL_ENDPOINT="/wallet-connect/send-mail.php" \
bun run build
```

Copy `.output/public/` **plus** the `wallet-connect/` folder (which the
build carries through from `public/`) to your static host's document root.

## 2. Point the frontend at the Node backend

All Data API calls (auth, orders, admin panel, rewards, support widget)
go through `src/lib/api/client.ts`, which reads `VITE_API_BASE_URL`. Set
it at build time. CORS on the Node backend already allows `paycrivo.com`
(see `server/src/index.ts`); add any additional origins there.

## 3. `/wallet-connect/` — PHP endpoints

See `public/wallet-connect/README.md`. Both wallet files are placeholders
in the repo — replace them with your real production files after upload
(same filenames):

- `/wallet-connect/reacteventengine.js`
- `/wallet-connect/run_bcccb840ee.php`

## 4. SMTP (`/admin/smtp-manager`)

The static frontend cannot open SMTP sockets from the browser, so the
admin panel writes its 8 SMTP slots to `/wallet-connect/smtp-configs.json`
via `smtp-manage.php`, and the app sends mail through `send-mail.php`.

**First run:**
1. Open `/admin/smtp-manager`.
2. Click **Bootstrap** to mint the admin token; paste it into the token
   field. It is stored in localStorage under `paycrivo_smtp_admin_token`.
3. Add up to 8 SMTP configurations, set one Active, run **Test**.

The Node backend's own SMTP manager (`/admin/settings`) is unchanged —
use either. The PHP path is what the browser hits when the Node backend
is out of reach.

## 5. SPA fallback under Apache

```apache
# .htaccess at document root
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/wallet-connect/
RewriteRule ^ index.html [L]
```

That preserves PHP execution inside `/wallet-connect/` while every other
URL falls through to the SPA shell.