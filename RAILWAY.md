# Railway Deployment

This app follows the TanStack Start Railway guidance: use the Nitro Vite plugin, push the repo to GitHub, and let Railway's Nixpacks detection deploy the app from the normal package scripts.

## Package scripts

Railway should detect these automatically:

```sh
pnpm build
pnpm start
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
```

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