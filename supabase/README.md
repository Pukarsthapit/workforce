# Supabase database foundation

This first migration establishes a shared-database tenant model and the
relational foundation for identity membership, organisation structure, people,
timesheets, clock events, and audit history. Tenant-owned relations carry
`tenant_id`; foreign keys include the tenant so cross-tenant references cannot
be created accidentally.

## Google sign-in

The production sign-in uses Google OAuth through Supabase Auth. In Google
Cloud, create an OAuth client for a web application. Add the app origin as an
authorized JavaScript origin and the Supabase Auth callback
`https://<project-ref>.supabase.co/auth/v1/callback` as an authorized redirect
URI. Configure the client ID and secret in the Supabase Dashboard under
**Authentication → Providers → Google**. Add the deployed app URL and
`http://localhost:5173` to Supabase Auth's allowed redirect URLs.

Configure these deployment environment variables:

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase publishable/anon key>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<Supabase publishable/anon key>
SUPABASE_SERVICE_ROLE_KEY=<server-only service_role key>
WORKFORCE_SUPER_ADMIN_EMAIL=pukarsthapit91@gmail.com
```

The `VITE_` values are public and are only used by the browser SDK. The
service-role key is used exclusively by the Vercel serverless session endpoint;
never prefix it with `VITE_` or expose it to the browser. The super-admin
email is allowlisted server-side and must sign in with a verified Google
account. On first sign-in it bootstraps the initial `Workforce` tenant and
admin membership. The admin can sign in without an employee row.

Every other account must match exactly one active employee email in
`public.people` (case-insensitively). Suspended, leaver, archived, missing, or
ambiguous employee records are denied. A successful first employee sign-in
creates the corresponding membership and account link. This authorizes login;
it does not yet make every feature API database-backed.

## Local setup

Install Docker Desktop and the Supabase CLI, then run:

```sh
supabase start
supabase db reset
```

This applies migrations to the local Supabase stack. To test Google OAuth
locally, enable the Google provider in `config.toml`, add its credentials to
the `[auth.external.google]` section, and allowlist `http://localhost:5173` in
Google and Supabase Auth.

## Application access model

The browser must call a trusted API/Edge Function, not query workforce tables
directly. `anon` and `authenticated` receive no table or sequence privileges.
The migration includes tenant-membership RLS policies as defense in depth for
future read grants; application authorization, including role capabilities
and manager/location scope, must still be enforced by the trusted API.
Never expose the Supabase `service_role` key to the browser.

Supabase signup is enabled because the first Google OAuth sign-in creates an
Auth identity. That identity alone grants no application access: the server validates
the signed-in user with Supabase Auth and resolves the verified email through
the restricted `public.resolve_workforce_login` function. That function is
executable only by `service_role`, and the key never reaches the client.

## Current limits

This is still a first persistence slice, not a complete production backend.
Only Google sign-in/session resolution has a trusted Vercel endpoint. Leave,
rota, onboarding, notices, approvals, notification delivery, storage uploads,
the remaining API handlers, fine-grained authorization scopes, and data
migration from the demo seed remain to be implemented. Sensitive person data
is represented only as encrypted ciphertext and must be encrypted by a
trusted application service with keys held outside Postgres before use.
