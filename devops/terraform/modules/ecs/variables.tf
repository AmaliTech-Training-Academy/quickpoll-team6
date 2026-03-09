variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_app_subnet_ids" {
  description = "Private subnets to run ECS tasks in"
  type        = list(string)
}

variable "app_sg_id" {
  description = "Security group ID for ECS tasks"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "services" {
  description = "Map of ECS services to deploy"
  type = map(object({
    image              = string
    cpu                = number
    memory             = number
    container_port     = number
    desired_count      = number
    enable_autoscaling = bool
    min_count          = optional(number, 1)
    max_count          = optional(number, 4)
    target_group_arn   = optional(string)
    environment_vars = optional(list(object({
      name  = string
      value = string
    })), [])
  }))
}

variable "tags" {
  type    = map(string)
  default = {}
}
