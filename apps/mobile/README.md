# Sheetless mobile development client

This Expo app is the online-first native workout slice. Copy `.env.example` to `.env.local`, fill
the public Supabase key, then run `pnpm dev:mobile` from the repository root.

For a physical device, use LAN-reachable HTTPS URLs instead of `127.0.0.1`. Add
`sheetless://auth/callback` to the hosted Supabase Authentication redirect allowlist before testing
magic links. The same callback is already present in the local Supabase configuration.

Development builds are configured in `eas.json`; no production or submission profiles are included.
