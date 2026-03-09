output "db_endpoint" {
  description = "Full RDS endpoint (host:port)"
  value       = aws_db_instance.postgres.endpoint
}

output "db_host" {
  description = "RDS hostname"
  value       = aws_db_instance.postgres.address
}

output "db_port" {
  description = "RDS port"
  value       = aws_db_instance.postgres.port
}

output "db_name" {
  description = "Database name"
  value       = aws_db_instance.postgres.db_name
}
