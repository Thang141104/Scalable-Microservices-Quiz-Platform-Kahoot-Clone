# ===================================
# Variables
# ===================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-1"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "kahoot-clone"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "availability_zone" {
  description = "Availability zone"
  type        = string
  default     = "ap-southeast-1a"
}

variable "allowed_ssh_cidrs" {
  description = "CIDR blocks allowed to SSH"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "allowed_http_cidrs" {
  description = "CIDR blocks allowed to access HTTP services"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "ami_id" {
  description = "AMI ID for EC2 instances (Ubuntu 22.04)"
  type        = string
  # Ubuntu 22.04 LTS in ap-southeast-1
  default     = "ami-0fa377108253bf620"
}

variable "jenkins_instance_type" {
  description = "Instance type for Jenkins"
  type        = string
  default     = "t3.medium"
}

variable "k8s_instance_type" {
  description = "Instance type for K8s nodes"
  type        = string
  default     = "t3.medium"
}

variable "k8s_worker_count" {
  description = "Number of K8s worker nodes"
  type        = number
  default     = 2
}

variable "github_repo" {
  description = "GitHub repository URL"
  type        = string
  default     = ""
}

variable "github_branch" {
  description = "GitHub branch to use"
  type        = string
  default     = "main"
}
