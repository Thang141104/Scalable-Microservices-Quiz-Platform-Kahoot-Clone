variable "project_name" {
  description = "Project name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}
variable "jenkins_iam_role_name" {
  description = "Jenkins IAM role name to attach S3 cache policy"
  type        = string
}