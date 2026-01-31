#!/bin/bash
# ============================================
# Jenkins Server Initialization Script
# Terraform handles ONLY base system setup
# Ansible will install Jenkins and tools
# ============================================

set -e

# Update system
apt-get update
apt-get upgrade -y

# Install basic utilities
apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    python3-pip

# Install Docker (needed before Ansible runs)
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Install Python dependencies for Ansible
pip3 install --upgrade pip
pip3 install ansible

echo "✅ Base system setup complete!"
echo "📦 Run Ansible playbook to install Jenkins and tools"
