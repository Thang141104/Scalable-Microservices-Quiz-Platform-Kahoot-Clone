# Remote State Backend Setup

## Purpose

This directory contains Terraform configuration to set up **remote state storage** using AWS S3 and DynamoDB.

## Why Remote State?

**Benefits:**
- **Team Collaboration:** Multiple team members can work on same infrastructure
- **State Locking:** Prevents concurrent modifications
- **State Versioning:** Track changes and rollback if needed
- **Security:** State encrypted at rest

## Setup Instructions

### 1. Initialize Backend

```powershell
cd infrastructure/terraform/backend

# Copy example tfvars
copy terraform.tfvars.example terraform.tfvars

# Edit with your AWS credentials
notepad terraform.tfvars
```

### 2. Create Resources

```powershell
# Initialize
terraform init

# Review plan
terraform plan

# Create S3 buckets and DynamoDB tables
terraform apply -auto-approve
```

**This creates:**
- 3 S3 buckets (dev, staging, prod)
- 3 DynamoDB tables for state locking
- Versioning enabled
- Encryption enabled
- Public access blocked

### 3. Configure Environment Backends

After creating the backend resources, update each environment to use remote state:

**For Production:**

Edit `infrastructure/terraform/environments/prod/main.tf`:

```hcl
terraform {
  backend "s3" {
    bucket         = "kahoot-clone-terraform-state-prod"
    key            = "prod/terraform.tfstate"
    region         = "ap-southeast-1"
    encrypt        = true
    dynamodb_table = "kahoot-clone-terraform-locks-prod"
  }
}
```

**For Staging:**

Edit `infrastructure/terraform/environments/staging/main.tf`:

```hcl
terraform {
  backend "s3" {
    bucket         = "kahoot-clone-terraform-state-staging"
    key            = "staging/terraform.tfstate"
    region         = "ap-southeast-1"
    encrypt        = true
    dynamodb_table = "kahoot-clone-terraform-locks-staging"
  }
}
```

### 4. Migrate Existing State

If you have existing local state:

```powershell
cd infrastructure/terraform/environments/prod

# Initialize with backend config
terraform init -migrate-state

# Verify remote state
terraform state list
```

## State Management

### View State

```powershell
# List resources
terraform state list

# Show specific resource
terraform state show aws_instance.jenkins

# Pull remote state
terraform state pull > current-state.json
```

### Lock State

State is automatically locked during operations. If locked:

```powershell
# View lock
aws dynamodb get-item \
  --table-name kahoot-clone-terraform-locks-prod \
  --key '{"LockID":{"S":"kahoot-clone-terraform-state-prod/prod/terraform.tfstate-md5"}}'

# Force unlock (use carefully!)
terraform force-unlock <LOCK_ID>
```

### State Versioning

```powershell
# List versions
aws s3api list-object-versions \
  --bucket kahoot-clone-terraform-state-prod \
  --prefix prod/

# Download specific version
aws s3api get-object \
  --bucket kahoot-clone-terraform-state-prod \
  --key prod/terraform.tfstate \
  --version-id <VERSION_ID> \
  terraform.tfstate.backup
```

## Security

### Bucket Policy

S3 buckets are configured with:
- Server-side encryption (AES256)
- Versioning enabled
- Public access blocked
- Secure transport required

### Access Control

Recommended IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::kahoot-clone-terraform-state-*",
        "arn:aws:s3:::kahoot-clone-terraform-state-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/kahoot-clone-terraform-locks-*"
    }
  ]
}
```

## Cost

**S3 Storage:**
- Standard storage: $0.023/GB
- Typical state file: <1MB
- **Cost:** < $0.01/month per environment

**DynamoDB:**
- Pay-per-request pricing
- Typical operations: <100/day
- **Cost:** < $0.01/month per environment

**Total:** < $0.05/month for all environments

## Backup & Recovery

### Manual Backup

```powershell
# Backup current state
aws s3 cp s3://kahoot-clone-terraform-state-prod/prod/terraform.tfstate \
  ./backup/terraform.tfstate.$(date +%Y%m%d)
```

### Restore from Backup

```powershell
# Download specific version
aws s3api get-object \
  --bucket kahoot-clone-terraform-state-prod \
  --key prod/terraform.tfstate \
  --version-id <VERSION_ID> \
  terraform.tfstate.restored

# Verify and apply
terraform init
terraform plan -state=terraform.tfstate.restored
```

## Troubleshooting

### Error: "Error acquiring the state lock"

**Solution:**
```powershell
# Force unlock
terraform force-unlock <LOCK_ID>
```

### Error: "Failed to get existing workspaces"

**Solution:**
```powershell
# Verify S3 bucket exists
aws s3 ls s3://kahoot-clone-terraform-state-prod

# Check credentials
aws sts get-caller-identity
```

### Error: "AccessDenied: Access Denied"

**Solution:**
- Check IAM permissions
- Verify AWS credentials
- Ensure bucket policy allows access

## Cleanup

To remove backend resources (use with caution):

```powershell
cd infrastructure/terraform/backend

# Destroy backend resources
terraform destroy

# Manually delete S3 buckets (if versioned objects exist)
aws s3 rm s3://kahoot-clone-terraform-state-prod --recursive
aws s3 rb s3://kahoot-clone-terraform-state-prod
```

---

**Important:** Always backup state before major changes!
