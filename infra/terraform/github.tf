# -----------------------------------------------------------------------------
# GitHub — Actions secrets for CI/CD
# -----------------------------------------------------------------------------
locals {
  github_repo_name = split("/", var.github_repo)[1]
}

resource "github_actions_secret" "supabase_project_id" {
  repository      = local.github_repo_name
  secret_name     = "SUPABASE_PROJECT_ID"
  plaintext_value = supabase_project.heistmind.id
}

resource "github_actions_secret" "supabase_db_password" {
  repository      = local.github_repo_name
  secret_name     = "SUPABASE_DB_PASSWORD"
  plaintext_value = var.supabase_database_password
}

resource "github_actions_secret" "supabase_access_token" {
  repository      = local.github_repo_name
  secret_name     = "SUPABASE_ACCESS_TOKEN"
  plaintext_value = var.supabase_access_token
}
