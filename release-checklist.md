# Production release checklist

Magic-link-only auth + invite-only allowlist + staging/prod split.
Started 2026-06-30. Full design: `~/.claude/plans/i-want-to-start-peaceful-russell.md`. Deploy steps: `RAILWAY.md`.

## Resume tomorrow — start here
1. **Commit the code** (currently uncommitted on `develop`): create a branch and commit the changes below.
2. Then work top-to-bottom through **Ops** — each section needs your Supabase / Resend / Railway dashboards.
3. Do **staging first**, verify the full magic-link round-trip, then promote the same build to prod.

## Decisions (locked)
- **Email sender:** Resend, plugged in as Supabase custom SMTP.
- **Whitelist:** Invite-only — disable open signup in Supabase + pre-provision allowed users; magic link uses `shouldCreateUser:false`. App-layer check is UX-only (the anon key reaches the browser, so it isn't the real boundary).
- **Topology:** existing hosted env → **staging.sheetless.fitness**; new prod stack → **sheetless.fitness**.

## Environment topology
| | Local/dev | Staging | Production |
|---|---|---|---|
| Domain | localhost:3000 | staging.sheetless.fitness | sheetless.fitness |
| Supabase | local CLI stack | existing hosted project | **new** hosted project |
| `NODE_ENV` | development | production | production |
| `AUTH_PASSWORD_ENABLED` | unset → on | `true` | `false` |
| `AUTH_ALLOWLIST_ENABLED` | unset → off | `true` | `true` |
| Open signup (dashboard) | on | off | **off** |
| Email | Inbucket | Resend SMTP | Resend SMTP |

---

## Code — DONE & validated ✅ (uncommitted)
- [x] `src/shared/lib/auth-config.ts` — pure `getAuthPolicy(env)` + `parseBooleanFlag` + messages
- [x] `src/domains/account/server/allowlist.ts` *(new)* — `normalizeEmail`, `resolveMagicLinkDecision`, `isEmailAllowed`
- [x] `auth-functions.ts` — `getAuthPolicyFn`, password-flow guards, allowlist gate + `shouldCreateUser`
- [x] `queries.ts` + `routes/auth.tsx` — policy prefetched in loader (no UI flash)
- [x] `AuthPage.tsx` — policy-driven UI (hides password in magic-only mode), neutral anti-enumeration message
- [x] `supabase/migrations/202606300001_add_allowed_emails.sql` *(new)* — table + `is_email_allowed` RPC, RLS-locked, `service_role` grant
- [x] `scripts/provision-allowed-users.mjs` *(new)* — `pnpm provision:allowed`
- [x] `.env.example`, `RAILWAY.md` — flags + invite-only deploy notes
- [x] `tests/auth-policy.test.ts`, `tests/auth-allowlist.test.ts` *(new)*
- [x] Validated: `typecheck` + `lint` clean; **225 unit tests** pass; migration applies on local; RPC/RLS/grants verified via REST; both auth screens screenshotted; e2e smoke + login pass

---

## Ops — TODO (needs dashboards)

### B. Production Supabase project
- [ ] Designate the existing hosted project as **staging** (point staging.sheetless.fitness at it)
- [ ] Create a **new** hosted Supabase project for **production**
- [ ] Capture: project URL, anon key, service-role key, **Transaction pooler** DB URI (IPv4, port 6543)
- [ ] Migrate prod: `SUPABASE_DB_URL=<prod pooler> pnpm db:migrate:dry-run` then `pnpm db:migrate`
- [ ] Auth → turn **OFF** "Allow new users to sign up" (the invite-only hard boundary)
- [ ] Auth → URL config: Site URL `https://sheetless.fitness`, redirect `https://sheetless.fitness/auth/callback`
- [ ] Seed allowlist + provision: add your email to `allowed_emails`, then
      `SUPABASE_URL=<prod> SUPABASE_SERVICE_ROLE_KEY=<prod> pnpm provision:allowed` — verify a login

### C. Resend email
- [ ] Create Resend account; verify the **sheetless.fitness** domain (add SPF/DKIM/DMARC DNS records)
- [ ] Create an API key
- [ ] In **each** Supabase project (prod + staging) → Auth → SMTP: host `smtp.resend.com`, port `465`, user `resend`, password = API key, sender e.g. `login@sheetless.fitness`, name `Sheetless`
- [ ] Send a real magic link end-to-end; confirm delivery + lands on `/auth/callback`

### D. Railway + domains
- [ ] **Staging** (existing service): domain `staging.sheetless.fitness`; env `APP_ORIGIN=https://staging.sheetless.fitness`, staging Supabase URL/anon, `AUTH_PASSWORD_ENABLED=true`, `AUTH_ALLOWLIST_ENABLED=true`, `NODE_ENV=production`
- [ ] **Production** (new service): domain `sheetless.fitness`; env `APP_ORIGIN=https://sheetless.fitness`, prod Supabase URL/anon, `AUTH_PASSWORD_ENABLED=false`, `AUTH_ALLOWLIST_ENABLED=true`, `NODE_ENV=production`
- [ ] **Do NOT** set `SUPABASE_SERVICE_ROLE_KEY` on either web service
- [ ] DNS: point both domains at their Railway services (Railway provides TLS — also satisfies PWA HTTPS)
- [ ] Migrations run as a pre-deploy step / from CI, never inside `pnpm start` (see `RAILWAY.md`)

### E. Pre-launch verification
- [ ] `APP_ORIGIN` correct per env (drives magic-link `emailRedirectTo`)
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
- **Staging keeps password auth** (`AUTH_PASSWORD_ENABLED=true`) for convenience while still testing the gate.
- Local stays fully open (`enable_signup=true`, password on) so the demo user + e2e keep working.
- Not yet done (deferred, out of scope for now): contact form / waitlist capture; branded Supabase email templates.
