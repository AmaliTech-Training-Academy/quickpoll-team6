output "alb_sg_id" {
  description = "Security group ID for the Application Load Balancer"
  value       = aws_security_group.alb.id
}

output "app_sg_id" {
  description = "Security group ID for ECS tasks"
  value       = aws_security_group.app.id
}

output "db_sg_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.db.id
}
