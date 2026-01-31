# ============================================
# S3 Backend for Remote State
# Run this first to create S3 bucket for state storage
# ============================================

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
}

variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "ap-southeast-1"
}

variable "aws_access_key" {
  description = "AWS Access Key"
  type        = string
  sensitive   = true
}

variable "aws_secret_key" {
  description = "AWS Secret Key"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "kahoot-clone"
}

variable "environments" {
  description = "List of environments"
  type        = list(string)
  default     = ["dev", "staging", "prod"]
}

# S3 Buckets for Terraform State
resource "aws_s3_bucket" "terraform_state" {
  for_each = toset(var.environments)

  bucket = "${var.project_name}-terraform-state-${each.key}"

  tags = {
    Name        = "${var.project_name}-terraform-state-${each.key}"
    Environment = each.key
    ManagedBy   = "Terraform"
    Purpose     = "Terraform State Storage"
  }
}

# Enable versioning
resource "aws_s3_bucket_versioning" "terraform_state" {
  for_each = aws_s3_bucket.terraform_state

  bucket = each.value.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  for_each = aws_s3_bucket.terraform_state

  bucket = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  for_each = aws_s3_bucket.terraform_state

  bucket = each.value.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB Tables for State Locking
resource "aws_dynamodb_table" "terraform_locks" {
  for_each = toset(var.environments)

  name         = "${var.project_name}-terraform-locks-${each.key}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = "${var.project_name}-terraform-locks-${each.key}"
    Environment = each.key
    ManagedBy   = "Terraform"
    Purpose     = "Terraform State Locking"
  }
}

# Outputs
output "s3_bucket_names" {
  description = "S3 bucket names for state storage"
  value = {
    for env, bucket in aws_s3_bucket.terraform_state :
    env => bucket.id
  }
}

output "dynamodb_table_names" {
  description = "DynamoDB table names for state locking"
  value = {
    for env, table in aws_dynamodb_table.terraform_locks :
    env => table.name
  }
}

output "backend_config" {
  description = "Backend configuration for each environment"
  value = {
    for env in var.environments :
    env => {
      bucket         = "${var.project_name}-terraform-state-${env}"
      key            = "${env}/terraform.tfstate"
      region         = var.aws_region
      encrypt        = true
      dynamodb_table = "${var.project_name}-terraform-locks-${env}"
    }
  }
}
