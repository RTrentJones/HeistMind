#!/usr/bin/env bash
#
# Idempotent Supabase + GitHub secrets setup for HeistMind.
# Safe to run repeatedly — Terraform is inherently idempotent.
#
# Usage:
#   ./scripts/setup-supabase.sh                # Interactive: prompts for missing values
#   ./scripts/setup-supabase.sh --ci           # Non-interactive: requires terraform.tfvars
#   ./scripts/setup-supabase.sh --skip-db      # Skip migration push + type gen
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$REPO_ROOT/infra/terraform"
ENV_LOCAL="$REPO_ROOT/.env.local"
WEB_ENV_LOCAL="$REPO_ROOT/apps/web/.env.local"

CI_MODE=false
SKIP_DB=false
for arg in "$@"; do
  case "$arg" in
    --ci)      CI_MODE=true ;;
    --skip-db) SKIP_DB=true ;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
info()  { echo -e "\033[1;34m[info]\033[0m  $*"; }
ok()    { echo -e "\033[1;32m[ok]\033[0m    $*"; }
fail()  { echo -e "\033[1;31m[error]\033[0m $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "'$1' is required but not installed."
}

prompt_value() {
  local var_name="$1" prompt_text="$2" is_secret="${3:-false}"
  local current_val="${!var_name:-}"
  if [[ -n "$current_val" ]]; then return; fi
  if $CI_MODE; then fail "Required variable $var_name is not set (running in --ci mode)."; fi
  if $is_secret; then
    read -rsp "$prompt_text: " "$var_name"; echo
  else
    read -rp "$prompt_text: " "$var_name"
  fi
  [[ -n "${!var_name:-}" ]] || fail "$var_name cannot be empty."
  export "$var_name"
}

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------
info "Checking required tools..."
require_cmd terraform
require_cmd supabase
require_cmd pnpm

# ---------------------------------------------------------------------------
# Step 1: Terraform init
# ---------------------------------------------------------------------------
info "Step 1/6: Terraform init"
cd "$TF_DIR"

if [[ ! -d .terraform ]]; then
  terraform init -input=false
else
  ok "Already initialized."
fi

# ---------------------------------------------------------------------------
# Step 2: Ensure terraform.tfvars exists
# ---------------------------------------------------------------------------
if [[ ! -f terraform.tfvars ]]; then
  info "No terraform.tfvars found. Collecting values..."

  prompt_value TF_supabase_access_token      "Supabase access token"   true
  prompt_value TF_supabase_organization_id   "Supabase organization ID"
  prompt_value TF_supabase_database_password "Database password"       true
  prompt_value TF_github_token               "GitHub PAT (repo + actions scopes)" true
  prompt_value TF_github_repo                "GitHub repo (owner/name)"

  cat > terraform.tfvars <<TFVARS
supabase_access_token      = "${TF_supabase_access_token}"
supabase_organization_id   = "${TF_supabase_organization_id}"
supabase_project_name      = "heistmind-db"
supabase_database_password = "${TF_supabase_database_password}"
supabase_region            = "us-east-1"

github_token = "${TF_github_token}"
github_repo  = "${TF_github_repo}"
TFVARS
  ok "Created terraform.tfvars"
else
  ok "terraform.tfvars exists."
fi

# ---------------------------------------------------------------------------
# Step 3: Terraform apply
# ---------------------------------------------------------------------------
info "Step 2/6: Terraform apply (Supabase project + GitHub secrets)"
terraform apply -auto-approve -input=false

SUPABASE_PROJECT_ID=$(terraform output -raw supabase_project_id)
SUPABASE_URL=$(terraform output -raw supabase_url)
SUPABASE_ANON_KEY=$(terraform output -raw supabase_anon_key)
SUPABASE_SERVICE_ROLE_KEY=$(terraform output -raw supabase_service_role_key)

ok "Supabase: $SUPABASE_PROJECT_ID"
ok "GitHub secrets: synced"

cd "$REPO_ROOT"

if ! $SKIP_DB; then
  # ---------------------------------------------------------------------------
  # Step 4: Link + push migrations
  # ---------------------------------------------------------------------------
  info "Step 3/6: Linking Supabase CLI and pushing migrations"

  CURRENT_REF=""
  if [[ -f supabase/.temp/project-ref ]]; then
    CURRENT_REF=$(cat supabase/.temp/project-ref)
  fi

  if [[ "$CURRENT_REF" == "$SUPABASE_PROJECT_ID" ]]; then
    ok "Already linked."
  else
    supabase link --project-ref "$SUPABASE_PROJECT_ID"
  fi

  DB_PASSWORD=$(cd "$TF_DIR" && grep 'supabase_database_password' terraform.tfvars | sed 's/.*= *"\(.*\)"/\1/')
  supabase db push --password "$DB_PASSWORD"
  ok "Migrations applied."

  # ---------------------------------------------------------------------------
  # Step 5: Regenerate types
  # ---------------------------------------------------------------------------
  info "Step 4/6: Regenerating TypeScript types"
  export SUPABASE_PROJECT_ID
  pnpm db:types
  ok "Types regenerated."
else
  info "Skipping database steps (--skip-db)."
fi

# ---------------------------------------------------------------------------
# Step 6: Write .env.local files
# ---------------------------------------------------------------------------
info "Step 5/6: Writing .env.local files"

write_env_local() {
  local target="$1"
  local existing_discord_bot="" existing_discord_id="" existing_discord_secret=""

  if [[ -f "$target" ]]; then
    existing_discord_bot=$(grep '^DISCORD_BOT_TOKEN=' "$target" 2>/dev/null | cut -d= -f2- || true)
    existing_discord_id=$(grep '^DISCORD_CLIENT_ID=' "$target" 2>/dev/null | cut -d= -f2- || true)
    existing_discord_secret=$(grep '^DISCORD_CLIENT_SECRET=' "$target" 2>/dev/null | cut -d= -f2- || true)
  fi

  cat > "$target" <<ENV
# Supabase
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
SUPABASE_PROJECT_ID=${SUPABASE_PROJECT_ID}

# Discord (for bot)
DISCORD_BOT_TOKEN=${existing_discord_bot:-your-bot-token}
DISCORD_CLIENT_ID=${existing_discord_id:-your-client-id}
DISCORD_CLIENT_SECRET=${existing_discord_secret:-your-client-secret}
ENV
}

write_env_local "$ENV_LOCAL"
write_env_local "$WEB_ENV_LOCAL"
ok "Wrote .env.local files."

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
info "Step 6/6: Done!"
echo ""
echo "  Project:  $SUPABASE_PROJECT_ID"
echo "  URL:      $SUPABASE_URL"
echo "  Secrets:  SUPABASE_PROJECT_ID, SUPABASE_DB_PASSWORD, SUPABASE_ACCESS_TOKEN"
echo ""
echo "  Manual steps remaining:"
echo "    1. Discord OAuth in Supabase Dashboard (Auth > Providers > Discord)"
echo "    2. Redirect URL in Discord Developer Portal"
echo "    3. Vercel env vars (dashboard — NEXT_PUBLIC_SUPABASE_URL, etc.)"
echo ""
echo "  Verify: pnpm validate"
echo ""
