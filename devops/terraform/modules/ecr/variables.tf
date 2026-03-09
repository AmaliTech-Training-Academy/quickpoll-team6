variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "repositories" {
  description = "List of repository names to create under project/ namespace"
  type        = list(string)
  default     = ["backend", "frontend", "data-engineering"]
}

variable "tags" {
  type    = map(string)
  default = {}
}
