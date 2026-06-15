# -----------------------------------------------------------------------------
# Supabase — project, settings, API keys
# -----------------------------------------------------------------------------
resource "supabase_project" "heistmind" {
  organization_id   = var.supabase_organization_id
  name              = var.supabase_project_name
  database_password = var.supabase_database_password
  region            = var.supabase_region

  lifecycle {
    ignore_changes = [database_password]
  }
}

resource "supabase_settings" "heistmind" {
  project_ref = supabase_project.heistmind.id

  api = jsonencode({
    db_schema            = "public,graphql_public"
    db_extra_search_path = "public,extensions"
    max_rows             = 1000
  })
}

data "supabase_apikeys" "heistmind" {
  project_ref = supabase_project.heistmind.id
}
