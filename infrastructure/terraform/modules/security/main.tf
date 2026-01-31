# ============================================
# Security Module - Security Groups
# ============================================

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Jenkins Security Group
resource "aws_security_group" "jenkins" {
  name_prefix = "${var.project_name}-jenkins-"
  description = "Security group for Jenkins server"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = var.jenkins_ingress_rules
    content {
      description = ingress.value.description
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
    }
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${var.project_name}-jenkins-sg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Kubernetes Master Security Group
resource "aws_security_group" "k8s_master" {
  name_prefix = "${var.project_name}-k8s-master-"
  description = "Security group for Kubernetes master node"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = var.k8s_master_ingress_rules
    content {
      description = ingress.value.description
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = lookup(ingress.value, "cidr_blocks", null)
      security_groups = lookup(ingress.value, "security_groups", null)
    }
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${var.project_name}-k8s-master-sg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Kubernetes Worker Security Group
resource "aws_security_group" "k8s_worker" {
  name_prefix = "${var.project_name}-k8s-worker-"
  description = "Security group for Kubernetes worker nodes"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = var.k8s_worker_ingress_rules
    content {
      description = ingress.value.description
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = lookup(ingress.value, "cidr_blocks", null)
      security_groups = lookup(ingress.value, "security_groups", null)
    }
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${var.project_name}-k8s-worker-sg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Allow communication between K8s nodes
resource "aws_security_group_rule" "k8s_master_to_worker" {
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "-1"
  source_security_group_id = aws_security_group.k8s_master.id
  security_group_id        = aws_security_group.k8s_worker.id
  description              = "Allow all traffic from K8s master"
}

resource "aws_security_group_rule" "k8s_worker_to_master" {
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "-1"
  source_security_group_id = aws_security_group.k8s_worker.id
  security_group_id        = aws_security_group.k8s_master.id
  description              = "Allow all traffic from K8s workers"
}

resource "aws_security_group_rule" "k8s_worker_to_worker" {
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "-1"
  source_security_group_id = aws_security_group.k8s_worker.id
  security_group_id        = aws_security_group.k8s_worker.id
  description              = "Allow all traffic between K8s workers"
}

# Allow kubelet API access between nodes
resource "aws_security_group_rule" "k8s_kubelet_api" {
  type              = "ingress"
  from_port         = 10250
  to_port           = 10250
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/16"]
  security_group_id = aws_security_group.k8s_worker.id
  description       = "Kubelet API"
}

resource "aws_security_group_rule" "k8s_master_kubelet_api" {
  type              = "ingress"
  from_port         = 10250
  to_port           = 10250
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/16"]
  security_group_id = aws_security_group.k8s_master.id
  description       = "Kubelet API on master"
}

# Allow pod network traffic (Calico uses 192.168.0.0/16 by default)
resource "aws_security_group_rule" "k8s_pod_network_workers" {
  type              = "ingress"
  from_port         = 0
  to_port           = 65535
  protocol          = "-1"
  cidr_blocks       = ["192.168.0.0/16"]
  security_group_id = aws_security_group.k8s_worker.id
  description       = "Allow pod network traffic (Calico)"
}

resource "aws_security_group_rule" "k8s_pod_network_master" {
  type              = "ingress"
  from_port         = 0
  to_port           = 65535
  protocol          = "-1"
  cidr_blocks       = ["192.168.0.0/16"]
  security_group_id = aws_security_group.k8s_master.id
  description       = "Allow pod network traffic on master (Calico)"
}

# Allow BGP (Calico) traffic between nodes
resource "aws_security_group_rule" "k8s_bgp_workers" {
  type              = "ingress"
  from_port         = 179
  to_port           = 179
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/16"]
  security_group_id = aws_security_group.k8s_worker.id
  description       = "Allow BGP (Calico) traffic on workers"
}

resource "aws_security_group_rule" "k8s_bgp_master" {
  type              = "ingress"
  from_port         = 179
  to_port           = 179
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/16"]
  security_group_id = aws_security_group.k8s_master.id
  description       = "Allow BGP (Calico) traffic on master"
}
