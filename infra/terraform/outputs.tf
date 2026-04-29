output "supabase_project_id" {
  description = "Supabase project reference ID"
  value       = supabase_project.heistmind.id
}

output "supabase_url" {
  description = "Supabase project URL (NEXT_PUBLIC_SUPABASE_URL)"
  value       = "https://${supabase_project.heistmind.id}.supabase.co"
}

output "supabase_anon_key" {
  description = "Anonymous API key (NEXT_PUBLIC_SUPABASE_ANON_KEY)"
  value       = data.supabase_apikeys.heistmind.anon_key
  sensitive   = true
}

output "supabase_service_role_key" {
  description = "Service role key (SUPABASE_SERVICE_ROLE_KEY)"
  value       = data.supabase_apikeys.heistmind.service_role_key
  sensitive   = true
}

output "supabase_database_host" {
  description = "Database connection host"
  value       = "db.${supabase_project.heistmind.id}.supabase.co"
}
