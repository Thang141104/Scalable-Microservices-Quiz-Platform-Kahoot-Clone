# PRE-DEPLOYMENT CHECKLIST

## KIỂM TRA ĐÃ HOÀN THÀNH

### 1. **Deployment Files**
- Xóa file trùng: `k8s/auth-deployment.yaml`, `k8s/frontend-deployment.yaml`
- Tất cả deployment files trong `k8s/services/` và `k8s/frontend/`
- Replicas:
  - Gateway: 2 replicas
  - Auth: 2 replicas
  - User: 2 replicas
  - Quiz: 2 replicas
  - Game: 2 replicas
  - Analytics: 2 replicas
  - Frontend: 1 replica
- Pod Anti-Affinity: Configured để spread replicas across nodes
- Removed nodeSelector: Kubernetes tự động load balance

### 2. **Jenkinsfile**
- Branch: `main` (đã sửa từ `fix/auth-routing-issues`)
- ECR Registry: `802346121373.dkr.ecr.us-east-1.amazonaws.com`
- AWS Region: `us-east-1`
- Deployment paths: `k8s/services/`, `k8s/frontend/`, `k8s/base/`
- Image tags: `${BUILD_VERSION}` (dynamic per build)
- Rollout strategy: Force restart all deployments

### 3. **ConfigMap**
- Node IPs: 34.200.233.56, 44.198.175.214
- NodePorts:
  - Gateway: 30000
  - Game WebSocket: 30003
  - Frontend: 30006
- Fallback URLs: Added for manual failover
- Internal service URLs: Using Kubernetes DNS

### 4. **Services Configuration**
- Gateway: NodePort 30000
- Game: NodePort 30003 (for WebSocket)
- Frontend: NodePort 30006
- Backend services: ClusterIP (internal only)

---

## ECR & CACHE STRATEGY

### **KHÔNG NÊN XÓA ECR Images**

**Lý do:**
1. **Rollback Safety**: Nếu build mới lỗi, có thể rollback về image cũ ngay lập tức
2. **Layer Cache**: Docker sử dụng layer cache để build nhanh hơn
3. **Version History**: Theo dõi lịch sử deployments

**Jenkinsfile đã có lifecycle management:**
```groovy
buildDiscarder(logRotator(numToKeepStr: '10'))
```
→ Chỉ giữ 10 builds gần nhất

**Nx Cache đã có S3 lifecycle:**
```json
{
  "Expiration": {"Days": 7}
}
```
→ Tự động xóa cache sau 7 ngày

### **KHI NÀO NÊN XÓA ECR:**
- **Khi test lần đầu**: Xóa tất cả images cũ để bắt đầu sạch
- **Khi có breaking changes**: Force rebuild from scratch
- **Khi hết storage**: ECR có giới hạn free tier 500MB

### **LỆNH XÓA ECR (Nếu cần):**
```bash
# List all images
aws ecr list-images --repository-name kahoot-clone-gateway --region us-east-1

# Delete all images in a repository
for repo in gateway auth user quiz game analytics frontend; do
  aws ecr batch-delete-image \
    --repository-name kahoot-clone-${repo} \
    --region us-east-1 \
    --image-ids "$(aws ecr list-images --repository-name kahoot-clone-${repo} --region us-east-1 --query 'imageIds[*]' --output json)" || true
done

# Or delete specific image by tag
aws ecr batch-delete-image \
  --repository-name kahoot-clone-gateway \
  --region us-east-1 \
  --image-ids imageTag=123
```

### **KHUYẾN NGHỊ CHO LẦN DEPLOY ĐẦU:**

**OPTION 1: XÓA TẤT CẢ (Clean Start) - KHUYẾN NGHỊ**
```bash
# Xóa tất cả images để test build process hoàn chỉnh
for repo in gateway auth user quiz game analytics frontend; do
  aws ecr batch-delete-image \
    --repository-name kahoot-clone-${repo} \
    --region us-east-1 \
    --image-ids "$(aws ecr list-images --repository-name kahoot-clone-${repo} --region us-east-1 --query 'imageIds[*]' --output json)" || true
done
```

**OPTION 2: GIỮ IMAGES CŨ (Incremental Build)**
- Jenkins sẽ build và push images mới với tag BUILD_NUMBER
- Images cũ vẫn còn để rollback

---

## FINAL CHECKLIST TRƯỚC KHI PUSH

### **A. Local Files Ready**
- [ ] Tất cả duplicate files đã xóa
- [ ] Jenkinsfile branch = `main`
- [ ] ConfigMap có đúng IPs
- [ ] Secrets.yaml KHÔNG có trong Git (đã upload lên S3)
- [ ] All deployment files có đúng replicas và affinity

### **B. AWS Infrastructure Ready**
- [ ] ECR repositories exist (7 repos)
- [ ] S3 bucket for secrets: `s3://kahoot-clone-secrets-802346121373/secrets.yaml`
- [ ] S3 bucket for Nx cache: `s3://kahoot-nx-cache-802346121373`
- [ ] Jenkins credentials configured:
  - `k8s-master-ssh-key`: SSH key to master node
  - `sonarqube-token`: SonarQube token (optional)
  - AWS credentials in Jenkins

### **C. Kubernetes Cluster Ready**
- [ ] Master node: 98.84.105.168 accessible via SSH
- [ ] Worker nodes: 34.200.233.56, 44.198.175.214
- [ ] Namespace `kahoot-clone` will be created by Jenkins
- [ ] NO need to label nodes (automatic distribution)

### **D. MongoDB Atlas Ready**
- [ ] Cluster accessible from AWS IPs
- [ ] Connection string in secrets.yaml on S3
- [ ] Database user created with proper permissions

### **E. Jenkins Configuration**
- [ ] Generic Webhook Trigger installed
- [ ] Webhook token: `kahoot-clone-webhook-token`
- [ ] GitHub webhook configured: `http://<JENKINS_IP>:8080/generic-webhook-trigger/invoke?token=kahoot-clone-webhook-token`
- [ ] SSH key to K8s master configured in Jenkins credentials

---

## DEPLOYMENT STEPS

### **1. Clean ECR (Optional - First Time Recommended)**
```bash
# Run on local machine or Jenkins server
for repo in gateway auth user quiz game analytics frontend; do
  echo "Cleaning $repo..."
  aws ecr batch-delete-image \
    --repository-name kahoot-clone-${repo} \
    --region us-east-1 \
    --image-ids "$(aws ecr list-images --repository-name kahoot-clone-${repo} --region us-east-1 --query 'imageIds[*]' --output json)" 2>/dev/null || echo "Repository $repo is empty or doesn't exist"
done
```

### **2. Verify Secrets on S3**
```bash
# Check if secrets file exists
aws s3 ls s3://kahoot-clone-secrets-802346121373/secrets.yaml

# If not, upload it
aws s3 cp k8s/secrets.yaml s3://kahoot-clone-secrets-802346121373/secrets.yaml
```

### **3. Commit & Push to GitHub**
```bash
# Check current branch
git branch

# Ensure on main branch
git checkout main

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: implement high availability with 2 replicas and auto load balancing"

# Push to trigger Jenkins
git push origin main
```

### **4. Monitor Jenkins Build**
- Go to Jenkins dashboard: `http://<JENKINS_IP>:8080`
- Watch pipeline execution
- Check console output for errors

### **5. Verify Deployment on K8s**
```bash
# SSH to master node
ssh -i kahoot-clone-key.pem ubuntu@98.84.105.168

# Check deployments
kubectl get deployments -n kahoot-clone

# Check pods distribution
kubectl get pods -n kahoot-clone -o wide

# Check services
kubectl get svc -n kahoot-clone

# Test endpoints
curl http://34.200.233.56:30000/health
curl http://44.198.175.214:30006
```

---

## EXPECTED RESULTS

### **Successful Build:**
```
 All 7 services built successfully
 Images pushed to ECR with BUILD_NUMBER tag
 SonarQube analysis passed (or reported)
 Trivy security scan completed
 Deployments created/updated
 All pods Running (may take 3-5 minutes)
```

### **Pod Distribution:**
```
NAME READY STATUS NODE
gateway-xxx-1 1/1 Running 34.200.233.56
gateway-xxx-2 1/1 Running 44.198.175.214
auth-service-xxx-1 1/1 Running 34.200.233.56
auth-service-xxx-2 1/1 Running 44.198.175.214
user-service-xxx-1 1/1 Running 34.200.233.56
user-service-xxx-2 1/1 Running 44.198.175.214
... (similar pattern for all services)
```

### **Services Accessible:**
- Gateway: `http://34.200.233.56:30000`
- Game WebSocket: `http://34.200.233.56:30003`
- Frontend: `http://44.198.175.214:30006`

---

## TROUBLESHOOTING

### **ImagePullBackOff:**
- ECR secret expired (recreate after 12 hours)
- Image tag doesn't exist in ECR
- Network issues between K8s and ECR

**Fix:**
```bash
# Manually recreate ECR secret
ECR_TOKEN=$(aws ecr get-login-password --region us-east-1)
kubectl create secret docker-registry ecr-registry-secret \
  --docker-server=802346121373.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password="$ECR_TOKEN" \
  --namespace=kahoot-clone \
  --dry-run=client -o yaml | kubectl apply -f -
```

### **Pods Pending:**
- Not enough resources on nodes
- Anti-affinity rules too strict
- Node selector mismatch (KHÔNG nên xảy ra vì đã xóa)

**Fix:**
```bash
# Check node resources
kubectl describe nodes

# Check pod events
kubectl describe pod <POD_NAME> -n kahoot-clone
```

### **Build Fails:**
- Check Jenkins console output
- Verify AWS credentials
- Check network connectivity to ECR
- Verify secrets.yaml on S3

---

## COST OPTIMIZATION

**Current Setup:**
- **ECR Storage**: ~2-3GB (7 services × ~300MB avg)
- **Nx S3 Cache**: ~500MB-1GB
- **Build Time**: ~10-15 minutes (with cache)

**Recommendations:**
1. Keep last 10 builds in ECR (configured)
2. Use Nx cache (configured)
3. Run builds only on push to main (configured)
4. Clean up failed pods automatically (configured)

---

## READY TO DEPLOY!

**Bạn đã sẵn sàng để:**
1. Xóa ECR images cũ (nếu muốn clean start)
2. Commit & push code
3. Jenkins tự động build & deploy
4. Monitor và verify kết quả

**Command Summary:**
```bash
# Clean ECR (optional)
for repo in gateway auth user quiz game analytics frontend; do
  aws ecr batch-delete-image --repository-name kahoot-clone-${repo} --region us-east-1 --image-ids "$(aws ecr list-images --repository-name kahoot-clone-${repo} --region us-east-1 --query 'imageIds[*]' --output json)" 2>/dev/null || true
done

# Push to GitHub
git add .
git commit -m "feat: high availability deployment with 2 replicas"
git push origin main
```

**Thời gian ước tính:**
- Build: 10-15 phút
- Deploy: 3-5 phút
- Total: ~20 phút để tất cả pods Running
