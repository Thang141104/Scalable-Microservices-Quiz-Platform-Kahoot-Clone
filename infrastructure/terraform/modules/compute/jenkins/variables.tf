# ============================================
# Jenkins Module Variables
# ============================================

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "ami_id" {
  description = "AMI ID for Jenkins instance"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type for Jenkins"
  type        = string
  default     = "t3.medium"
}

variable "ssh_public_key" {
  description = "SSH public key for Jenkins access"
  type        = string
}

variable "security_group_ids" {
  description = "List of security group IDs for Jenkins"
  type        = list(string)
}

variable "subnet_id" {
  description = "Subnet ID for Jenkins instance"
  type        = string
}

variable "root_volume_type" {
  description = "Type of root volume"
  type        = string
  default     = "gp3"
}

variable "root_volume_size" {
  description = "Size of root volume in GB"
  type        = number
  default     = 30
}

variable "enable_elastic_ip" {
  description = "Enable Elastic IP for Jenkins"
  type        = bool
  default     = true
}

variable "user_data_script" {
  description = "User data script for instance initialization"
  type        = string
  default     = ""
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
