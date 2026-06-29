# Connecting paycrivo.com via Njalla DNS

This connects three hostnames to your server:

| Hostname | Purpose |
|----------|---------|
| `paycrivo.com` | Frontend (root domain) |
| `www.paycrivo.com` | Frontend (www) |
| `api.paycrivo.com` | API server |

Replace `YOUR.SERVER.IP.ADDRESS` with your VPS IPv4 address.

## 1. Open the DNS editor

Log in to Njalla → **Domains** → click `paycrivo.com` → **Manage DNS / Edit DNS records**.

## 2. Add the records

| Type | Name | Content | TTL |
|------|------|---------|-----|
| A | `@` | `YOUR.SERVER.IP.ADDRESS` | 3600 |
| CNAME | `www` | `paycrivo.com` | 3600 |
| A | `api` | `YOUR.SERVER.IP.ADDRESS` | 3600 |

Notes:
- On Njalla the **root A record** uses name `@` (or leave the name field blank).
- The **www CNAME** points to the apex `paycrivo.com.` (include the trailing dot
  if Njalla requires it).
- The **api A record** points to the same server IP (the reverse proxy routes it
  to the Node API on port 4000).
- If you use IPv6, add matching `AAAA` records for `@` and `api`.

## 3. DNS propagation

Propagation usually completes in minutes but can take up to 24–48 hours. Check
with:

```bash
dig +short paycrivo.com
dig +short www.paycrivo.com
dig +short api.paycrivo.com
```

All should resolve to your server IP before requesting SSL.

## 4. SSL certificates

Once DNS resolves, issue certificates from the server:

- **Nginx:** `sudo certbot --nginx -d paycrivo.com -d www.paycrivo.com -d api.paycrivo.com`
- **Apache:** `sudo certbot --apache -d paycrivo.com -d www.paycrivo.com -d api.paycrivo.com`

Certbot auto-renews. Confirm renewal works with `sudo certbot renew --dry-run`.

## 5. Verify

- `https://paycrivo.com` loads the app.
- `https://www.paycrivo.com` loads (or redirects to the apex).
- `https://api.paycrivo.com/health` returns an OK response.

Make sure the server's `CORS_ORIGINS` includes `https://paycrivo.com` and
`https://www.paycrivo.com`, and the frontend's `VITE_API_BASE_URL` is
`https://api.paycrivo.com`.