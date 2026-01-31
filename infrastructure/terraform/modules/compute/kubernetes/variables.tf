# ============================================
# Kubernetes Module Variables
# ============================================

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}


variable "cluster_name" {
  description = "Kubernetes cluster name"
  type        = string
}

variable "ami_id" {
  description = "AMI ID for K8s nodes"
  type        = string
}

variable "ssh_public_key" {
  description = "SSH public key for K8s nodes access"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID for K8s nodes"
  type        = string
}

# Master node configuration
variable "master_instance_type" {
  description = "EC2 instance type for K8s master"
  type        = string
  default     = "t3.medium"
}

variable "master_security_group_ids" {
  description = "List of security group IDs for K8s master"
  type        = list(string)
}

variable "master_root_volume_size" {
  description = "Size of master root volume in GB"
  type        = number
  default     = 30
}

variable "master_user_data_script" {
  description = "User data script for master node initialization"
  type        = string
  default     = ""
}

# Worker nodes configuration
variable "worker_count" {
  description = "Number of K8s worker nodes"
  type        = number
  default     = 2
}

variable "worker_instance_type" {
  description = "EC2 instance type for K8s workers"
  type        = string
  default     = "t3.medium"
}

variable "worker_security_group_ids" {
  description = "List of security group IDs for K8s workers"
  type        = list(string)
}

variable "worker_root_volume_size" {
  description = "Size of worker root volume in GB"
  type        = number
  default     = 30
}

variable "worker_user_data_script" {
  description = "User data script for worker nodes initialization"
  type        = string
  default     = ""
}

# Common configuration
variable "root_volume_type" {
  description = "Type of root volume"
  type        = string
  default     = "gp3"
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
