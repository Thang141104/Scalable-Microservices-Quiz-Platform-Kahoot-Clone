# ============================================
# ECR Module Outputs
# ============================================

output "repository_urls" {
  description = "Map of repository names to URLs"
  value = {
    for name, repo in aws_ecr_repository.repos :
    name => repo.repository_url
  }
}

output "repository_arns" {
  description = "Map of repository names to ARNs"
  value = {
    for name, repo in aws_ecr_repository.repos :
    name => repo.arn
  }
}

output "registry_id" {
  description = "ECR registry ID"
  value       = try(values(aws_ecr_repository.repos)[0].registry_id, null)
}

output "repository_names" {
  description = "List of created repository names"
  value       = [for repo in aws_ecr_repository.repos : repo.name]
}
