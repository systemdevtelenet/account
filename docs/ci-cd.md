# CI/CD

The GitHub Actions workflows live in `.github/workflows/`.

## What the main workflow does

`.github/workflows/ci-cd.yml`:

- On every pull request into `main`, it runs lint, TypeScript checking, tests, and a production build. Same-repository pull requests also get a Vercel preview deployment.
- On every push to `main`, it runs the same checks and then deploys to Vercel production.
- Pull requests from forks run checks only. They do not get access to deployment secrets or preview deployments.

## Other workflows

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `nightly-checks.yml` | Daily at 03:17 UTC, or manual | Runs the full `npm run ci` sequence on the default branch. |
| `deploy-manual.yml` | Manual `workflow_dispatch` | Deploys `preview` or `production` on demand using the same Vercel secrets. |
| `release.yml` | Push of a `v*` tag | Creates a GitHub Release with generated notes for the tag. |

## Required GitHub secrets

Add these under **Settings → Secrets and variables → Actions**:

| Secret | Purpose |
| --- | --- |
| `VERCEL_TOKEN` | Vercel API token with access to the project |
| `VERCEL_ORG_ID` | Vercel organization or team ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

The workflow also declares `preview` and `production` GitHub environments. Configure any environment-specific protection rules in **Settings → Environments** if needed.

Vercel supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to the deployed build through the Vercel project environment. The CI verification job uses harmless placeholder values so it can build without production secrets.

## Runtime and tooling

- Node.js 22
- npm with `npm ci` from `package-lock.json`
- Vercel CLI pinned to `66.6.0`

## Local equivalents

Run the same sequence as the CI `verify` job:

```bash
npm run ci
```

Or run each step individually:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run typecheck` runs `next typegen` before `tsc --noEmit`, because Next.js route helpers such as `LayoutProps` are generated and are not present in a clean checkout.

If you host somewhere other than Vercel, keep the `verify` job and replace the two deploy jobs with your platform's build and release steps.
