# Render Deployment

Sheetless is deployed as one full-stack TanStack Start web service. The SSR application, same-origin
server functions, and bearer-authenticated `/api/v1` mobile routes are all built from `apps/web` and
served by the same Nitro process.

There is intentionally no `render.yaml` in this repository. Configure the service in the Render
dashboard.

## Monorepo settings

Leave **Root Directory empty** so Render checks out the complete pnpm workspace. Setting it to
`apps/web` would make `packages/api`, `packages/core`, `packages/tokens`, the root lockfile, and the
Supabase migrations unavailable during the build.

Use these commands from the repository root:

```sh
# Build command
pnpm install --frozen-lockfile && pnpm build

# Start command
pnpm start

# Pre-deploy command
pnpm db:migrate
```

The root `build` and `start` scripts delegate to `@sheetless/web`. The package writes its production
output to `apps/web/.output` and starts `apps/web/.output/server/index.mjs` from the package working
directory.

Run migrations as a pre-deploy step rather than during runtime startup. This prevents every restart
or replica from attempting the same migration and ensures a failed migration stops the release before
new code is served. If the service does not support a pre-deploy command, run `pnpm db:migrate`
manually or from CI before deploying.

Optional Render build-filter include paths:

```txt
apps/web/**
packages/**
supabase/**
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
.node-version
```

Render build filters are relative to the repository root even when a service root directory is set.
See [Render's monorepo documentation](https://render.com/docs/monorepo-support).

## Required environment variables

Configure these on the Render web service:

```sh
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
APP_ORIGIN=https://www.sheetless.fitness
SUPABASE_DB_URL=postgresql://...
NODE_ENV=production
AUTH_PASSWORD_ENABLED=false
AUTH_ALLOWLIST_ENABLED=false
```

`SUPABASE_DB_URL` is used only by the pre-deploy migration command. Prefer Supabase's transaction
pooler connection string for hosted runners. Percent-encode special characters in the database
password.

Do not configure `SUPABASE_SERVICE_ROLE_KEY` on the web service. It is only for local administrative
scripts such as demo seeding and allowlist provisioning. The application and mobile API use the
public Supabase key plus the authenticated user's cookie or JWT, leaving RLS authoritative.

The repository is pinned to Node 22 through `package.json` and `.node-version`. Render supplies
`PORT`; Nitro reads it automatically.

## Authentication and domains

`APP_ORIGIN` must be the canonical public origin users browse because browser Magic Link and Google
callbacks use it to create `/auth/callback` redirect URLs. The PKCE verifier is host-scoped, so the
callback must return to the same canonical host that initiated sign-in. Redirect the apex domain and
the raw Render hostname to the canonical host.

In Supabase Authentication URL Configuration, set:

```txt
Site URL: https://www.sheetless.fitness

Redirect URLs:
https://www.sheetless.fitness/auth/callback
http://localhost:3000/auth/callback
sheetless://auth/callback
```

For open Magic Link registration, set `AUTH_ALLOWLIST_ENABLED=false` and enable email signups in
Supabase. To gate registration later, set `AUTH_ALLOWLIST_ENABLED=true`, disable Supabase email
signups, and provision testers with the root administrative script.

Google OAuth requires the provider to be enabled in Supabase. The Google client uses the canonical
web origin as its authorized JavaScript origin and Supabase's own `/auth/v1/callback` URL as its
authorized redirect URI.

## Local production check

From the repository root:

```sh
pnpm build
pnpm start
```

Then verify the marketing page, browser authentication, and a representative `/api/v1` response on
`http://localhost:3000`.
