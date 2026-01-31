# ===================================
# Compute Resources Module
# ===================================

# SSH Key Pair
resource "tls_private_key" "ssh_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "main" {
  key_name   = "${var.project_name}-key"
  public_key = tls_private_key.ssh_key.public_key_openssh

  tags = var.tags
}

resource "local_file" "private_key" {
  content         = tls_private_key.ssh_key.private_key_pem
  filename        = "${path.root}/keys/${var.project_name}-key.pem"
  file_permission = "0400"
}

# IAM Role for Jenkins
resource "aws_iam_role" "jenkins" {
  name = "${var.project_name}-jenkins-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "jenkins_ecr" {
  role       = aws_iam_role.jenkins.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

# Additional ECR scan permissions
resource "aws_iam_role_policy" "jenkins_ecr_scan" {
  name = "${var.project_name}-jenkins-ecr-scan"
  role = aws_iam_role.jenkins.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ecr:StartImageScan",
        "ecr:DescribeImageScanFindings"
      ]
      Resource = "*"
    }]
  })
}

resource "aws_iam_instance_profile" "jenkins" {
  name = "${var.project_name}-jenkins-profile"
  role = aws_iam_role.jenkins.name

  tags = var.tags
}

# IAM Role for K8s Nodes
resource "aws_iam_role" "k8s_nodes" {
  name = "${var.project_name}-k8s-nodes-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "k8s_ecr_read" {
  role       = aws_iam_role.k8s_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "k8s_nodes" {
  name = "${var.project_name}-k8s-nodes-profile"
  role = aws_iam_role.k8s_nodes.name

  tags = var.tags
}

# Jenkins Server
resource "aws_instance" "jenkins" {
  ami                    = var.ami_id
  instance_type          = var.jenkins_instance_type
  key_name               = aws_key_pair.main.key_name
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [var.jenkins_security_group_id]
  iam_instance_profile   = aws_iam_instance_profile.jenkins.name

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-jenkins"
      Role = "jenkins"
    }
  )
}

# K8s Master
resource "aws_instance" "k8s_master" {
  ami                    = var.ami_id
  instance_type          = var.k8s_instance_type
  key_name               = aws_key_pair.main.key_name
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [var.k8s_master_security_group_id]
  iam_instance_profile   = aws_iam_instance_profile.k8s_nodes.name

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-k8s-master"
      Role = "k8s-master"
    }
  )
}

# K8s Workers
resource "aws_instance" "k8s_workers" {
  count = var.k8s_worker_count

  ami                    = var.ami_id
  instance_type          = var.k8s_instance_type
  key_name               = aws_key_pair.main.key_name
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [var.k8s_worker_security_group_id]
  iam_instance_profile   = aws_iam_instance_profile.k8s_nodes.name

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-k8s-worker-${count.index + 1}"
      Role = "k8s-worker"
    }
  )
}
