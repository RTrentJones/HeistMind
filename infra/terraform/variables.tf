# -----------------------------------------------------------------------------
# Supabase
# -----------------------------------------------------------------------------
variable "supabase_access_token" {
  description = "Supabase Management API access token (https://supabase.com/dashboard/account/tokens)"
  type        = string
  sensitive   = true
}

variable "supabase_organization_id" {
  description = "Supabase organization ID (from dashboard org settings)"
  type        = string
}

variable "supabase_project_name" {
  description = "Name of the Supabase project"
  type        = string
  default     = "heistmind-db"
}

variable "supabase_database_password" {
  description = "Database password for the Supabase project"
  type        = string
  sensitive   = true
}

variable "supabase_region" {
  description = "Supabase project region"
  type        = string
  default     = "us-east-1"
}

# -----------------------------------------------------------------------------
# GitHub
# -----------------------------------------------------------------------------
variable "github_token" {
  description = "GitHub personal access token with repo + actions scopes"
  type        = string
  sensitive   = true
}

variable "github_repo" {
  description = "GitHub repo in owner/name format (e.g. rtj/HeistMind)"
  type        = string
}
