# DEPLOYMENT CHECKLIST

## ĐÃ FIX CÁC LỖI

### 1. **File Trùng Lặp**
- **Trước**: Có 4 cặp file trùng (auth, user, frontend, sonarqube)
- **Sau**: Đã xóa các file trùng ở root k8s/, giữ files trong thư mục con

### 2. **Service Definitions Trùng**
- **Trước**: Mỗi deployment file có 2 Service definitions giống nhau
- **Sau**: Đã xóa tất cả Service trùng, mỗi service chỉ có 1 definition

### 3. **YAML Syntax Errors**
- **Trước**: auth-deployment.yaml có lỗi ngắt dòng `periodSeconds: 5---`
- **Sau**: Đã fix tất cả YAML syntax errors

### 4. **ECR Registry Regions**
- **Trước**: user-service dùng ap-southeast-1, các services khác dùng us-east-1
- **Sau**: Tất cả services đều dùng us-east-1 (nhất quán với Jenkinsfile)

### 5. **Pod Affinity cho Co-location**
- **Trước**: Pods có thể bị schedule tràn lan trên các nodes
- **Sau**: Đã thêm podAffinity để các backend services được schedule cùng node (giảm latency)

### 6. **Jenkinsfile Deployment Paths**
- **Trước**: kubectl apply -f k8s/auth-deployment.yaml (file không tồn tại)
- **Sau**: kubectl apply -f k8s/services/auth-deployment.yaml (đúng path)

### 7. **ConfigMap URLs**
- **Trước**: Hard-coded IPs 34.200.233.56, 44.198.175.214
- **Sau**: Đã thêm comment hướng dẫn update, fix Socket URL từ port 30004 → 30003

---

## CẤU TRÚC DEPLOYMENTS HIỆN TẠI

```
k8s/
├── base/
│ ├── namespace.yaml # Namespace kahoot-clone
│ ├── configmap.yaml # App configuration
│ └── secrets.yaml.example # Template for secrets
├── services/
│ ├── auth-deployment.yaml # Auth Service + ClusterIP (3001)
│ ├── user-deployment.yaml # User Service + ClusterIP (3004)
│ ├── quiz-deployment.yaml # Quiz Service + ClusterIP (3002)
│ ├── game-deployment.yaml # Game Service + NodePort 30003 (for Socket.IO)
│ ├── analytics-deployment.yaml # Analytics + ClusterIP (3005)
│ └── gateway-deployment.yaml # Gateway + NodePort 30000
├── frontend/
│ └── frontend-deployment.yaml # Frontend + NodePort 30006
├── secrets.yaml # KHÔNG commit lên Git
└── test-connectivity.sh # Script test giao tiếp giữa services
```

---

## SERVICE COMMUNICATION ARCHITECTURE

```
External Users → Frontend (NodePort 30006)
                     ↓
              Gateway (NodePort 30000)
                     ↓
        ┌────────────┼────────────┐
        ↓ ↓ ↓
   Auth (3001) User (3004) Quiz (3002)
        │ │ │
        └────────────┼────────────┘
                     ↓
              Analytics (3005)

External Users → Game Service (NodePort 30003, WebSocket)
```

### Internal DNS Names:
- `auth-service.kahoot-clone.svc.cluster.local` → 3001
- `user-service.kahoot-clone.svc.cluster.local` → 3004
- `quiz-service.kahoot-clone.svc.cluster.local` → 3002
- `game-service.kahoot-clone.svc.cluster.local` → 3003
- `analytics-service.kahoot-clone.svc.cluster.local` → 3005
- `gateway.kahoot-clone.svc.cluster.local` → 3000
- `frontend.kahoot-clone.svc.cluster.local` → 3006

**Short names work within same namespace:**
- `auth-service` → `auth-service.kahoot-clone.svc.cluster.local`

---

## DEPLOYMENT STEPS (VIA JENKINS)

### 1. **Chuẩn Bị Secrets**
```bash
# Tạo secrets.yaml từ template
cp k8s/base/secrets.yaml.example k8s/secrets.yaml

# Chỉnh sửa với credentials thật
vi k8s/secrets.yaml

# Upload lên S3 (Jenkins sẽ download)
aws s3 cp k8s/secrets.yaml s3://kahoot-secrets-bucket/secrets.yaml
```

### 2. **Update ConfigMap với Worker Node IPs**
```bash
# Lấy worker node IPs
kubectl get nodes -o wide

# Update k8s/base/configmap.yaml
REACT_APP_API_URL: "http://<WORKER_NODE_IP>:30000"
REACT_APP_SOCKET_URL: "http://<WORKER_NODE_IP>:30003"
FRONTEND_URL: "http://<WORKER_NODE_IP>:30006"
```

### 3. **Push Code & Trigger Jenkins**
```bash
git add .
git commit -m "fix: deployment configurations"
git push origin main
# Jenkins tự động trigger và deploy
```

### 4. **Verify Deployment**
```bash
# SSH vào master node
ssh -i kahoot-clone-key.pem ubuntu@<MASTER_IP>

# Run connectivity test
chmod +x k8s/test-connectivity.sh
./k8s/test-connectivity.sh

# Check pods
kubectl get pods -n kahoot-clone -o wide

# Check services
kubectl get svc -n kahoot-clone
```

---

## MANUAL DEPLOYMENT (KHÔNG DÙNG JENKINS)

```bash
# 1. Apply namespace
kubectl apply -f k8s/base/namespace.yaml

# 2. Apply ConfigMap
kubectl apply -f k8s/base/configmap.yaml

# 3. Apply Secrets
kubectl apply -f k8s/secrets.yaml

# 4. Create ECR Secret
aws ecr get-login-password --region us-east-1 | \
kubectl create secret docker-registry ecr-registry-secret \
  --docker-server=802346121373.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password-stdin \
  --namespace=kahoot-clone

# 5. Deploy Services (theo thứ tự)
kubectl apply -f k8s/services/gateway-deployment.yaml
kubectl apply -f k8s/services/auth-deployment.yaml
kubectl apply -f k8s/services/user-deployment.yaml
kubectl apply -f k8s/services/quiz-deployment.yaml
kubectl apply -f k8s/services/game-deployment.yaml
kubectl apply -f k8s/services/analytics-deployment.yaml
kubectl apply -f k8s/frontend/frontend-deployment.yaml

# 6. Wait for all pods
kubectl wait --for=condition=ready pod --all -n kahoot-clone --timeout=600s

# 7. Check status
kubectl get all -n kahoot-clone
```

---

## VERIFICATION CHECKLIST

### DNS & Networking
- [ ] All pods Running
- [ ] All services have endpoints
- [ ] DNS resolution works (nslookup auth-service)
- [ ] Service-to-service connectivity works
- [ ] Gateway can route to backend services

### External Access
- [ ] Frontend accessible: `http://<WORKER_IP>:30006`
- [ ] Gateway API accessible: `http://<WORKER_IP>:30000`
- [ ] Game WebSocket accessible: `http://<WORKER_IP>:30003`

### Pod Distribution
- [ ] Pods distributed evenly across both nodes (anti-affinity working)
- [ ] Each backend service has 2 replicas running on different nodes
- [ ] No pods on master node (unless allowed)
- [ ] Resource requests/limits reasonable

---

## HIGH AVAILABILITY STRATEGY

**Replicas & Load Balancing:**
- **Gateway**: 2 replicas (entry point redundancy)
- **Auth Service**: 2 replicas (authentication critical)
- **User Service**: 2 replicas (profile management)
- **Quiz Service**: 2 replicas (quiz CRUD)
- **Game Service**: 2 replicas (real-time game sessions)
- **Analytics Service**: 2 replicas (data processing)
- **Frontend**: 1 replica (static files, low resource)

**Pod Anti-Affinity:**
- Mỗi service có 2 replicas **tự động phân tán** trên 2 nodes khác nhau
- **Weight 100** (cao) → K8s ưu tiên mạnh việc tách replica ra khỏi nhau
- Nếu 1 node down → service vẫn hoạt động từ replica trên node còn lại

**Pod Affinity (Secondary):**
- **Weight 50** (thấp hơn) → Chỉ là gợi ý, không bắt buộc
- Giúp các backend services có xu hướng chạy gần nhau (giảm latency)

**Automatic Load Balancing:**
- Kubernetes Service (ClusterIP/NodePort) tự động load-balance giữa 2 replicas
- Traffic distribution: Round-robin hoặc session affinity (tuỳ config)
- Health checks: Liveness + Readiness probes đảm bảo chỉ route đến pod healthy

**Resource Distribution (Example):**
```
Node 1 (34.200.233.56):
- gateway-xxx-1, auth-xxx-1, user-xxx-1
- quiz-xxx-1, game-xxx-1, analytics-xxx-1
- frontend-xxx-1
Total: ~812Mi, ~350m CPU

Node 2 (44.198.175.214):
- gateway-xxx-2, auth-xxx-2, user-xxx-2
- quiz-xxx-2, game-xxx-2, analytics-xxx-2
Total: ~768Mi, ~300m CPU
```

**Benefits:**
1. **Zero Downtime**: Nếu 1 node crash, services vẫn chạy trên node còn lại
2. **Even Load**: Tải phân đều ~40% mỗi node, không có node bị quá tải
3. **Auto Recovery**: K8s tự động reschedule pods nếu node fail
4. **Easy Scaling**: Scale up bằng cách tăng replicas, K8s tự phân bổ

---

## TROUBLESHOOTING

### Service không thể giao tiếp
```bash
# Test DNS từ pod
kubectl run test-dns --image=busybox --rm -it --namespace=kahoot-clone -- nslookup auth-service

# Test connectivity
kubectl run test-conn --image=nicolaka/netshoot --rm -it --namespace=kahoot-clone -- nc -zv auth-service 3001

# Check endpoints
kubectl get endpoints -n kahoot-clone
```

### Pod bị CrashLoopBackOff
```bash
# Xem logs
kubectl logs -n kahoot-clone <POD_NAME>

# Xem events
kubectl describe pod -n kahoot-clone <POD_NAME>
```

### ImagePullBackOff
```bash
# Check ECR secret
kubectl get secret ecr-registry-secret -n kahoot-clone

# Recreate secret
kubectl delete secret ecr-registry-secret -n kahoot-clone
# Sau đó tạo lại như bước 4 ở trên
```

---

## EXPECTED RESOURCE USAGE

| Service | Pods | Memory Request | Memory Limit | CPU Request | CPU Limit | Replicas |
|---------|------|----------------|--------------|-------------|-----------|----------|
| Gateway | 2 | 128Mi × 2 | 256Mi × 2 | 50m × 2 | 200m × 2 | 2 |
| Auth | 2 | 128Mi × 2 | 256Mi × 2 | 50m × 2 | 200m × 2 | 2 |
| User | 2 | 128Mi × 2 | 256Mi × 2 | 50m × 2 | 200m × 2 | 2 |
| Quiz | 2 | 128Mi × 2 | 256Mi × 2 | 50m × 2 | 200m × 2 | 2 |
| Game | 2 | 128Mi × 2 | 256Mi × 2 | 50m × 2 | 200m × 2 | 2 |
| Analytics | 2 | 128Mi × 2 | 256Mi × 2 | 50m × 2 | 200m × 2 | 2 |
| Frontend | 1 | 128Mi | 256Mi | 50m | 200m | 1 |
| **TOTAL** | **13** | **1.625Gi** | **3.25Gi** | **650m** | **2600m** |

**Pod Distribution với Anti-Affinity:**
- **Node 1**: 1 replica của mỗi backend service + frontend = ~7 pods
- **Node 2**: 1 replica của mỗi backend service = ~6 pods

**Recommended Node:** t3.medium (2 vCPU, 4GB RAM) × 2 workers

---

## QUAN TRỌNG

1. **KHÔNG commit k8s/secrets.yaml** lên Git - sử dụng secrets.yaml.example
2. **UPDATE ConfigMap** với worker node IPs thực tế sau khi deploy infrastructure
3. **Socket.IO** cần NodePort 30003 (game-service) để browser có thể kết nối trực tiếp
4. **ECR Secret** hết hạn sau 12 giờ - cần refresh nếu deploy lại sau 12h
5. **Anti-Affinity** đảm bảo 2 replicas của cùng service KHÔNG chạy trên cùng node → High Availability
6. **Mỗi service có 2 replicas** → nếu 1 pod crash hoặc 1 node down, service vẫn hoạt động
7. **Không cần label nodes** - Kubernetes tự động phân bổ pods đều dựa vào anti-affinity
