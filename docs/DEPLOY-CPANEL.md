# Deploy on cPanel / Plesk

Shared hosting works when the host offers a **Node.js application** feature
(cPanel "Setup Node.js App" / Plesk "Node.js"). You need PostgreSQL — if the
host only offers MySQL, run the database on an external managed Postgres or a
small VPS and point `DATABASE_URL` at it.

## 1. Build the frontend locally

On your own machine:

```bash
cp .env.production.example .env.production   # set VITE_API_BASE_URL=https://api.paycrivo.com
npm install
npm run build
```

Upload the contents of the generated `dist/` folder to the document root of
`paycrivo.com` (e.g. `public_html/`) via File Manager or FTP.

### SPA routing on cPanel

Create `.htaccess` in the document root:

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

Make sure `assets/meta-effectapi.js` and `assets/tronEleven.js` are present in
the document root's `assets/` folder (they ship in the build output).

## 2. Deploy the API

1. Upload the `server/` folder somewhere outside the document root.
2. In cPanel → **Setup Node.js App**:
   - Application root: path to `server`
   - Application startup file: `dist/index.js`
   - Node version: 20+
3. Add all server environment variables (see [ENVIRONMENT.md](./ENVIRONMENT.md))
   in the app's "Environment variables" panel.
4. Open the app's terminal and run:
   ```bash
   npm install
   npm run build
   npm run migrate
   npm run seed:admin
   ```
5. Start the application. Note the proxied URL cPanel assigns it.

## 3. Map the API subdomain

Create a subdomain `api.paycrivo.com` and point it at the Node.js app
(cPanel usually wires this automatically when you set the app's domain).

## 4. Plesk notes

Plesk's "Node.js" extension follows the same flow: set application root to
`server`, startup file to `dist/index.js`, add env vars, then run
`npm install && npm run build && npm run migrate && npm run seed:admin`
from the Plesk Node.js panel.