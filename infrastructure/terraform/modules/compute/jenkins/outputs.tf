# ============================================
# Jenkins Module Outputs
# ============================================

output "instance_id" {
  description = "ID of Jenkins instance"
  value       = aws_instance.jenkins.id
}

output "private_ip" {
  description = "Private IP of Jenkins instance"
  value       = aws_instance.jenkins.private_ip
}

output "public_ip" {
  description = "Public IP of Jenkins instance"
  value       = var.enable_elastic_ip ? aws_eip.jenkins[0].public_ip : aws_instance.jenkins.public_ip
}

output "iam_role_arn" {
  description = "ARN of Jenkins IAM role"
  value       = aws_iam_role.jenkins.arn
}

output "iam_role_name" {
  description = "Name of Jenkins IAM role"
  value       = aws_iam_role.jenkins.name
}

output "ssh_key_name" {
  description = "Name of SSH key pair"
  value       = aws_key_pair.jenkins.key_name
}
