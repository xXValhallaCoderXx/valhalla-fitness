# Production release checklist

Magic-link-only auth + invite-only allowlist on a **single hosted environment**.
Started 2026-06-30. Earlier two-environment design (now superseded by this single-env plan):
`~/.claude/plans/i-want-to-start-peaceful-russell.md`. Deploy steps: `RAILWAY.md`.

## Resume here
1. **Ship the current code to `main`**: merge `develop` → `main`. The magic-link + allowlist work is
   already committed on `develop`, and Railway deploys from `main`.
2. Work top-to-bottom through **Ops** — each section needs your Supabase / Resend / Railway dashboards.
3. Verify the full magic-link round-trip on the live environment before sharing access.

## Decisions (locked)
- **Email sender:** Resend, plugged in as Supabase custom SMTP.
- **Whitelist:** Invite-only — disable open signup in Supabase + pre-provision allowed users; magic link uses `shouldCreateUser:false`. App-layer check is UX-only (the anon key reaches the browser, so it isn't the real boundary).
- **Topology:** **one** environment — the existing hosted stack **is** production (one Railway service, one Supabase project). Local Supabase covers dev + migrations. No staging.
- **Deploy:** Railway auto-deploys `main`; all dev is local; merge to `main` to release.
- **Auth in prod:** magic-link only (`AUTH_PASSWORD_ENABLED=false`). Password sign-in + reset stay in the code (active locally), off in prod.

## Environment topology
| | Local/dev | Production |
|---|---|---|
| Domain | localhost:3000 | sheetless.fitness |
| Supabase | local CLI stack | existing hosted project |
| Deploy branch | — | `main` |
| `NODE_ENV` | development | production |
| `AUTH_PASSWORD_ENABLED` | unset → on | `false` |
| `AUTH_ALLOWLIST_ENABLED` | unset → off | `true` |
| Open signup (dashboard) | on | **off** |
| Email | Inbucket | Resend SMTP |

---

## Code — DONE & validated ✅ (committed on `develop`)
- [x] `src/shared/lib/auth-config.ts` — pure `getAuthPolicy(env)` + `parseBooleanFlag` + messages
- [x] `src/domains/account/server/allowlist.ts` *(new)* — `normalizeEmail`, `resolveMagicLinkDecision`, `isEmailAllowed`
- [x] `auth-functions.ts` — `getAuthPolicyFn`, password-flow guards, allowlist gate + `shouldCreateUser`
- [x] `queries.ts` + `routes/auth.tsx` — policy prefetched in loader (no UI flash)
- [x] `AuthPage.tsx` — policy-driven UI (hides password in magic-only mode), neutral anti-enumeration message
- [x] `supabase/migrations/202606300001_add_allowed_emails.sql` *(new)* — table + `is_email_allowed` RPC, RLS-locked, `service_role` grant
- [x] `scripts/provision-allowed-users.mjs` *(new)* — `pnpm provision:allowed`
- [x] `.env.example`, `RAILWAY.md` — flags + invite-only deploy notes
- [x] `.github/workflows/ci.yml` *(new)* — typecheck + lint on `main`
- [x] `tests/auth-policy.test.ts`, `tests/auth-allowlist.test.ts` *(new)*
- [x] Validated: `typecheck` + `lint` clean; **225 unit tests** pass; migration applies on local; RPC/RLS/grants verified via REST; both auth screens screenshotted; e2e smoke + login pass

---

## Ops — TODO (needs dashboards)

### B. Production Supabase project (the existing hosted project)
- [ ] Use the **existing hosted Supabase project** as production — do **not** create a new one
- [ ] Capture: project URL, anon key, service-role key, **Transaction pooler** DB URI (IPv4, port 6543)
- [ ] Migrate: `SUPABASE_DB_URL=<pooler> pnpm db:migrate:dry-run` then `pnpm db:migrate`
- [ ] Auth → turn **OFF** "Allow new users to sign up" (the invite-only hard boundary)
- [ ] Auth → URL config: Site URL `https://sheetless.fitness`, redirect `https://sheetless.fitness/auth/callback`
- [ ] Seed allowlist + provision: add your email to `allowed_emails`, then
      `SUPABASE_URL=<prod> SUPABASE_SERVICE_ROLE_KEY=<prod> pnpm provision:allowed` — verify a login

### C. Resend email
- [ ] Create Resend account; verify the **sheetless.fitness** domain (add SPF/DKIM/DMARC DNS records)
- [ ] Create an API key
- [ ] In the Supabase project → Auth → SMTP: host `smtp.resend.com`, port `465`, user `resend`, password = API key, sender e.g. `login@sheetless.fitness`, name `Sheetless`
- [ ] Send a real magic link end-to-end; confirm delivery + lands on `/auth/callback`

### D. Railway + domain
- [ ] Set the service's **deploy branch to `main`** (Settings → Source) — was `develop`
- [ ] Domain `sheetless.fitness`; env `APP_ORIGIN=https://sheetless.fitness`, Supabase URL/anon, `AUTH_PASSWORD_ENABLED=false`, `AUTH_ALLOWLIST_ENABLED=true`, `NODE_ENV=production`
- [ ] **Do NOT** set `SUPABASE_SERVICE_ROLE_KEY` on the web service
- [ ] DNS: point `sheetless.fitness` at the Railway service (Railway provides TLS — also satisfies PWA HTTPS)
- [ ] Migrations run as a pre-deploy step, never inside `pnpm start` (see `RAILWAY.md`)

### E. Pre-launch verification
- [ ] `APP_ORIGIN` set to `https://sheetless.fitness` (drives magic-link `emailRedirectTo`)
- [ ] CI is green on `main` — typecheck + lint (`.github/workflows/ci.yml`)
- [ ] `pnpm pwa:verify` passes on the prod build
- [ ] Bypass check: a direct browser `signInWithOtp` for a non-allowlisted email yields **no email** (signup off + `shouldCreateUser:false` + no existing user)
- [ ] Confirm no service-role/demo keys on the prod web service

---

## How to grant someone access (reference)
```sh
# add to allowlist + provision the Supabase user in one go
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm provision:allowed add someone@example.com "note"
# or provision everyone already in the allowed_emails table
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm provision:allowed
# show the allowlist + who is provisioned
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm provision:allowed list
```

## Notes / gotchas
- **Magic link is browser-initiated PKCE** — the anon key reaches the browser, so app-layer email checks are advisory. Invite-only (signup off + provisioned users + `shouldCreateUser:false`) is the real gate.
- **New public tables aren't auto-granted to `service_role`** in this project — the migration grants it explicitly, else the provisioning script hits "permission denied."
- **Password reset stays in the codebase** but is inactive in prod (`AUTH_PASSWORD_ENABLED=false`). It runs locally where password auth is on; re-enable in prod later by flipping the flag.
- Local stays fully open (`enable_signup=true`, password on) so the demo user + e2e keep working.
- Not yet done (deferred, out of scope for now): contact form / waitlist capture; branded Supabase email templates.
