# ============================================
# Production Environment Configuration
# ============================================

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }

  # Remote state configuration (uncomment after S3 bucket is created)
  # backend "s3" {
  #   bucket         = "kahoot-clone-terraform-state-prod"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "kahoot-clone-terraform-locks-prod"
  # }
}

# AWS Provider
provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key

  default_tags {
    tags = local.common_tags
  }
}

# Data Sources
data "aws_caller_identity" "current" {}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Local Variables
locals {
  environment = "prod"
  aws_account_id = data.aws_caller_identity.current.account_id
  
  common_tags = {
    Project     = var.project_name
    Environment = local.environment
    ManagedBy   = "Terraform"
    Owner       = var.owner_email
    CostCenter  = "DevOps"
  }

  availability_zones = ["${var.aws_region}a", "${var.aws_region}b"]
}

# ============================================
# Networking Module
# ============================================

module "networking" {
  source = "../../modules/networking"

  project_name = var.project_name
  environment  = local.environment

  vpc_cidr             = var.vpc_cidr
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  availability_zones   = local.availability_zones

  enable_nat_gateway = var.enable_nat_gateway
  enable_flow_logs   = var.enable_vpc_flow_logs

  common_tags = local.common_tags
}

# ============================================
# Security Module
# ============================================

module "security" {
  source = "../../modules/security"

  project_name = var.project_name
  environment  = local.environment
  vpc_id       = module.networking.vpc_id

  jenkins_ingress_rules    = var.jenkins_ingress_rules
  k8s_master_ingress_rules = var.k8s_master_ingress_rules
  k8s_worker_ingress_rules = var.k8s_worker_ingress_rules

  common_tags = local.common_tags
}

# ============================================
# Storage Module (ECR)
# ============================================

module "ecr" {
  source = "../../modules/storage/ecr"

  project_name = var.project_name
  environment  = local.environment

  repository_names         = var.ecr_repository_names
  image_tag_mutability     = var.ecr_image_tag_mutability
  scan_on_push             = var.ecr_scan_on_push
  enable_lifecycle_policy  = var.ecr_enable_lifecycle_policy
  lifecycle_keep_count     = var.ecr_lifecycle_keep_count
  lifecycle_untagged_days  = var.ecr_lifecycle_untagged_days

  common_tags = local.common_tags
}

# ============================================
# Jenkins Module
# ============================================

module "jenkins" {
  source = "../../modules/compute/jenkins"

  project_name = var.project_name
  environment  = local.environment

  ami_id              = data.aws_ami.ubuntu.id
  instance_type       = var.jenkins_instance_type
  ssh_public_key      = var.ssh_public_key
  security_group_ids  = [module.security.jenkins_security_group_id]
  subnet_id           = module.networking.public_subnet_ids[0]
  enable_elastic_ip   = var.jenkins_enable_elastic_ip
  root_volume_size    = var.jenkins_root_volume_size
  user_data_script    = file("${path.module}/user-data/jenkins.sh")

  common_tags = local.common_tags
}

# ============================================
# Kubernetes Module
# ============================================

module "kubernetes" {
  source = "../../modules/compute/kubernetes"

  project_name = var.project_name
  environment  = local.environment
  cluster_name = "${var.project_name}-${local.environment}"

  ami_id         = data.aws_ami.ubuntu.id
  ssh_public_key = var.ssh_public_key
  subnet_id      = module.networking.public_subnet_ids[0]

  # Master node
  master_instance_type     = var.k8s_master_instance_type
  master_security_group_ids = [module.security.k8s_master_security_group_id]
  master_root_volume_size  = var.k8s_master_root_volume_size
  master_user_data_script  = file("${path.module}/user-data/k8s-master.sh")

  # Worker nodes
  worker_count              = var.k8s_worker_count
  worker_instance_type      = var.k8s_worker_instance_type
  worker_security_group_ids = [module.security.k8s_worker_security_group_id]
  worker_root_volume_size   = var.k8s_worker_root_volume_size
  worker_user_data_script   = file("${path.module}/user-data/k8s-worker.sh")

  common_tags = local.common_tags
}

# ============================================
# Ansible Integration
# ============================================

# Generate Ansible inventory
resource "local_file" "ansible_inventory" {
  content = templatefile("${path.module}/templates/ansible-inventory.tpl", {
    jenkins_ip     = module.jenkins.public_ip
    k8s_master_ip  = module.kubernetes.master_public_ip
    k8s_worker_ips = module.kubernetes.worker_public_ips
    ssh_key_path   = var.ssh_private_key_path
  })
  filename = "${path.module}/../../ansible/inventory/hosts"

  depends_on = [
    module.jenkins,
    module.kubernetes
  ]
}

# Generate Terraform outputs for Ansible
resource "local_file" "terraform_outputs" {
  content = templatefile("${path.module}/templates/terraform-outputs.tpl", {
    aws_account_id = local.aws_account_id
    aws_region     = var.aws_region
    ecr_registry   = "${local.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
    project_name   = var.project_name
    environment    = local.environment
  })
  filename = "${path.module}/../../ansible/group_vars/all/terraform.yml"

  depends_on = [
    module.ecr
  ]
}
