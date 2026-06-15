terraform {
  required_version = ">= 1.5.0"

  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }

  backend "local" {
    path = "terraform.tfstate"
  }
}
