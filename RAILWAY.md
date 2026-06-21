# Railway Deployment

This app is configured to deploy as a small TanStack Start Node service on Railway.

## Railway settings

- Builder: Nixpacks
- Build command: `pnpm build`
- Start command: `pnpm start`
- Healthcheck path: `/today`

These are also captured in `railway.json`, so Railway should pick them up automatically after the repo is connected.

## Required variables

Set these in the Railway service variables:

```sh
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
APP_ORIGIN=https://your-railway-domain.up.railway.app
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

Railway provides the `PORT` environment variable at runtime; the existing `srvx` start command is expected to bind to it automatically.