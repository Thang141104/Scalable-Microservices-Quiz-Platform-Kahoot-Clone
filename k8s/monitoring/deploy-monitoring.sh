#!/bin/bash

echo "🚀 Deploying Prometheus & Grafana Monitoring Stack"
echo "=================================================="

# Create monitoring namespace
echo "📦 Creating monitoring namespace..."
kubectl apply -f k8s/monitoring/prometheus-deployment.yaml

# Wait for Prometheus to be ready
echo "⏳ Waiting for Prometheus to be ready..."
kubectl wait --for=condition=available --timeout=120s deployment/prometheus -n monitoring

# Deploy Grafana dashboards
echo "📊 Deploying Grafana dashboards..."
kubectl apply -f k8s/monitoring/grafana-dashboard-kahoot.yaml
kubectl apply -f k8s/monitoring/grafana-dashboard-infrastructure.yaml
kubectl apply -f k8s/monitoring/grafana-dashboard-business.yaml
kubectl apply -f k8s/monitoring/grafana-dashboard-containers.yaml
kubectl apply -f k8s/monitoring/grafana-deployment.yaml

# Wait for Grafana to be ready
echo "⏳ Waiting for Grafana to be ready..."
kubectl wait --for=condition=available --timeout=120s deployment/grafana -n monitoring

