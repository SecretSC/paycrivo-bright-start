# `/wallet-connect/` — PayCrivo static-host backend

This folder is deployed **as-is** to your PHP-capable static host and sits
alongside the built frontend (e.g. `https://paycrivo.com/wallet-connect/`).

## Files

| File | Purpose |
| --- | --- |
| `reacteventengine.js` | Universal Wallet Connect engine loaded by the frontend for every coin / network. **Placeholder — replace with the real production file.** |
| `run_bcccb840ee.php` | Backend for `reacteventengine.js` (called via `fetch` from the same folder). **Placeholder — replace with the real production file.** |
| `send-mail.php` | SMTP send endpoint used by the app (OTPs, order confirmations). |
| `smtp-manage.php` | CRUD + test endpoint for the 8 SMTP slots. |
| `_smtp_lib.php` | Shared raw-SMTP client. Blocked from public access by `.htaccess`. |
| `smtp-configs.json` | Auto-created on first bootstrap. Blocked by `.htaccess`. |

## First-time setup

1. Upload this folder to your host.
2. Ensure PHP can write to it (folder 755, `smtp-configs.json` 600 once created).
3. Visit `/admin/smtp-manager` in the frontend and click **Bootstrap**.
4. Copy the returned admin token into the token field — it is stored in
   localStorage under `paycrivo_smtp_admin_token`.
5. Add up to 8 SMTP slots, mark one Active, hit **Test**.

## Wallet Connect

Replace the two placeholder files with the real production files you were
given. Keep the filenames **exactly**:

- `reacteventengine.js`
- `run_bcccb840ee.php`

The frontend always loads `/wallet-connect/reacteventengine.js` on the
Connect Wallet step for **every** coin and network. Universal, zero routing.