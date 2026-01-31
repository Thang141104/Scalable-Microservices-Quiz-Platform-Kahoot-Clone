# ============================================
# Kubernetes Module - K8s Cluster
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
resource "aws_key_pair" "k8s" {
  key_name   = "${var.project_name}-k8s"
  public_key = var.ssh_public_key

  tags = merge(
    var.common_tags,
    {
      Name = "${var.project_name}-k8s-key"
    }
  )
}

# IAM Role for K8s Nodes
resource "aws_iam_role" "k8s_node" {
  name = "${var.project_name}-k8s-node-role"

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
resource "aws_iam_role_policy" "k8s_ecr" {
  name = "${var.project_name}-k8s-ecr-policy"
  role = aws_iam_role.k8s_node.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Instance Profile
resource "aws_iam_instance_profile" "k8s_node" {
  name = "${var.project_name}-k8s-node-profile"
  role = aws_iam_role.k8s_node.name

  tags = var.common_tags
}

# K8s Master Node
resource "aws_instance" "master" {
  ami                    = var.ami_id
  instance_type          = var.master_instance_type
  key_name               = aws_key_pair.k8s.key_name
  vpc_security_group_ids = var.master_security_group_ids
  subnet_id              = var.subnet_id
  iam_instance_profile   = aws_iam_instance_profile.k8s_node.name

  root_block_device {
    volume_type           = var.root_volume_type
    volume_size           = var.master_root_volume_size
    delete_on_termination = true
    encrypted             = true
  }

  user_data = var.master_user_data_script

  tags = merge(
    var.common_tags,
    {
      Name                                        = "${var.project_name}-k8s-master"
      Role                                        = "k8s-master"
      "kubernetes.io/cluster/${var.cluster_name}" = "owned"
    }
  )

  lifecycle {
    ignore_changes = [user_data]
  }
}

# K8s Worker Nodes
resource "aws_instance" "workers" {
  count = var.worker_count

  ami                    = var.ami_id
  instance_type          = var.worker_instance_type
  key_name               = aws_key_pair.k8s.key_name
  vpc_security_group_ids = var.worker_security_group_ids
  subnet_id              = var.subnet_id
  iam_instance_profile   = aws_iam_instance_profile.k8s_node.name

  root_block_device {
    volume_type           = var.root_volume_type
    volume_size           = var.worker_root_volume_size
    delete_on_termination = true
    encrypted             = true
  }

  user_data = var.worker_user_data_script

  tags = merge(
    var.common_tags,
    {
      Name                                        = "${var.project_name}-k8s-worker-${count.index + 1}"
      Role                                        = "k8s-worker"
      "kubernetes.io/cluster/${var.cluster_name}" = "owned"
    }
  )

  lifecycle {
    ignore_changes = [user_data]
  }
}
