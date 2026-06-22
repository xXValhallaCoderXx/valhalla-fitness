# Railway Deployment

This app follows the TanStack Start Railway guidance: use the Nitro Vite plugin, push the repo to GitHub, and let Railway's Nixpacks detection deploy the app from the normal package scripts.

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
APP_ORIGIN=https://your-railway-domain.up.railway.app
SUPABASE_DB_URL=postgresql://...
```

`SUPABASE_DB_URL` is only for migrations. On Railway, use the Supabase **Transaction pooler** connection string because Railway may not support IPv6 direct database connections. In the Supabase dashboard, copy it from **Connect** → **Transaction pooler** in URI format. It should look like `postgresql://postgres.<project-ref>:<password>@...pooler.supabase.com:6543/postgres`, not `https://...supabase.co` and not `db.<project-ref>.supabase.co:5432`. If the database password contains special characters, percent-encode it in the URL.

If the remote database already has tables that were created manually, reconcile it before turning on automatic pushes; otherwise the initial migration may fail because Supabase's migration history table does not know those objects already exist. For an empty remote database, `pnpm run db:migrate` should apply the committed files under `supabase/migrations/` in order.

The app is pinned to Node 22 with `engines.node` and `.node-version`. This keeps Railway away from Node 24/Corepack combinations that can fail before the app build starts. If Railway still selects Node 24 or newer, add this Railway service variable as an extra override:

```sh
NIXPACKS_NODE_VERSION=22
```

`APP_ORIGIN` must match the public Railway URL because password reset and magic-link auth callbacks use it to generate `/auth/callback` redirect URLs.

## Supabase auth URLs

In Supabase Auth URL configuration, add the Railway app URL:

```txt
https://your-railway-domain.up.railway.app/auth/callback
```

Also set the site URL to the Railway app origin:

```txt
https://your-railway-domain.up.railway.app
```

## Local production check

Before deploying, run:

```sh
pnpm build
pnpm start
```

Railway provides the `PORT` environment variable at runtime, and Nitro's Node server reads it automatically.

Supabase studio: http://127.0.0.1:54323