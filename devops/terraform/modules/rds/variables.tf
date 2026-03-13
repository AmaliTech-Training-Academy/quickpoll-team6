variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "private_db_subnet_ids" {
  description = "Private subnets to place RDS into"
  type        = list(string)
}

variable "db_subnet_ids" {
  description = "Optional subnet IDs for RDS (use to override private DB subnets)"
  type        = list(string)
  default     = []
}

variable "db_sg_id" {
  description = "Security group ID for the RDS instance"
  type        = string
}

variable "instance_class" {
  description = "RDS instance class (e.g. db.t3.micro for staging, db.t3.medium for production)"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  type = string
}

variable "db_username" {
  type      = string
  sensitive = true
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum storage autoscaling limit in GB"
  type        = number
  default     = 100
}

variable "multi_az" {
  description = "Enable Multi-AZ standby replica (set true in production)"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "Days to retain automated backups (0 disables backups)"
  type        = number
  default     = 7
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot on destroy (set false in production)"
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Prevent accidental RDS deletion (set true in production)"
  type        = bool
  default     = false
}

variable "publicly_accessible" {
  description = "Whether the DB instance is publicly accessible"
  type        = bool
  default     = false
}

variable "tags" {
  type    = map(string)
  default = {}
}
