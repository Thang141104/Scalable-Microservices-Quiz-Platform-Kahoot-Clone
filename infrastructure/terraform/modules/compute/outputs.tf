output "jenkins_public_ip" {
  description = "Jenkins server public IP"
  value       = aws_instance.jenkins.public_ip
}

output "jenkins_private_ip" {
  description = "Jenkins server private IP"
  value       = aws_instance.jenkins.private_ip
}

output "k8s_master_public_ip" {
  description = "K8s master public IP"
  value       = aws_instance.k8s_master.public_ip
}

output "k8s_master_private_ip" {
  description = "K8s master private IP"
  value       = aws_instance.k8s_master.private_ip
}

output "k8s_worker_public_ips" {
  description = "K8s worker public IPs"
  value       = aws_instance.k8s_workers[*].public_ip
}

output "k8s_worker_private_ips" {
  description = "K8s worker private IPs"
  value       = aws_instance.k8s_workers[*].private_ip
}

output "ssh_key_path" {
  description = "Path to SSH private key"
  value       = local_file.private_key.filename
}
output "jenkins_iam_role_name" {
  description = "Jenkins IAM role name"
  value       = aws_iam_role.jenkins.name
}