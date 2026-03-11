variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  description = "Public subnets to attach the ALB to"
  type        = list(string)
}

variable "alb_sg_id" {
  description = "Security group ID for the ALB"
  type        = string
}

variable "enable_deletion_protection" {
  description = "Protect ALB from accidental deletion (set true in production)"
  type        = bool
  default     = false
}

variable "tags" {
  type    = map(string)
  default = {}
}
