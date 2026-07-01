# Railway Deployment

This app follows the TanStack Start Railway guidance: use the Nitro Vite plugin, push the repo to GitHub, and let Railway's Nixpacks detection deploy the app from the normal package scripts.

Railway auto-deploys the **`main`** branch (configured in the service dashboard under Settings → Source — there is no deploy config in this repo). All development happens locally; merge to `main` to ship a release.

## Package scripts

Railway should detect these automatically:

```sh
pnpm build
pnpm start
```

Run database migrations as a separate pre-deploy step, not as part of `pnpm start`:

```sh
pnpm run db:migrate
```

On Railway, the field may not appear until you click **Deploy** → **+ Add pre-deploy step**. Add that step and set its command to `pnpm run db:migrate`. Keep the normal build and start commands as `pnpm build` and `pnpm start`.

If **+ Add pre-deploy step** is not available for the service, use one of these fallbacks instead:

- Preferred fallback: run `pnpm run db:migrate` manually or from CI before triggering/deploying the Railway release.
- Acceptable temporary fallback for a single-instance app: set Railway's custom start command to `pnpm run db:migrate && pnpm start`, then move it back to `pnpm start` once a proper pre-deploy/CI step is available.
- Avoid using `pnpm build && pnpm run db:migrate` as the normal build command unless you explicitly want builds to mutate the remote database.

Why this should not be part of the runtime start script:

- Every restart or replica boot would try to run migrations again.
- Multiple instances can race each other during deploys.
- The app runtime would need a privileged database URL it should not otherwise use.
- A migration failure should stop a release before new app code serves traffic.

For a safe manual check before enabling the pre-deploy command, run the dry-run script with the same Railway/Supabase database URL:

```sh
pnpm run db:migrate:dry-run
```

The production start script runs Nitro's Node output:

```sh
node .output/server/index.mjs
```

## Required variables

Set these in the Railway service variables:

```sh
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
APP_ORIGIN=https://www.sheetless.fitness
SUPABASE_DB_URL=postgresql://...
NODE_ENV=production
AUTH_ALLOWLIST_ENABLED=false
```

> User-facing auth is **Magic Link + Google** (no email/password). `AUTH_ALLOWLIST_ENABLED=false`
> opens Magic Link to new users (`shouldCreateUser=true`). The "Continue with Google" button is
> always shown by the app; whether it actually works is decided by the **Supabase Google provider**
> (dashboard in prod — see below). Email/password stays in the code but is **off in production** by
> default (`NODE_ENV=production`), so leave `AUTH_PASSWORD_ENABLED` unset — it's used only for local
> dev + e2e. To re-gate Magic Link to an allowlist later, set `AUTH_ALLOWLIST_ENABLED=true` and turn
> off Supabase signup (the `allowed_emails` tooling is still in place).

Do **not** set `SUPABASE_SERVICE_ROLE_KEY` on the web service — it is only used by offline
admin scripts (demo seeding, allowlist provisioning).

`SUPABASE_DB_URL` is only for migrations. On Railway, use the Supabase **Transaction pooler** connection string because Railway may not support IPv6 direct database connections. In the Supabase dashboard, copy it from **Connect** → **Transaction pooler** in URI format. It should look like `postgresql://postgres.<project-ref>:<password>@...pooler.supabase.com:6543/postgres`, not `https://...supabase.co` and not `db.<project-ref>.supabase.co:5432`. If the database password contains special characters, percent-encode it in the URL.

If the remote database already has tables that were created manually, reconcile it before turning on automatic pushes; otherwise the initial migration may fail because Supabase's migration history table does not know those objects already exist. For an empty remote database, `pnpm run db:migrate` should apply the committed files under `supabase/migrations/` in order.

The app is pinned to Node 22 with `engines.node` and `.node-version`. This keeps Railway away from Node 24/Corepack combinations that can fail before the app build starts. If Railway still selects Node 24 or newer, add this Railway service variable as an extra override:

```sh
NIXPACKS_NODE_VERSION=22
```

`APP_ORIGIN` must be the **canonical public host** users actually browse (`https://www.sheetless.fitness`),
because the Magic Link and Google auth callbacks use it to generate `/auth/callback` redirect URLs.
The PKCE code-verifier is a host-scoped cookie: if the callback lands on a different host than the
one the user started on (e.g. the raw `*.up.railway.app` domain, or apex vs. `www`), the verifier
cookie is missing and sign-in fails with "pkce code verifier not found". Point apex `sheetless.fitness`
and the raw Railway domain at a 301 → `www` so users can only initiate on the allowlisted host.

## Sign-ups & auth (Magic Link + Google)

User-facing sign-in is **Magic Link** (email one-tap) and **Google** (OAuth). Email/password is off in
production (local-dev + e2e only). Three things must line up:

- **Railway flag:** `AUTH_ALLOWLIST_ENABLED=false` (open Magic Link — creates new users, no allowlist).
  The "Continue with Google" button is always shown by the app; whether it works is decided by the
  Supabase Google provider below.
- **Supabase dashboard → Authentication:**
  - **Providers → Email:** "Allow new users to sign up" **ON** (Magic Link creates accounts). This is
    the real boundary — the browser OTP call uses the public anon key, so if the dashboard blocks
    signup the flag alone won't open it.
  - **Providers → Google:** **enable** it and paste the OAuth **client ID + secret** from Google Cloud
    (below).
  - **SMTP:** a working custom SMTP sender is required — Magic Link sends mail; without it, sign-ins
    silently fail. (See `release-checklist.md` → Resend.)
- **Google Cloud Console:** create an OAuth **Web** client. Authorized JavaScript origin
  `https://www.sheetless.fitness`; Authorized redirect URI
  `https://<project-ref>.supabase.co/auth/v1/callback` (Supabase's own OAuth callback — NOT the app's
  `/auth/callback`).

To re-gate Magic Link to an allowlist later, set `AUTH_ALLOWLIST_ENABLED=true`, turn off Supabase
"Allow new users to sign up", and add testers offline (service-role key — never on the web service):

```sh
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm provision:allowed add someone@example.com "note"
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm provision:allowed list
```

## Supabase auth URLs

In Supabase → Authentication → URL Configuration, set the **Site URL** to the app origin:

```txt
https://www.sheetless.fitness
```

and add the callback to **Redirect URLs** (Supabase falls back to Site URL for any redirect target
not listed here, so the app host must be present):

```txt
https://www.sheetless.fitness/auth/callback
http://localhost:3000/auth/callback
```

## Local production check

Before deploying, run:

```sh
pnpm build
pnpm start
```

Railway provides the `PORT` environment variable at runtime, and Nitro's Node server reads it automatically.

Supabase studio: http://127.0.0.1:54323