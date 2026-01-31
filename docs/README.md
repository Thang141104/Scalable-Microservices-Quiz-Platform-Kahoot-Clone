# Kahoot Clone - Documentation

## Documentation Structure

### Infrastructure
- [Infrastructure Guide](infrastructure/README.md) - Complete infrastructure setup
- [Quick Start](infrastructure/QUICKSTART.md) - Fast deployment guide
- [Nx Cache Automation](infrastructure/NX_AUTOMATION.md) - Build caching configuration

### Deployment
- Current deployment uses Terraform + Ansible + Jenkins CI/CD
- Kubernetes cluster with multi-service architecture
- AWS infrastructure: ECR, S3, EC2

## Quick Start

1. **Prerequisites**
   - AWS account with credentials configured
   - Terraform installed
   - Ansible installed (via WSL on Windows)
   - kubectl installed

2. **Deploy Infrastructure**
   ```bash
   cd infrastructure/terraform
   terraform init
   terraform apply
   ```

3. **Configure Services**
   ```bash
   cd ../ansible
   ansible-playbook -i inventory/hosts site.yml
   ```

4. **Access Application**
   - Frontend: http://<WORKER_IP>:30006
   - Gateway: http://<WORKER_IP>:30000
   - Jenkins: http://<JENKINS_IP>:8080

## Architecture

- **Microservices**: auth, user, quiz, game, analytics
- **Gateway**: API gateway for routing
- **Frontend**: React application
- **Infrastructure**: AWS (us-east-1)
- **Orchestration**: Kubernetes (1.28)
- **CI/CD**: Jenkins with automated pipelines
- **Monitoring**: Prometheus metrics endpoints

## See Also

- [Main README](../README.md) - Project overview
- [Jenkinsfile](../Jenkinsfile) - CI/CD pipeline configuration
- [K8s Deployments](../k8s/) - Kubernetes manifests
