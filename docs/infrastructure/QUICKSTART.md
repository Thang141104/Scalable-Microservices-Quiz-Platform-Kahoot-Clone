# ============================================
# QUICKSTART GUIDE
# Enterprise Infrastructure Setup
# ============================================

This guide will help you deploy the entire infrastructure in **~40 minutes**.

## Prerequisites (5 minutes)

### Windows Setup

```powershell
# 1. Install Chocolatey (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 2. Install Terraform
choco install terraform -y

# 3. Install AWS CLI
choco install awscli -y

# 4. Install WSL2 with Ubuntu
wsl --install Ubuntu-22.04
```

### WSL (Ubuntu) Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Ansible
sudo apt install -y software-properties-common
sudo add-apt-repository --yes --update ppa:ansible/ansible
sudo apt install -y ansible

# Install Python dependencies
sudo apt install -y python3-pip
pip3 install boto3 botocore
```

## Step 1: AWS Configuration (5 minutes)

```powershell
# Configure AWS credentials
aws configure
# AWS Access Key ID: [Enter your access key]
# AWS Secret Access Key: [Enter your secret key]
# Default region name: ap-southeast-1
# Default output format: json

# Verify
aws sts get-caller-identity
```

## Step 2: Generate SSH Keys (2 minutes)

```bash
# In WSL
ssh-keygen -t rsa -b 4096 -f ~/.ssh/kahoot-prod -N ""

# Display public key (copy this)
cat ~/.ssh/kahoot-prod.pub
```

## Step 3: Setup Remote State (5 minutes)

```powershell
# Navigate to backend directory
cd infrastructure\terraform\backend

# Copy and edit configuration
copy terraform.tfvars.example terraform.tfvars
notepad terraform.tfvars

# Update with:
# - Your AWS credentials
# - Project name: kahoot-clone

# Initialize and create backend
terraform init
terraform apply -auto-approve

# Save outputs
terraform output -json > backend-config.json
```

## Step 4: Configure Production Environment (3 minutes)

```powershell
# Navigate to prod environment
cd ..\environments\prod

# Copy and edit configuration
copy terraform.tfvars.example terraform.tfvars
notepad terraform.tfvars
```

**Update terraform.tfvars:**
```hcl
# AWS Credentials
aws_access_key = "YOUR_AWS_ACCESS_KEY"
aws_secret_key = "YOUR_AWS_SECRET_KEY"
aws_region = "ap-southeast-1"

# Project
project_name = "kahoot-clone"
owner_email = "your-email@example.com"

# SSH Key (paste public key from Step 2)
ssh_public_key = "ssh-rsa AAAAB3NzaC1yc2EA... ubuntu@hostname"
ssh_private_key_path = "~/.ssh/kahoot-prod"

# Infrastructure (adjust as needed)
jenkins_instance_type = "t3.medium" # 2 vCPU, 4GB RAM
k8s_master_instance_type = "t3.medium" # 2 vCPU, 4GB RAM
k8s_worker_count = 2
k8s_worker_instance_type = "t3.medium" # 2 vCPU, 4GB RAM
```

**Enable remote state in main.tf:**

Uncomment the backend configuration:
```hcl
terraform {
  backend "s3" {
    bucket = "kahoot-clone-terraform-state-prod"
    key = "prod/terraform.tfstate"
    region = "ap-southeast-1"
    encrypt = true
    dynamodb_table = "kahoot-clone-terraform-locks-prod"
  }
}
```

## Step 5: Deploy Infrastructure (40 minutes)

### Option A: Automated Deployment (Recommended)

```powershell
# Go to project root
cd ..\..\..\

# Deploy everything
.\infrastructure\scripts\deploy.ps1 -Environment prod -AutoApprove
```

**Timeline:**
- Terraform: 15 minutes (VPC, EC2, ECR)
- Ansible: 25 minutes (Jenkins + K8s setup)

### Option B: Manual Step-by-Step

```powershell
# Step 1: Terraform (15 min)
cd infrastructure\terraform\environments\prod
terraform init
terraform plan
terraform apply -auto-approve

# Step 2: Wait for instances (1 min)
Start-Sleep -Seconds 60

# Step 3: Ansible (25 min)
cd ..\..\..\ansible

# In WSL
wsl
cd /mnt/d/DevOps_Lab2/DevOps-Kahoot-Clone/infrastructure/ansible
ansible-playbook -i inventory/hosts site.yml
```

## Step 6: Verification (5 minutes)

```powershell
# View infrastructure details
cd infrastructure\terraform\environments\prod
terraform output
```

**Expected outputs:**
- Jenkins URL: `http://<PUBLIC_IP>:8080`
- K8s Master IP: `<PUBLIC_IP>`
- ECR Registry: `<ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com`

### Verify Jenkins

```powershell
# SSH to Jenkins
ssh -i ~/.ssh/kahoot-prod ubuntu@<JENKINS_IP>

# Get initial password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword

# Access Jenkins
# Open: http://<JENKINS_IP>:8080
```

### Verify Kubernetes

```bash
# SSH to K8s master
ssh -i ~/.ssh/kahoot-prod ubuntu@<K8S_MASTER_IP>

# Check cluster
kubectl get nodes
kubectl get pods --all-namespaces
```

## Step 7: Initial Configuration (10 minutes)

### Configure Jenkins

1. **Access Jenkins:** `http://<JENKINS_IP>:8080`
2. **Enter initial password** (from Step 6)
3. **Install suggested plugins**
4. **Create admin user**
5. **Add credentials:**
   - AWS credentials (for ECR)
   - SonarQube token
   - Kubeconfig

### Get Kubeconfig

```bash
# From K8s master
scp -i ~/.ssh/kahoot-prod ubuntu@<K8S_MASTER_IP>:/home/ubuntu/.kube/config ./kubeconfig

# Copy to Jenkins
scp -i ~/.ssh/kahoot-prod ./kubeconfig ubuntu@<JENKINS_IP>:/var/lib/jenkins/.kube/config

# Fix permissions
ssh -i ~/.ssh/kahoot-prod ubuntu@<JENKINS_IP>
sudo chown jenkins:jenkins /var/lib/jenkins/.kube/config
```

### Deploy SonarQube

```bash
# On K8s master
kubectl apply -f /path/to/k8s/sonarqube-deployment.yaml
kubectl get pods -n sonarqube
```

## Step 8: Deploy Application (15 minutes)

### Create Jenkins Pipeline

1. **New Item** → Pipeline
2. **Name:** kahoot-clone-cicd
3. **Pipeline script from SCM:** Git
4. **Repository URL:** `<your-repo-url>`
5. **Script Path:** Jenkinsfile
6. **Save**

### Run First Build

1. Click **Build Now**
2. Monitor console output
3. Wait for completion (~25 minutes first time)

**Pipeline stages:**
- Checkout code
- Install dependencies
- Build Docker images
- Push to ECR
- Security scans (Trivy + SonarQube)
- Deploy to K8s

## Total Timeline

| Step | Duration | Task |
|------|----------|------|
| 1 | 5 min | Prerequisites installation |
| 2 | 5 min | AWS configuration |
| 3 | 2 min | SSH key generation |
| 4 | 5 min | Remote state setup |
| 5 | 3 min | Environment configuration |
| 6 | 15 min | Terraform deployment |
| 7 | 25 min | Ansible configuration |
| 8 | 5 min | Verification |
| 9 | 10 min | Initial configuration |
| 10 | 15 min | First application deployment |
| **Total** | **~90 min** | **Complete setup** |

## Cost Estimate

**Infrastructure:**
- 1 x t3.medium (Jenkins): $30/month
- 3 x t3.medium (K8s): $90/month
- 7 x ECR repositories: $0.10/GB/month
- S3 + DynamoDB: <$1/month
- **Total: ~$120/month**

**Free tier eligible components:**
- EC2 hours (750 hours/month free first year)
- S3 storage (5GB free)
- ECR (500MB free)

## Common Issues

### Issue: "Permission denied (publickey)"

**Solution:**
```bash
# Fix SSH key permissions
chmod 600 ~/.ssh/kahoot-prod
```

### Issue: "Terraform state locked"

**Solution:**
```powershell
terraform force-unlock <LOCK_ID>
```

### Issue: "Ansible cannot connect"

**Solution:**
```bash
# Wait for instances to boot
sleep 60

# Test connectivity
ansible all -i inventory/hosts -m ping
```

### Issue: "Jenkins initial password not found"

**Solution:**
```bash
# Wait for Jenkins to fully start
sleep 30

# Check logs
ssh -i ~/.ssh/kahoot-prod ubuntu@<JENKINS_IP>
sudo journalctl -u jenkins -f
```

## Next Steps

After successful deployment:

1. **Setup Monitoring:**
   - Install Prometheus + Grafana
   - Configure CloudWatch alarms

2. **Configure Backups:**
   - Enable EBS snapshots
   - Setup etcd backups

3. **Implement CI/CD:**
   - Configure webhooks
   - Setup automated testing

4. **Security Hardening:**
   - Enable MFA
   - Rotate credentials
   - Setup AWS GuardDuty

## Additional Resources

- [Full Documentation](README.md)
- [Terraform Modules](terraform/modules/README.md)
- [Ansible Roles](ansible/roles/README.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

## Success Checklist

- [ ] AWS credentials configured
- [ ] SSH keys generated
- [ ] Remote state created
- [ ] Terraform applied successfully
- [ ] Ansible completed without errors
- [ ] Jenkins accessible
- [ ] Kubernetes cluster running
- [ ] ECR repositories created
- [ ] First pipeline run successful

---

**Congratulations!** Your enterprise infrastructure is ready!
