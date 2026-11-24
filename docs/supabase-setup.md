# Operation System database configuration

The current database is **CTNP Database** (`frztjabyspmlozisovpt`). Set these
variables in `.env.local` for local development and in the hosting environment
for deployed builds:

```dotenv
SUPABASE_URL=https://frztjabyspmlozisovpt.supabase.co
SUPABASE_ANON_KEY=<public anon key from CTNP Database>
SUPABASE_SERVICE_ROLE_KEY=<server-only service role key from CTNP Database>
```

All three values must belong to the same Supabase project. Keep the service role
key server-side, and never commit actual keys. Restart the app after changing
local environment values; rebuild and redeploy after changing hosted values.

## Database contract

- Roster and workforce queries require `accounts`, `employees`,
  `employee_assignments`, `positions`, and `statuses`.
- Dashboard access requires a confirmed Supabase Auth email that uniquely matches
  an employee email, company email, or personal email, plus a supported employee
  role in `roles`. Admins see the main dashboard; team leads also need a current
  assignment to an active account. Other roles remain denied.
- Notifications require `notifications`. The recipient is the employee resolved
  during authorization; `employee_auth_links` is not required.
- `employee_separation_history` is optional and currently absent. Separation
  history and attrition rates remain unavailable until genuine dated history is
  supplied. Do not treat missing history as a zero attrition rate.

Email/password authentication is enabled in CTNP Database. Google OAuth was
disabled when checked on November 19, 2026. Google sign-in requires enabling the
provider with its OAuth credentials and configuring the app's `/auth/callback`
URL in Supabase's allowed redirect URLs.

## Verification

Run the notification authorization regression checks with:

```bash
node --test tests/supabase-compatibility.test.mjs
npx tsc --noEmit
npm run build
```

The regression checks use fixtures with no auth-link table and verify that an
authorized employee sees only their own notifications. They require no real keys
and do not modify the live database.
