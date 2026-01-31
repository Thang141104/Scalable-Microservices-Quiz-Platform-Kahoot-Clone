# ===================================
# Outputs
# ===================================

# Networking
output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.networking.public_subnet_ids
}

# ECR
output "ecr_repository_urls" {
  description = "ECR repository URLs"
  value       = module.ecr.repository_urls
}

output "ecr_registry_id" {
  description = "ECR registry ID"
  value       = module.ecr.registry_id
}

output "ecr_registry_url" {
  description = "ECR registry URL"
  value       = "${module.ecr.registry_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

output "aws_account_id" {
  description = "AWS Account ID"
  value       = data.aws_caller_identity.current.account_id
}

# Jenkins
output "jenkins_public_ip" {
  description = "Jenkins server public IP"
  value       = module.compute.jenkins_public_ip
}

output "jenkins_url" {
  description = "Jenkins Web UI URL"
  value       = "http://${module.compute.jenkins_public_ip}:8080"
}

output "jenkins_ssh_command" {
  description = "SSH command to connect to Jenkins"
  value       = "ssh -i ${module.compute.ssh_key_path} ubuntu@${module.compute.jenkins_public_ip}"
}

# Nx Cache
output "nx_cache_bucket" {
  description = "S3 bucket for Nx remote cache"
  value       = module.nx_cache.nx_cache_bucket
}

output "nx_cache_region" {
  description = "AWS region for Nx cache bucket"
  value       = module.nx_cache.nx_cache_region
}

# Kubernetes
output "k8s_master_public_ip" {
  description = "Kubernetes master public IP"
  value       = module.compute.k8s_master_public_ip
}

output "k8s_worker_public_ips" {
  description = "Kubernetes worker public IPs"
  value       = module.compute.k8s_worker_public_ips
}

output "k8s_ssh_commands" {
  description = "SSH commands for K8s nodes"
  value = {
    master  = "ssh -i ${module.compute.ssh_key_path} ubuntu@${module.compute.k8s_master_public_ip}"
    workers = [for ip in module.compute.k8s_worker_public_ips : "ssh -i ${module.compute.ssh_key_path} ubuntu@${ip}"]
  }
}

# Deployment Info
output "next_steps" {
  description = "Next steps after deployment"
  value = <<-EOT
    
    ╔════════════════════════════════════════════════════════════╗
    ║         DEPLOYMENT COMPLETED SUCCESSFULLY                  ║
    ╚════════════════════════════════════════════════════════════╝
    
    📋 RESOURCES CREATED:
    ├─ VPC: ${module.networking.vpc_id}
    ├─ ECR Repositories: 7 repositories
    ├─ Jenkins: ${module.compute.jenkins_public_ip}:8080
    ├─ K8s Master: ${module.compute.k8s_master_public_ip}
    ├─ K8s Workers: ${length(module.compute.k8s_worker_public_ips)} nodes
    └─ Nx Cache Bucket: ${module.nx_cache.nx_cache_bucket}
    
    🔑 SSH KEY:
    Location: ${module.compute.ssh_key_path}
    
    ⏭️  NEXT STEPS:
    
    1. Run Ansible to configure servers:
       cd ../ansible
       ansible-playbook -i inventory/hosts playbooks/site.yml
    
    2. Access Jenkins:
       URL: http://${module.compute.jenkins_public_ip}:8080
       Get password: ssh ubuntu@${module.compute.jenkins_public_ip} "sudo cat /var/lib/jenkins/secrets/initialAdminPassword"
    
    3. Verify Kubernetes:
       ssh ubuntu@${module.compute.k8s_master_public_ip} "kubectl get nodes"
    
    📚 Documentation: ../README.md
  EOT
}
