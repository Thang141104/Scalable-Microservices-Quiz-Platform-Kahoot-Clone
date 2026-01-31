# ============================================
# Kubernetes Module Outputs
# ============================================

output "master_instance_id" {
  description = "ID of K8s master instance"
  value       = aws_instance.master.id
}

output "master_private_ip" {
  description = "Private IP of K8s master"
  value       = aws_instance.master.private_ip
}

output "master_public_ip" {
  description = "Public IP of K8s master"
  value       = aws_instance.master.public_ip
}

output "worker_instance_ids" {
  description = "List of K8s worker instance IDs"
  value       = aws_instance.workers[*].id
}

output "worker_private_ips" {
  description = "List of K8s worker private IPs"
  value       = aws_instance.workers[*].private_ip
}

output "worker_public_ips" {
  description = "List of K8s worker public IPs"
  value       = aws_instance.workers[*].public_ip
}

output "cluster_name" {
  description = "Kubernetes cluster name"
  value       = var.cluster_name
}

output "iam_role_arn" {
  description = "ARN of K8s node IAM role"
  value       = aws_iam_role.k8s_node.arn
}

output "iam_role_name" {
  description = "Name of K8s node IAM role"
  value       = aws_iam_role.k8s_node.name
}

output "ssh_key_name" {
  description = "Name of SSH key pair"
  value       = aws_key_pair.k8s.key_name
}
