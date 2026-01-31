# ============================================
# ECR Module Variables
# ============================================

variable "project_name" {
  description = "Project name for ECR repository naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "repository_names" {
  description = "List of ECR repository names to create"
  type        = list(string)
  default = [
    "gateway",
    "auth",
    "user",
    "quiz",
    "game",
    "analytics",
    "frontend"
  ]
}

variable "image_tag_mutability" {
  description = "Tag mutability setting for repositories"
  type        = string
  default     = "MUTABLE"
  validation {
    condition     = contains(["MUTABLE", "IMMUTABLE"], var.image_tag_mutability)
    error_message = "Image tag mutability must be either MUTABLE or IMMUTABLE."
  }
}

variable "scan_on_push" {
  description = "Enable image scanning on push"
  type        = bool
  default     = true
}

variable "encryption_type" {
  description = "Encryption type for ECR (AES256 or KMS)"
  type        = string
  default     = "AES256"
  validation {
    condition     = contains(["AES256", "KMS"], var.encryption_type)
    error_message = "Encryption type must be either AES256 or KMS."
  }
}

variable "kms_key_id" {
  description = "KMS key ID for encryption (required if encryption_type is KMS)"
  type        = string
  default     = null
}

variable "enable_lifecycle_policy" {
  description = "Enable lifecycle policy for repositories"
  type        = bool
  default     = true
}

variable "lifecycle_keep_count" {
  description = "Number of images to keep in lifecycle policy"
  type        = number
  default     = 30
}

variable "lifecycle_untagged_days" {
  description = "Days to keep untagged images"
  type        = number
  default     = 7
}

variable "enable_cross_account_access" {
  description = "Enable cross-account access to ECR repositories"
  type        = bool
  default     = false
}

variable "allowed_aws_accounts" {
  description = "List of AWS account IDs allowed to access ECR repositories"
  type        = list(string)
  default     = []
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
