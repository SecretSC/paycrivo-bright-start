# PayCrivo Phase 8–10 Plan

## Architecture (per your decisions)

- **Backend**: standalone `server/` Node.js + Express + PostgreSQL + Prisma, JWT auth, bcrypt/argon2, SMTP OTP. Lives in the same repo but runs independently (`node server`), deployable to any VPS/cPanel/Node host.
- **Frontend**: the existing TanStack Start app stays static-deployable. It talks to the backend **only** through one client (`src/lib/api/client.ts`) using `VITE_API_BASE_URL` (`http://localhost:4000` dev, `https://api.paycrivo.com` prod). No Lovable Cloud, no Supabase. localStorage only for theme, drafts, transient UI.
- **Realtime**: `RealtimeProvider` interface (`src/lib/realtime/`) with a **polling** implementation (2–3s) as default. Components depend on the interface only, so WebSocket/SSE/Pusher can be swapped later with zero UI changes.
- **Admin auth**: separate `admin_users` table, roles `super_admin | support_agent | order_manager | viewer`, seeded from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env via setup script. Separate JWT/session from customers. All admin mutations write to `admin_action_logs`.

```text
repo/
  src/...                # existing frontend (unchanged design)
    lib/api/client.ts    # fetch wrapper -> VITE_API_BASE_URL
    lib/realtime/        # RealtimeProvider interface + polling impl
    components/support/   # chat widget (transport-agnostic)
    routes/admin.*        # admin UI routes
  server/                # NEW standalone backend
    prisma/schema.prisma
    src/{routes,controllers,middleware,lib}
    scripts/seed-admin.ts
  docs/DEPLOYMENT-*.md
```

## Phases (each delivered for your review)

### Phase A — Backend foundation
- Scaffold `server/` (Express, Prisma, Postgres, dotenv, helmet, cors, rate-limit, zod).
- Prisma schema: `User, AdminUser, Session, LiveEvent, Order, Wallet, RewardClaim, SupportTicket, SupportMessage, SupportConversationEvent, AdminActionLog, EmailCode, Settings`.
- Migrations + `seed-admin` script (ADMIN_EMAIL/ADMIN_PASSWORD).
- Customer + admin JWT auth, role middleware, bcrypt hashing, SMTP OTP (reuse Mailjet env).
- Core API routes (customer + admin lists) returning safe data only.
- `.env.example`, run scripts.

### Phase B — Frontend API + realtime plumbing
- `src/lib/api/client.ts` (+ typed endpoint modules) using `VITE_API_BASE_URL`.
- `RealtimeProvider` interface + polling provider + React context.
- Migrate existing auth/orders/wallets/reward/OTP reads to call backend when `VITE_API_BASE_URL` is set, with graceful fallback so current flows keep working. No design changes.

### Phase C — Support chat widget (every page)
- Floating bubble (bottom-right desktop, safe bottom position mobile, lifts above sticky checkout footers), unread pulse, prompt bubble.
- Window states: welcome → visitor form (prefilled when logged in) → live thread → offline/queued → submitted.
- Creates `SupportTicket` + `SupportConversation`, sends/receives via realtime polling, timestamps, delivered, typing placeholder, file-upload placeholder, seed/private-key warning. Privacy guards (no password/OTP/secret capture).
- Captures safe `currentPage`/flow/step context into the ticket.

### Phase D — Admin shell + auth + overview
- `/admin/login` (separate, rate-limited), protected admin layout, session persistence, logout.
- `/admin` overview: stat cards, conversion funnel, recent orders/tickets/users, admin actions, live feed. Dark fintech theme, loading/empty states, responsive.

### Phase E — Live support panel
- `/admin/live`: active sessions, safe flow/step/asset, shortened wallets only, status, safe event timeline, session detail, support actions, **consent-based** navigation suggestions (customer modal: Continue / Dismiss, never silent redirect).

### Phase F — Admin inbox, users, orders, rewards, settings, logs
- `/admin/support(+/:id)` inbox with filters/search/canned replies/internal notes, live reply to widget.
- `/admin/users(+/:id)` safe customer data only (no passwords/OTP).
- `/admin/orders(+/:id)` buy+exchange, filters, status updates → action log.
- `/admin/rewards` claims with approve/reject/queue placeholders (no real crypto, no fake tx hash).
- `/admin/settings` general/fees/assets/fiat/support/email(masked SMTP)/reward.
- `/admin/logs` admin_action_logs viewer.

### Phase G — Integration, docs, tests
- Wire chat widget ↔ live panel ↔ inbox end-to-end.
- Deployment docs: VPS/Debian/Nginx, Node cPanel, split hosting (static FE + API host).
- Run the 18 acceptance cases; verify Buy/Exchange/OTP/dashboard/reward untouched and no KYC text.

## Guardrails
- No KYC, no Sell Crypto, no public design changes beyond chat-bubble integration.
- Never collect seed phrases, private keys, full card data; never log OTP/passwords; live panel shows shortened wallets only.
- Existing flows must keep working at every phase.

## Technical notes
- The backend cannot run inside the Lovable preview sandbox (Cloudflare Workers target). I'll build, typecheck, and self-test it in the sandbox via `node`/`tsx` against a local Postgres, but in the live Lovable preview the admin/support features need `VITE_API_BASE_URL` pointing at a running backend. I'll document this clearly.
- SMTP/admin credentials handled via env/secrets, never shipped to the frontend.

On approval I'll start with **Phase A** (backend foundation) and report back before moving on.