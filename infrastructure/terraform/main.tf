# ===================================
# Main Terraform Configuration
# Root module using sub-modules
# ===================================

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = "production"
      ManagedBy   = "Terraform"
    }
  }
}

# Common tags
locals {
  common_tags = {
    Project     = var.project_name
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

# ===================================
# Networking Module
# ===================================
module "networking" {
  source = "./modules/networking"
  
  project_name        = var.project_name
  vpc_cidr            = var.vpc_cidr
  
  common_tags = local.common_tags
}

# ===================================
# Security Module
# ===================================
module "security" {
  source = "./modules/security"
  
  project_name = var.project_name
  vpc_id       = module.networking.vpc_id
  
  common_tags = local.common_tags
}

# ===================================
# ECR Module
# ===================================
# Check if ECR repositories already exist
data "aws_caller_identity" "current" {}

module "ecr" {
  source = "./modules/ecr"
  
  project_name = var.project_name
  
  tags = local.common_tags
  
  # Note: If repositories already exist from old infrastructure,
  # import them: terraform import 'module.ecr.aws_ecr_repository.repositories["gateway"]' kahoot-clone-gateway
}

# ===================================
# Compute Module
# ===================================
module "compute" {
  source = "./modules/compute"
  
  project_name                   = var.project_name
  ami_id                         = var.ami_id
  subnet_id                      = module.networking.public_subnet_ids[0]
  jenkins_instance_type          = var.jenkins_instance_type
  k8s_instance_type              = var.k8s_instance_type
  k8s_worker_count               = var.k8s_worker_count
  jenkins_security_group_id      = module.security.jenkins_security_group_id
  k8s_master_security_group_id   = module.security.k8s_master_security_group_id
  k8s_worker_security_group_id   = module.security.k8s_worker_security_group_id
  
  tags = local.common_tags
}

# ===================================
# Nx Cache Module
# ===================================
module "nx_cache" {
  source = "./modules/nx-cache"
  
  project_name = var.project_name
  aws_region   = var.aws_region
  
  jenkins_iam_role_name = module.compute.jenkins_iam_role_name
}

# ===================================
# Ansible Integration
# ===================================

# Generate Ansible inventory
resource "local_file" "ansible_inventory" {
  content = templatefile("${path.module}/templates/ansible-inventory.tpl", {
    jenkins_ip         = module.compute.jenkins_public_ip
    k8s_master_ip      = module.compute.k8s_master_public_ip
    k8s_worker_ips     = module.compute.k8s_worker_public_ips
    ssh_key_path       = module.compute.ssh_key_path
  })
  
  filename = "${path.module}/../ansible/inventory/hosts"
  
  depends_on = [module.compute]
}

# Wait for instances to be ready
resource "time_sleep" "wait_for_instances" {
  create_duration = "60s"
  
  depends_on = [module.compute]
}
