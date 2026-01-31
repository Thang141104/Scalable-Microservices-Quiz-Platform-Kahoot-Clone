# ============================================
# S3 Bucket for Nx Remote Cache
# ============================================

resource "aws_s3_bucket" "nx_cache" {
  bucket = "kahoot-nx-cache-${data.aws_caller_identity.current.account_id}"
  
  tags = {
    Name        = "Nx Remote Cache"
    Project     = var.project_name
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

resource "aws_s3_bucket_versioning" "nx_cache" {
  bucket = aws_s3_bucket.nx_cache.id

  versioning_configuration {
    status = "Disabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "nx_cache" {
  bucket = aws_s3_bucket.nx_cache.id

  rule {
    id     = "delete-old-cache"
    status = "Enabled"

    filter {
      prefix = "nx-cache/"
    }

    expiration {
      days = 7
    }

    noncurrent_version_expiration {
      noncurrent_days = 1
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "nx_cache" {
  bucket = aws_s3_bucket.nx_cache.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# IAM policy for Jenkins to access cache
resource "aws_iam_policy" "nx_cache_access" {
  name        = "${var.project_name}-nx-cache-access"
  description = "Allow Jenkins to access Nx remote cache in S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.nx_cache.arn,
          "${aws_s3_bucket.nx_cache.arn}/*"
        ]
      }
    ]
  })
}

# Attach policy to Jenkins instance role
resource "aws_iam_role_policy_attachment" "jenkins_nx_cache" {
  role       = var.jenkins_iam_role_name
  policy_arn = aws_iam_policy.nx_cache_access.arn
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# Output for Ansible
output "nx_cache_bucket" {
  value       = aws_s3_bucket.nx_cache.bucket
  description = "S3 bucket name for Nx remote cache"
}

output "nx_cache_region" {
  value       = var.aws_region
  description = "AWS region for Nx cache bucket"
}
