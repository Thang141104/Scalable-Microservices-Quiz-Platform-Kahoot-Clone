# ============================================
# Jenkins Module - CI/CD Server
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

# SSH Key Pair
resource "aws_key_pair" "jenkins" {
  key_name   = "${var.project_name}-jenkins"
  public_key = var.ssh_public_key

  tags = merge(
    var.common_tags,
    {
      Name = "${var.project_name}-jenkins-key"
    }
  )
}

# IAM Role for Jenkins
resource "aws_iam_role" "jenkins" {
  name = "${var.project_name}-jenkins-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = var.common_tags
}

# IAM Policy for ECR Access
resource "aws_iam_role_policy" "jenkins_ecr" {
  name = "${var.project_name}-jenkins-ecr-policy"
  role = aws_iam_role.jenkins.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:StartImageScan",
          "ecr:DescribeImageScanFindings"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Policy for S3 Secrets Access
resource "aws_iam_role_policy" "jenkins_s3_secrets" {
  name = "${var.project_name}-jenkins-s3-secrets-policy"
  role = aws_iam_role.jenkins.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion"
        ]
        Resource = "arn:aws:s3:::kahoot-clone-secrets-802346121373/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketVersioning"
        ]
        Resource = "arn:aws:s3:::kahoot-clone-secrets-802346121373"
      }
    ]
  })
}

# IAM Instance Profile
resource "aws_iam_instance_profile" "jenkins" {
  name = "${var.project_name}-jenkins-profile"
  role = aws_iam_role.jenkins.name

  tags = var.common_tags
}

# Jenkins EC2 Instance
resource "aws_instance" "jenkins" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.jenkins.key_name
  vpc_security_group_ids = var.security_group_ids
  subnet_id              = var.subnet_id
  iam_instance_profile   = aws_iam_instance_profile.jenkins.name

  root_block_device {
    volume_type           = var.root_volume_type
    volume_size           = var.root_volume_size
    delete_on_termination = true
    encrypted             = true

    tags = merge(
      var.common_tags,
      {
        Name = "${var.project_name}-jenkins-root"
      }
    )
  }

  user_data = var.user_data_script

  tags = merge(
    var.common_tags,
    {
      Name = "${var.project_name}-jenkins"
      Role = "Jenkins"
    }
  )

  lifecycle {
    ignore_changes = [user_data]
  }
}

# Elastic IP (optional)
resource "aws_eip" "jenkins" {
  count    = var.enable_elastic_ip ? 1 : 0
  instance = aws_instance.jenkins.id
  domain   = "vpc"

  tags = merge(
    var.common_tags,
    {
      Name = "${var.project_name}-jenkins-eip"
    }
  )
}
