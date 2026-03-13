variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["eu-west-1a", "eu-west-1b"]
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_app_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "private_db_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.20.0/24", "10.0.21.0/24"]
}

variable "db_name" {
  type    = string
  default = "defaultdb"
}

variable "db_host" {
  type    = string
  default = "quick-poll-do-user-31013824-0.d.db.ondigitalocean.com"
}

variable "db_port" {
  type    = number
  default = 25060
}

variable "db_sslmode" {
  type    = string
  default = "require"
}

# Provide via: export TF_VAR_db_username="..."
variable "db_username" {
  type      = string
  sensitive = true
}

# Provide via: export TF_VAR_db_password="..."
variable "db_password" {
  type      = string
  sensitive = true
}

# Provide via: export TF_VAR_jwt_secret="..."
variable "jwt_secret" {
  type      = string
  sensitive = true
}
