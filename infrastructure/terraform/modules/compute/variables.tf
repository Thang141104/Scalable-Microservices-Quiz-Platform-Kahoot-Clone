variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "ami_id" {
  description = "AMI ID for EC2 instances"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID for instances"
  type        = string
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

variable "jenkins_security_group_id" {
  description = "Security group ID for Jenkins"
  type        = string
}

variable "k8s_master_security_group_id" {
  description = "Security group ID for K8s master"
  type        = string
}

variable "k8s_worker_security_group_id" {
  description = "Security group ID for K8s workers"
  type        = string
}

variable "jenkins_user_data" {
  description = "User data script for Jenkins"
  type        = string
  default     = ""
}

variable "k8s_master_user_data" {
  description = "User data script for K8s master"
  type        = string
  default     = ""
}

variable "k8s_worker_user_data" {
  description = "User data script for K8s workers"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
