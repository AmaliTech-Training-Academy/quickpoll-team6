variable "project" {
  description = "Project name, used as a prefix for all resource names"
  type        = string
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "aws_region" {
  description = "AWS region to deploy resources in"
  type        = string
}

variable "task_name" {
  description = "Short name for the task (e.g. 'data-engineering'). Used in resource names."
  type        = string
  default     = "data-engineering"
}

variable "image" {
  description = "Full ECR image URI including tag (e.g. 123456.dkr.ecr.eu-west-1.amazonaws.com/quickpoll/data-engineering:abc1234)"
  type        = string
}

variable "db_password" {
  description = "Database password — stored in Secrets Manager and injected into the container at runtime"
  type        = string
  sensitive   = true
}

variable "environment_vars" {
  description = "Non-secret environment variables to pass to the container"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
