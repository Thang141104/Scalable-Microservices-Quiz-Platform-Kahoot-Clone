# 📊 Prometheus & Grafana Monitoring Stack

Hệ thống monitoring hoàn chỉnh cho Kahoot Clone application với Prometheus metrics collection và Grafana visualization.

## 🎯 Features

### **Prometheus**
- ✅ Auto-discovery services trong Kubernetes
- ✅ Scrape metrics từ tất cả microservices (auth, user, quiz, game, analytics, gateway)
- ✅ Monitor Kubernetes cluster resources
- ✅ 15 days data retention
- ✅ Exposed on NodePort **30909**

### **Grafana**
- ✅ Pre-configured Prometheus datasource
- ✅ 2 built-in dashboards:
  - **Kubernetes Cluster Monitoring**: CPU, Memory, Pods status
  - **Kahoot Application Metrics**: RPS, Response time, Errors, Traffic distribution
- ✅ Exposed on NodePort **30300**
- ✅ Admin credentials: `admin` / `Kahoot@2025`

## 📦 Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Grafana (Port 30300)               │
│  Dashboards:                                        │
│  - Kubernetes Cluster                               │
│  - Kahoot Application                               │
└──────────────────┬──────────────────────────────────┘
                   │ queries
                   ▼
┌─────────────────────────────────────────────────────┐
│             Prometheus (Port 30909)                 │
│  - Auto-discovery via annotations                   │
│  - Scrape interval: 15s                             │
│  - Retention: 15 days                               │
└──────────────────┬──────────────────────────────────┘
                   │ scrapes /metrics
                   ▼
┌─────────────────────────────────────────────────────┐
│              Kahoot Microservices                   │
│  All services expose Prometheus metrics:            │
│  - auth-service:3001/metrics                        │
│  - user-service:3002/metrics                        │
│  - quiz-service:3003/metrics                        │
│  - game-service:3004/metrics                        │
│  - analytics-service:3005/metrics                   │
│  - gateway:3000/metrics                             │
└─────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### **1. Deploy Monitoring Stack**

```bash
# Option A: Using deploy script
cd k8s/monitoring
chmod +x deploy-monitoring.sh
./deploy-monitoring.sh

# Option B: Manual deployment
kubectl apply -f k8s/monitoring/prometheus-deployment.yaml
kubectl apply -f k8s/monitoring/grafana-dashboard-kahoot.yaml
kubectl apply -f k8s/monitoring/grafana-deployment.yaml
```

### **2. Verify Deployment**

```bash
# Check pods
kubectl get pods -n monitoring

# Expected output:
# NAME                          READY   STATUS    RESTARTS   AGE
# prometheus-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
# grafana-xxxxxxxxxx-xxxxx      1/1     Running   0          2m

# Check services
kubectl get svc -n monitoring

# Expected output:
# NAME         TYPE       CLUSTER-IP     EXTERNAL-IP   PORT(S)          AGE
# prometheus   NodePort   10.x.x.x       <none>        9090:30909/TCP   2m
# grafana      NodePort   10.x.x.x       <none>        3000:30300/TCP   2m
```

### **3. Access Dashboards**

**Get Node IP:**
```bash
kubectl get nodes -o wide
```

**Access URLs:**
- **Prometheus**: `http://<node-ip>:30909`
- **Grafana**: `http://<node-ip>:30300`

**Grafana Login:**
- Username: `admin`
- Password: `Kahoot@2025`

## 📊 Available Metrics

### **Application Metrics (from prom-client)**

Each service exposes these metrics at `/metrics`:

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by method, status, path |
| `http_request_duration_seconds` | Histogram | Request duration in seconds |
| `http_request_size_bytes` | Histogram | Request size in bytes |
| `http_response_size_bytes` | Histogram | Response size in bytes |
| `nodejs_heap_size_total_bytes` | Gauge | Node.js heap size |
| `nodejs_heap_size_used_bytes` | Gauge | Node.js heap used |
| `nodejs_external_memory_bytes` | Gauge | Node.js external memory |
| `process_cpu_user_seconds_total` | Counter | CPU time in user mode |
| `process_cpu_system_seconds_total` | Counter | CPU time in system mode |
| `process_resident_memory_bytes` | Gauge | Process memory usage |

### **Kubernetes Metrics (from kube-state-metrics)**

- Pod status & restart counts
- Deployment replica status
- Node resource usage
- Container CPU/Memory usage

## 📈 Grafana Dashboards

### **1. Kubernetes Cluster Monitoring**
- Cluster CPU usage by node
- Cluster memory usage by node
- Pod status overview
- Resource quotas

### **2. Kahoot Application Metrics**

**Real-time Metrics:**
- 📊 HTTP Requests per Second (by service)
- ⏱️ Response Time (p95, p99 percentiles)
- ⚠️ Server Errors (5xx) rate
- 💻 CPU Usage (%)
- 🧠 Memory Usage (%)
- 🥧 Traffic Distribution (pie chart)
- 🟢 Pod Status
- 📌 Ready Pods count
- ❌ Failed Pods count
- 🚀 Total RPS
- ⚡ Average Response Time

**Features:**
- Auto-refresh every 10 seconds
- Time range: Last 1 hour (customizable)
- Drilldown capabilities
- Alert thresholds configured

## 🔧 Configuration

### **Add Prometheus Scraping to New Services**

Add these annotations to your deployment's pod template:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-service
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"      # Your service port
        prometheus.io/path: "/metrics"   # Metrics endpoint
```

### **Customize Prometheus Retention**

Edit [prometheus-deployment.yaml](prometheus-deployment.yaml):

```yaml
args:
  - '--storage.tsdb.retention.time=30d'  # Change from 15d to 30d
```

### **Change Grafana Admin Password**

Edit [grafana-deployment.yaml](grafana-deployment.yaml):

```yaml
env:
- name: GF_SECURITY_ADMIN_PASSWORD
  value: "YourNewPassword"
```

Or use Kubernetes secret:

```bash
kubectl create secret generic grafana-admin \
  --from-literal=password='YourSecurePassword' \
  -n monitoring
```

## 🔍 Troubleshooting

### **Prometheus Not Scraping Services**

1. Check service annotations:
```bash
kubectl get pods -n kahoot-clone -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations}{"\n"}{end}'
```

2. Check Prometheus targets:
```
http://<node-ip>:30909/targets
```

3. Verify metrics endpoint:
```bash
kubectl port-forward -n kahoot-clone svc/auth-service 3001:3001
curl http://localhost:3001/metrics
```

### **Grafana Dashboard Not Loading**

1. Check Grafana logs:
```bash
kubectl logs -n monitoring deployment/grafana
```

2. Verify Prometheus datasource:
- Grafana → Configuration → Data Sources → Prometheus
- Test connection

3. Reimport dashboard:
```bash
kubectl delete configmap grafana-dashboard-kahoot -n monitoring
kubectl apply -f k8s/monitoring/grafana-dashboard-kahoot.yaml
kubectl rollout restart deployment/grafana -n monitoring
```

### **High Memory Usage**

Reduce Prometheus retention or add resource limits:

```yaml
resources:
  limits:
    memory: "1Gi"  # Reduce from 2Gi
    cpu: "500m"
```

## 📝 Adding Custom Metrics

### **1. In Your Service Code**

```javascript
const promClient = require('prom-client');
const register = new promClient.Registry();

// Create custom counter
const customMetric = new promClient.Counter({
  name: 'quiz_created_total',
  help: 'Total number of quizzes created',
  labelNames: ['user_id'],
  registers: [register]
});

// Increment metric
customMetric.inc({ user_id: '123' });

// Expose metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### **2. In Grafana Dashboard**

Add new panel with PromQL query:

```promql
# Total quizzes created per hour
rate(quiz_created_total[1h])

# Quiz creation by user
sum(rate(quiz_created_total[5m])) by (user_id)
```

## 🎨 Dashboard Customization

### **Clone Existing Dashboard**

1. Open dashboard in Grafana
2. Click ⚙️ → Settings → Save As
3. Modify panels, queries, thresholds
4. Export JSON → Save to ConfigMap

### **Import Community Dashboards**

```bash
# Example: Node Exporter Full Dashboard
# Dashboard ID: 1860
```

1. Grafana → + → Import
2. Enter Dashboard ID: `1860`
3. Select Prometheus datasource
4. Click Import

## 🔒 Security Best Practices

1. **Change default passwords** immediately
2. **Use Kubernetes secrets** for credentials:
```bash
kubectl create secret generic grafana-admin \
  --from-literal=username=admin \
  --from-literal=password='SecurePassword123!' \
  -n monitoring
```

3. **Enable HTTPS** for production:
```yaml
- name: GF_SERVER_PROTOCOL
  value: "https"
- name: GF_SERVER_CERT_FILE
  value: "/etc/grafana/ssl/tls.crt"
- name: GF_SERVER_CERT_KEY
  value: "/etc/grafana/ssl/tls.key"
```

4. **Restrict access** with NetworkPolicies

## 📚 Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)
- [Kubernetes Monitoring Guide](https://kubernetes.io/docs/tasks/debug-application-cluster/resource-usage-monitoring/)

## 🆘 Support

Issues? Check:
1. Pod logs: `kubectl logs -n monitoring <pod-name>`
2. Events: `kubectl get events -n monitoring`
3. Describe: `kubectl describe pod <pod-name> -n monitoring`

---

**Last Updated:** December 2025  
**Maintained by:** DevOps Team
