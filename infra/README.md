# HeistMind Infrastructure

Terraform manages **Supabase** (project + settings) and **GitHub Actions secrets**. Everything else (Vercel, Cloudflare, Discord OAuth) is configured through their respective dashboards.

## Quick Start

```bash
pnpm infra:setup
```

Idempotent — safe to run repeatedly. Prompts for credentials on first run.

Flags:

- `--ci` — non-interactive (requires `terraform.tfvars` to exist)
- `--skip-db` — skip migration push and type generation

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) >= 1.142.2
- pnpm >= 9.15.0

## Credentials Required

| Credential               | Where to get it                                                |
| ------------------------ | -------------------------------------------------------------- |
| Supabase access token    | https://supabase.com/dashboard/account/tokens                  |
| Supabase organization ID | Dashboard > Org Settings                                       |
| GitHub PAT               | https://github.com/settings/tokens — `repo` + `actions` scopes |

## What Terraform Manages

| Resource                        | File          |
| ------------------------------- | ------------- |
| Supabase project + API settings | `supabase.tf` |
| Supabase API keys (read-only)   | `supabase.tf` |
| GitHub Actions secrets (3)      | `github.tf`   |

## What's Manual (Dashboard)

- **Vercel** — env vars, project settings, domain config
- **Cloudflare** — DNS records
- **Discord OAuth** — Supabase auth provider config + Discord Developer Portal redirect URLs

## Day-to-Day

| Change             | What to do                                            |
| ------------------ | ----------------------------------------------------- |
| Re-sync infra      | `pnpm infra:setup`                                    |
| Preview changes    | `pnpm infra:plan`                                     |
| New migration      | Add SQL to `supabase/migrations/`, run `pnpm db:push` |
| Rotate DB password | Update `terraform.tfvars`, run `pnpm infra:setup`     |
| Add GitHub secret  | Add to `github.tf`, run `pnpm infra:setup --skip-db`  |

## Disaster Recovery

```bash
cd infra/terraform && terraform destroy
cd ../.. && pnpm infra:setup
```

Then redo manual steps: Vercel env vars, Discord OAuth, Cloudflare DNS.
