# ============================================
# S3 Bucket for User Avatars
# ============================================

resource "aws_s3_bucket" "user_avatars" {
  bucket = "${var.project_name}-user-avatars-${data.aws_caller_identity.current.account_id}"
  
  tags = {
    Name        = "${var.project_name}-user-avatars"
    Environment = "production"
    Project     = var.project_name
  }
}

# Block public access settings
resource "aws_s3_bucket_public_access_block" "user_avatars" {
  bucket = aws_s3_bucket.user_avatars.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Bucket policy for public read access
resource "aws_s3_bucket_policy" "user_avatars" {
  bucket = aws_s3_bucket.user_avatars.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.user_avatars.arn}/*"
      }
    ]
  })
  
  depends_on = [aws_s3_bucket_public_access_block.user_avatars]
}

# CORS configuration
resource "aws_s3_bucket_cors_configuration" "user_avatars" {
  bucket = aws_s3_bucket.user_avatars.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Lifecycle policy to delete old avatars
resource "aws_s3_bucket_lifecycle_configuration" "user_avatars" {
  bucket = aws_s3_bucket.user_avatars.id

  rule {
    id     = "delete-old-avatars"
    status = "Enabled"

    expiration {
      days = 90
    }

    filter {
      prefix = "avatars/"
    }
  }
}


# Output bucket name and URL
output "user_avatars_bucket_name" {
  value       = aws_s3_bucket.user_avatars.id
  description = "S3 bucket name for user avatars"
}

output "user_avatars_bucket_url" {
  value       = "https://${aws_s3_bucket.user_avatars.bucket_regional_domain_name}"
  description = "S3 bucket URL for user avatars"
}
