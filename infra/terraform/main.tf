provider "supabase" {
  access_token = var.supabase_access_token
}

provider "github" {
  token = var.github_token
  owner = split("/", var.github_repo)[0]
}
