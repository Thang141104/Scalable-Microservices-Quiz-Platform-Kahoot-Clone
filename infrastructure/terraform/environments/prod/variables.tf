# ============================================
# Production Environment Variables
# ============================================

# AWS Configuration
variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "us-east-1"
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

# Project Configuration
variable "project_name" {
  description = "Project name"
  type        = string
  default     = "kahoot-clone"
}

variable "owner_email" {
  description = "Owner email for tagging"
  type        = string
  default     = "devops@example.com"
}

# SSH Configuration
variable "ssh_public_key" {
  description = "SSH public key content"
  type        = string
}

variable "ssh_private_key_path" {
  description = "Path to SSH private key"
  type        = string
  default     = "~/.ssh/id_rsa"
}

# Networking Configuration
variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway"
  type        = bool
  default     = false
}

variable "enable_vpc_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = true
}

# Jenkins Configuration
variable "jenkins_instance_type" {
  description = "Jenkins instance type"
  type        = string
  default     = "t3.medium"
}

variable "jenkins_root_volume_size" {
  description = "Jenkins root volume size (GB)"
  type        = number
  default     = 30
}

variable "jenkins_enable_elastic_ip" {
  description = "Enable Elastic IP for Jenkins"
  type        = bool
  default     = true
}

variable "jenkins_ingress_rules" {
  description = "Jenkins ingress rules"
  type = list(object({
    description = string
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
  }))
  default = [
    {
      description = "SSH"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      description = "Jenkins HTTP"
      from_port   = 8080
      to_port     = 8080
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  ]
}

# Kubernetes Configuration
variable "k8s_master_instance_type" {
  description = "K8s master instance type"
  type        = string
  default     = "t3.medium"
}

variable "k8s_master_root_volume_size" {
  description = "K8s master root volume size (GB)"
  type        = number
  default     = 30
}

variable "k8s_worker_count" {
  description = "Number of K8s worker nodes"
  type        = number
  default     = 2
}

variable "k8s_worker_instance_type" {
  description = "K8s worker instance type"
  type        = string
  default     = "t3.medium"
}

variable "k8s_worker_root_volume_size" {
  description = "K8s worker root volume size (GB)"
  type        = number
  default     = 30
}

variable "k8s_master_ingress_rules" {
  description = "K8s master ingress rules"
  type = list(object({
    description     = string
    from_port       = number
    to_port         = number
    protocol        = string
    cidr_blocks     = optional(list(string))
    security_groups = optional(list(string))
  }))
  default = [
    {
      description = "SSH"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      description = "Kubernetes API"
      from_port   = 6443
      to_port     = 6443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  ]
}

variable "k8s_worker_ingress_rules" {
  description = "K8s worker ingress rules"
  type = list(object({
    description     = string
    from_port       = number
    to_port         = number
    protocol        = string
    cidr_blocks     = optional(list(string))
    security_groups = optional(list(string))
  }))
  default = [
    {
      description = "SSH"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      description = "NodePort Services"
      from_port   = 30000
      to_port     = 32767
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  ]
}

# ECR Configuration
variable "ecr_repository_names" {
  description = "List of ECR repository names"
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

variable "ecr_image_tag_mutability" {
  description = "ECR image tag mutability"
  type        = string
  default     = "MUTABLE"
}

variable "ecr_scan_on_push" {
  description = "Enable ECR scan on push"
  type        = bool
  default     = true
}

variable "ecr_enable_lifecycle_policy" {
  description = "Enable ECR lifecycle policy"
  type        = bool
  default     = true
}

variable "ecr_lifecycle_keep_count" {
  description = "Number of images to keep"
  type        = number
  default     = 30
}

variable "ecr_lifecycle_untagged_days" {
  description = "Days to keep untagged images"
  type        = number
  default     = 7
}
