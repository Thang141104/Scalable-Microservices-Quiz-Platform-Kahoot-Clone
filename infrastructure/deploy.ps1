#!/usr/bin/env pwsh
# ===================================
# Complete Infrastructure Deployment
# Terraform + Ansible
# ===================================

param(
    [ValidateSet('all', 'terraform', 'ansible', 'sonarqube', 'destroy')]
    [string]$Action = "all",
    
    [switch]$AutoApprove
)

$ErrorActionPreference = "Stop"

function Write-Header {
    param([string]$Title)
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  $Title" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n━━━ $Message" -ForegroundColor Yellow
}

function Invoke-TerraformDeploy {
    Write-Header "TERRAFORM: Infrastructure Provisioning"
    
    Set-Location terraform
    
    Write-Step "Initializing Terraform"
    terraform init
    if ($LASTEXITCODE -ne 0) { throw "Terraform init failed" }
    
    Write-Step "Planning infrastructure"
    terraform plan -out=tfplan
    if ($LASTEXITCODE -ne 0) { throw "Terraform plan failed" }
    
    if ($AutoApprove) {
        Write-Step "Applying infrastructure (auto-approved)"
        terraform apply tfplan
    } else {
        Write-Step "Applying infrastructure"
        terraform apply
    }
    
    if ($LASTEXITCODE -ne 0) { throw "Terraform apply failed" }
    
    Write-Host "`n✅ Infrastructure created!" -ForegroundColor Green
    Write-Host "   - Ansible inventory generated: ../ansible/inventory/hosts`n" -ForegroundColor Gray
    
    # Save outputs
    terraform output -json > ../deployment-outputs.json
    
    Set-Location ..
}

function Invoke-AnsibleConfigure {
    Write-Header "ANSIBLE: Server Configuration"
    
    $inventoryPath = "ansible\inventory\hosts"
    
    if (-not (Test-Path $inventoryPath)) {
        throw "Ansible inventory not found. Run Terraform first!"
    }
    
    # Load Terraform outputs for Nx configuration
    if (Test-Path "deployment-outputs.json") {
        $outputs = Get-Content "deployment-outputs.json" | ConvertFrom-Json
        $env:NX_CACHE_BUCKET = $outputs.nx_cache_bucket.value
        $env:ECR_REGISTRY = $outputs.ecr_registry_url.value
        $env:AWS_REGION = "us-east-1"
        
        Write-Host "📦 Nx Configuration:" -ForegroundColor Cyan
        Write-Host "   Cache Bucket: $env:NX_CACHE_BUCKET" -ForegroundColor Gray
        Write-Host "   ECR Registry: $env:ECR_REGISTRY`n" -ForegroundColor Gray
    }
    
    Write-Step "Checking inventory"
    Get-Content $inventoryPath | Write-Host
    
    Write-Step "Copying SSH key to WSL filesystem and setting permissions"
    wsl mkdir -p ~/.ssh
    wsl cp /mnt/d/DevOps_Lab2/DevOps-Kahoot-Clone/infrastructure/terraform/keys/kahoot-clone-key.pem ~/.ssh/kahoot-clone-key.pem
    wsl chmod 600 ~/.ssh/kahoot-clone-key.pem
    
    Write-Step "Updating Ansible inventory to use WSL key path"
    $inventoryPath = "ansible/inventory/hosts"
    $inventoryContent = Get-Content $inventoryPath -Raw
    $inventoryContent = $inventoryContent -replace 'ansible_ssh_private_key_file=.*', 'ansible_ssh_private_key_file=~/.ssh/kahoot-clone-key.pem'
    Set-Content -Path $inventoryPath -Value $inventoryContent -NoNewline
    
    Write-Step "Waiting for instances to be ready (SSH connectivity test with retry)"
    Set-Location ansible
    
    $maxRetries = 10
    $retryCount = 0
    $allReady = $false
    
    while (-not $allReady -and $retryCount -lt $maxRetries) {
        $retryCount++
        Write-Host "   Attempt $retryCount/$maxRetries..." -ForegroundColor Gray
        
        $pingResult = wsl bash -c "export ANSIBLE_HOST_KEY_CHECKING=False && ansible all -i inventory/hosts -m ping 2>&1"
        
        if ($LASTEXITCODE -eq 0 -and $pingResult -like "*SUCCESS*") {
            $allReady = $true
            Write-Host "   ✅ All instances ready!" -ForegroundColor Green
        } else {
            if ($retryCount -lt $maxRetries) {
                Write-Host "   ⏳ Instances not ready yet, waiting 30s..." -ForegroundColor Yellow
                Start-Sleep -Seconds 30
            }
        }
    }
    
    if (-not $allReady) {
        throw "Failed to connect to instances after $maxRetries attempts"
    }
    
    Write-Step "Running Ansible playbook (this may take 20-30 minutes)"
    wsl bash -c "export NX_CACHE_BUCKET='$env:NX_CACHE_BUCKET' ECR_REGISTRY='$env:ECR_REGISTRY' AWS_REGION='$env:AWS_REGION' && ansible-playbook -i inventory/hosts site.yml"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Ansible completed with warnings" -ForegroundColor Yellow
    } else {
        Write-Host "`n✅ Configuration completed!" -ForegroundColor Green
    }
    
    Set-Location ..
}

function Show-DeploymentInfo {
    Write-Header "DEPLOYMENT SUMMARY"
    
    if (Test-Path "deployment-outputs.json") {
        $outputs = Get-Content "deployment-outputs.json" | ConvertFrom-Json
        
        Write-Host "🔧 JENKINS:" -ForegroundColor Yellow
        Write-Host "   URL:      $($outputs.jenkins_url.value)" -ForegroundColor White
        Write-Host "   SSH:      $($outputs.jenkins_ssh_command.value)`n" -ForegroundColor Gray
        
        Write-Host "☸️  KUBERNETES:" -ForegroundColor Yellow
        Write-Host "   Master:   $($outputs.k8s_master_public_ip.value)" -ForegroundColor White
        Write-Host "   Workers:  $($outputs.k8s_worker_public_ips.value -join ', ')`n" -ForegroundColor White
        
        Write-Host "🐳 ECR REGISTRY:" -ForegroundColor Yellow
        Write-Host "   ID:       $($outputs.ecr_registry_id.value)`n" -ForegroundColor White
        
        Write-Host "� NX CACHE:" -ForegroundColor Yellow
        Write-Host "   Bucket:   $($outputs.nx_cache_bucket.value)" -ForegroundColor White
        Write-Host "   Region:   $($outputs.nx_cache_region.value)`n" -ForegroundColor White
        
        Write-Host "�📝 NEXT STEPS:" -ForegroundColor Cyan
        Write-Host "   1. Access Jenkins and complete setup" -ForegroundColor White
        Write-Host "   2. Configure Jenkins credentials (AWS, SonarQube)" -ForegroundColor White
        Write-Host "   3. Create Jenkins pipeline" -ForegroundColor White
        Write-Host "   4. Deploy SonarQube to K8s: kubectl apply -f k8s/sonarqube-deployment.yaml" -ForegroundColor White
        Write-Host "   5. Run first build`n" -ForegroundColor White
    }
}

function Invoke-SonarQubeDeployment {
    Write-Header "SONARQUBE: Deploy to Kubernetes"
    
    $inventoryPath = "ansible\inventory\hosts"
    
    if (-not (Test-Path $inventoryPath)) {
        throw "Ansible inventory not found. Run Terraform first!"
    }
    
    Write-Step "Deploying SonarQube to Kubernetes cluster"
    Set-Location ansible
    
    wsl bash -c "export ANSIBLE_HOST_KEY_CHECKING=False && ansible-playbook -i inventory/hosts playbooks/deploy-sonarqube.yml"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  SonarQube deployment completed with warnings" -ForegroundColor Yellow
    } else {
        Write-Host "`n✅ SonarQube deployment completed!" -ForegroundColor Green
    }
    
    Set-Location ..
}

function Invoke-TerraformDestroy {
    Write-Header "TERRAFORM: Destroy Infrastructure"
    
    Write-Host "⚠️  This will destroy ALL infrastructure!`n" -ForegroundColor Red
    
    if (-not $AutoApprove) {
        $confirm = Read-Host "Are you sure? (yes/no)"
        if ($confirm -ne "yes") {
            Write-Host "Cancelled." -ForegroundColor Yellow
            return
        }
    }
    
    Set-Location terraform
    
    Write-Step "Destroying infrastructure"
    if ($AutoApprove) {
        terraform destroy -auto-approve
    } else {
        terraform destroy
    }
    
    if ($LASTEXITCODE -ne 0) { throw "Terraform destroy failed" }
    
    Write-Host "`n✅ Infrastructure destroyed!" -ForegroundColor Green
    
    Set-Location ..
}

# ===================================
# Main Execution
# ===================================

try {
    Write-Header "Infrastructure Deployment - Kahoot Clone"
    
    switch ($Action) {
        "terraform" {
            Invoke-TerraformDeploy
            Show-DeploymentInfo
        }
        "ansible" {
            Invoke-AnsibleConfigure
            Show-DeploymentInfo
        }
        "sonarqube" {
            Invoke-SonarQubeDeployment
        }
        "all" {
            Invoke-TerraformDeploy
            Invoke-AnsibleConfigure
            Invoke-SonarQubeDeployment
            Show-DeploymentInfo
        }
        "destroy" {
            Invoke-TerraformDestroy
        }
    }
    
    Write-Host "`n✅ Deployment completed successfully!`n" -ForegroundColor Green
    
} catch {
    Write-Host "`n❌ Deployment failed: $_`n" -ForegroundColor Red
    exit 1
}
