# ============================================
# Security Module Outputs
# ============================================

output "jenkins_security_group_id" {
  description = "ID of Jenkins security group"
  value       = aws_security_group.jenkins.id
}

output "k8s_master_security_group_id" {
  description = "ID of K8s master security group"
  value       = aws_security_group.k8s_master.id
}

output "k8s_worker_security_group_id" {
  description = "ID of K8s worker security group"
  value       = aws_security_group.k8s_worker.id
}
