# HeistMind — Setup Checklist

## Phase 1: Gather Credentials

- [x] **Supabase access token** — https://supabase.com/dashboard/account/tokens (starts with `sbp_`)
- [x] **Supabase organization ID** — Dashboard > Org Settings
- [x] **Database password** — strong password (store in a password manager)
- [x] **GitHub PAT** — https://github.com/settings/tokens > scopes: `repo`, `actions`
- [x] **GitHub repo** — in `owner/name` format

## Phase 2: Re-initialize Terraform

```bash
cd infra/terraform
rm -rf .terraform .terraform.lock.hcl
terraform init
```

## Phase 3: Create terraform.tfvars

```bash
cp terraform.tfvars.example terraform.tfvars
# Fill in all values from Phase 1
```

## Phase 4: Import Existing Supabase Project

If you already have a Supabase project in Terraform state:

```bash
terraform state list | grep supabase_project
# If missing, import it:
terraform import supabase_project.heistmind <project-id>
```

## Phase 5: Apply

```bash
terraform plan     # Preview
terraform apply    # Provision Supabase + set GitHub secrets
```

## Phase 6: Link and Push Migrations

```bash
cd ../..
supabase link --project-ref $(cd infra/terraform && terraform output -raw supabase_project_id)
supabase db push
```

## Phase 7: Regenerate Types

```bash
export SUPABASE_PROJECT_ID=$(cd infra/terraform && terraform output -raw supabase_project_id)
pnpm db:types
pnpm type-check
```

## Phase 8: Write .env.local

```bash
cd infra/terraform
PROJECT_ID=$(terraform output -raw supabase_project_id)
URL=$(terraform output -raw supabase_url)
ANON=$(terraform output -raw supabase_anon_key)
SRK=$(terraform output -raw supabase_service_role_key)
cd ../..

cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=${URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON}
SUPABASE_SERVICE_ROLE_KEY=${SRK}
SUPABASE_PROJECT_ID=${PROJECT_ID}
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
EOF

cp .env.local apps/web/.env.local
```

## Phase 9: Manual — Discord OAuth

1. **Supabase Dashboard** > Authentication > Providers > Discord — enable, enter client ID + secret
2. **Supabase Dashboard** > Authentication > URL Configuration — set site URL + redirect URLs
3. **Discord Developer Portal** > OAuth2 > Redirects — add `https://<project-id>.supabase.co/auth/v1/callback`

## Phase 10: Manual — Vercel Env Vars

Set in Vercel dashboard (Settings > Environment Variables):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Phase 11: Verify

```bash
pnpm validate
pnpm dev:web
# Test Discord sign-in flow
```

Check GitHub repo > Settings > Secrets — should have `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN`.

---

After initial setup, just run `pnpm infra:setup` to re-sync everything.
