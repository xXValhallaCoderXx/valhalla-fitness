# Production release checklist

**Magic Link + "Sign in with Google"** sign-up (no email/password for users) on a **single hosted
environment**. Deploy steps: `RAILWAY.md`.

> Auth model (2026-07): user-facing sign-in is **Magic Link** (email one-tap) and **Google** (OAuth).
> Email/password stays in the code but is **off in production** (local dev + e2e only). The invite-only
> allowlist code + `allowed_emails` table are kept but dormant — flip the flags at the bottom to re-gate.

## Resume here
1. **Ship the current code to `main`**: merge `develop` → `main`. Railway auto-deploys `main`.
2. Work top-to-bottom through **Ops** — each section needs your Google Cloud / Supabase / Resend / Railway dashboards.
3. Run the full **Pre-launch verification** on the live URL before sharing it.

## Decisions (locked)
- **Sign-in methods:** Magic Link + Google OAuth. Open + self-serve (new users create accounts).
- **No email/password** for users (kept in code, off in prod, used by the local demo user + e2e).
- **Email sender:** Resend, plugged into Supabase as custom SMTP — Magic Link needs working email.
- **Topology:** **one** environment — the existing hosted stack **is** production (one Railway
  service, one Supabase project). Local Supabase covers dev + migrations. No staging.
- **Deploy:** Railway auto-deploys `main`; all dev is local; merge to `main` to release.
- **Invite-only** remains available as a fallback (see the bottom of this file).
- **Session lifetime:** stay signed in until explicit logout or Supabase revocation; keep the
  one-hour access-token expiry and let the refresh-token cookie rotate silently.

## Environment topology
| | Local/dev | Production |
|---|---|---|
| Domain | localhost:3000 | sheetless.fitness |
| Supabase | local CLI stack | existing hosted project |
| Deploy branch | — | `main` |
| `NODE_ENV` | development | production |
| `AUTH_ALLOWLIST_ENABLED` | unset → off | **`false`** (open Magic Link) |
| `AUTH_PASSWORD_ENABLED` | unset → on (local only) | unset → off |
| "Allow new users to sign up" (dashboard) | on | **on** |
| Google provider (dashboard) | off | **on** (client id + secret) |
| Email | Inbucket | Resend SMTP |

## What's already built (no code change needed to open sign-ups)
The auth posture is **env-flag driven** (`src/shared/lib/auth-config.ts` → `getAuthPolicy`): Magic
Link, the dormant allowlist, and the local-only password path are all in the codebase. The "Continue
with Google" button is always shown; whether Google works is decided by the Supabase provider, and
`/auth/callback` already exchanges the OAuth `?code=`. Google users' names are captured to
`profiles.display_name`. Typecheck/lint clean; unit suite (incl. `auth-policy.test.ts`) green.

---

## Ops — go-live steps (need dashboards)

### Google Cloud Console (for "Sign in with Google")
- [ ] Configure the **OAuth consent screen** (external; app name, support email, logo, scopes:
      email + profile).
- [ ] Create an **OAuth client → Web application**:
  - Authorized JavaScript origin: `https://sheetless.fitness`
  - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback` (Supabase's OAuth
    callback — **not** the app's `/auth/callback`).
- [ ] Copy the **client ID + client secret** for the Supabase step below.

### Supabase (the existing hosted project = production)
- [ ] Use the **existing hosted project** as production — do **not** create a new one.
- [ ] Capture: project URL, anon key, service-role key, **Transaction pooler** DB URI (IPv4, port 6543).
- [ ] Migrate the prod DB: `SUPABASE_DB_URL=<pooler> pnpm db:migrate:dry-run`, then `pnpm db:migrate`.
- [ ] Auth → Providers → **Email**: "Allow new users to sign up" **ON**.
- [ ] Auth → Providers → **Google**: enable + paste the client ID + secret from Google Cloud.
- [ ] Auth → URL Configuration: Site URL `https://sheetless.fitness`; add redirect
      `https://sheetless.fitness/auth/callback`.
- [ ] Auth → Sessions: leave time-boxing, inactivity timeout, and single-session enforcement
      disabled so trusted devices remain signed in until logout.
- [ ] Auth → Rate limits: review the email + sign-up limits (open sign-up widens the abuse surface).
- [ ] Confirm **no demo/seed users** in prod (demo accounts are local-only — never run `pnpm demo:seed`
      against production).

### Resend email (required — Magic Link sends mail)
- [ ] Create a Resend account; verify the **sheetless.fitness** domain (add SPF/DKIM/DMARC DNS records).
- [ ] Create an API key.
- [ ] Supabase → Auth → **SMTP**: host `smtp.resend.com`, port `465`, user `resend`, password = API
      key, sender e.g. `login@sheetless.fitness`, name `Sheetless`.
- [ ] Send a real Magic Link end-to-end; confirm it **lands in the inbox, not spam** (test Gmail + Outlook).

### Railway + domain
- [ ] Set the service's **deploy branch to `main`** (Settings → Source).
- [ ] Env: `APP_ORIGIN=https://sheetless.fitness`, `SUPABASE_URL`/`SUPABASE_ANON_KEY`,
      `AUTH_ALLOWLIST_ENABLED=false`, `NODE_ENV=production`. Leave `AUTH_PASSWORD_ENABLED` unset.
- [ ] **Do NOT** set `SUPABASE_SERVICE_ROLE_KEY` on the web service.
- [ ] Migrations run as a **pre-deploy step**, never inside `pnpm start` (see `RAILWAY.md`).
- [ ] DNS: point `sheetless.fitness` at the Railway service (Railway provides TLS — also satisfies PWA HTTPS).

---

## Pre-launch verification (on the live URL)
**Auth (the core of this release):**
- [ ] **"Continue with Google"** with a fresh Google account → Google consent → returns to
      `/auth/callback?code=…` → lands signed-in on `/today`; `profiles.display_name` is set from Google.
- [ ] **Magic Link** with a brand-new email → link arrives → clicking creates the account and lands
      signed-in on `/today`.
- [ ] Close the installed PWA completely, reopen it, and confirm `/today` loads without another
      login; inspect the `sb-*-auth-token*` cookies and confirm they have a future expiry.
- [ ] Leave the PWA signed in past the one-hour access-token lifetime and confirm the next app request
      refreshes silently; then use **Log out** and confirm reopening requires authentication.
- [ ] No password UI is shown (prod is Magic Link + Google only).

**Smooth-release basics:**
- [ ] CI green on `main` — typecheck + lint (`.github/workflows/ci.yml`).
- [ ] `pnpm pwa:verify` passes on the prod build; app installs + loads over HTTPS.
- [ ] Confirm **no service-role/demo keys** on the prod web service.
- [ ] End-to-end smoke as a brand-new user: sign in → onboarding (set estimates, pick a plan) → start
      a programme → log a set → progression review. Nothing 500s.
- [ ] Magic-Link emails not landing in spam (from the Resend step).

## Post-launch / operate
- [ ] **Feedback channel** ready — the in-product Beta feedback form ships in the avatar menu
      (`feedback_events` + `pnpm feedback:report` to read submissions); decide who checks it and how
      often, since collecting feedback is the point of this launch.
- [ ] **Abuse watch:** open sign-up invites junk/bot accounts — watch Supabase Auth users + email send
      volume the first days; keep the invite-only fallback ready.
- [ ] **Backups:** confirm the hosted Supabase project's backup/retention for your plan.
- [ ] **Error visibility:** know where to read Railway logs + Supabase logs; consider a lightweight
      error tracker before wider sharing.
- [ ] **Basic privacy note:** you're now collecting real user emails/accounts — a short privacy/terms
      line is worth adding.

## Known beta limitations (disclose to testers)

- **Offline mid-session reload loses unsynced sets.** Set logging is optimistic and survives a flaky
  connection while the tab stays open, but the app is server-rendered with no offline navigation
  fallback and no persisted query cache: reloading (or reopening) mid-session without a connection
  fails to load, and any sets that hadn't synced ("Set not saved" state) are gone. Decision for this
  beta: disclose, don't fix — verify the exact behaviour once in airplane mode before sharing, and
  tell testers to keep the tab open until they're back online.

---

## Fallback: re-gate Magic Link to invite-only
Set `AUTH_ALLOWLIST_ENABLED=true` in Railway, turn "Allow new users to sign up" **off** in Supabase,
then add testers (offline, service-role key — never on the web service):
```sh
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm provision:allowed add someone@example.com "note"
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm provision:allowed list
```

## Notes / gotchas
- **Dashboard toggles are the real boundary.** Magic-Link OTP + Google OAuth start in the browser with
  the public anon key, so the app flags only take effect if Supabase's signup + Google provider are
  also configured. Flags and dashboard must agree.
- **Email must work before launch.** Magic Link is the only email path now; a broken SMTP means new
  users can't sign in. Verify Resend end-to-end first.
- **Google redirect URI is Supabase's, not the app's** — `https://<project-ref>.supabase.co/auth/v1/callback`.
- Local stays fully open (password on, `enable_signup=true`) so the demo user + e2e keep working;
  `supabase/config.toml` is local-only and does not affect prod.
