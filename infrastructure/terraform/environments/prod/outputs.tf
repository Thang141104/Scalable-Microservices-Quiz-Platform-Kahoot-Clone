# ============================================
# Production Environment Outputs
# ============================================

# Networking Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.networking.private_subnet_ids
}

# Security Outputs
output "jenkins_security_group_id" {
  description = "Jenkins security group ID"
  value       = module.security.jenkins_security_group_id
}

output "k8s_master_security_group_id" {
  description = "K8s master security group ID"
  value       = module.security.k8s_master_security_group_id
}

output "k8s_worker_security_group_id" {
  description = "K8s worker security group ID"
  value       = module.security.k8s_worker_security_group_id
}

# ECR Outputs
output "ecr_repository_urls" {
  description = "ECR repository URLs"
  value       = module.ecr.repository_urls
}

output "ecr_registry_url" {
  description = "ECR registry URL"
  value       = "${local.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

# Jenkins Outputs
output "jenkins_public_ip" {
  description = "Jenkins public IP"
  value       = module.jenkins.public_ip
}

output "jenkins_url" {
  description = "Jenkins URL"
  value       = "http://${module.jenkins.public_ip}:8080"
}

output "jenkins_ssh_command" {
  description = "SSH command to connect to Jenkins"
  value       = "ssh -i ${var.ssh_private_key_path} ubuntu@${module.jenkins.public_ip}"
}

# Kubernetes Outputs
output "k8s_master_public_ip" {
  description = "K8s master public IP"
  value       = module.kubernetes.master_public_ip
}

output "k8s_worker_public_ips" {
  description = "K8s worker public IPs"
  value       = module.kubernetes.worker_public_ips
}

output "k8s_ssh_commands" {
  description = "SSH commands for K8s nodes"
  value = {
    master  = "ssh -i ${var.ssh_private_key_path} ubuntu@${module.kubernetes.master_public_ip}"
    workers = [for ip in module.kubernetes.worker_public_ips : "ssh -i ${var.ssh_private_key_path} ubuntu@${ip}"]
  }
}

# Ansible Integration
output "ansible_inventory_path" {
  description = "Path to generated Ansible inventory"
  value       = "${path.module}/../../ansible/inventory/hosts"
}

output "ansible_command" {
  description = "Command to run Ansible playbooks"
  value       = "cd ${path.module}/../../ansible && ansible-playbook -i inventory/hosts site.yml"
}
