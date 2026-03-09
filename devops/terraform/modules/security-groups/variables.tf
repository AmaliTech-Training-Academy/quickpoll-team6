variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  description = "VPC to create security groups in"
  type        = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
