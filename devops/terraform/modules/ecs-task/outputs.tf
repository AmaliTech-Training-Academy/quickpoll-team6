output "task_definition_arn" {
  description = "Full ARN of the ECS task definition (use with aws ecs run-task)"
  value       = aws_ecs_task_definition.task.arn
}

output "task_definition_family" {
  description = "Family name of the ECS task definition"
  value       = aws_ecs_task_definition.task.family
}

output "log_group_name" {
  description = "CloudWatch log group name for this task"
  value       = aws_cloudwatch_log_group.task.name
}

output "exec_role_arn" {
  description = "ARN of the ECS task execution IAM role"
  value       = aws_iam_role.exec.arn
}

output "task_role_arn" {
  description = "ARN of the ECS task IAM role"
  value       = aws_iam_role.task.arn
}

output "db_password_secret_arn" {
  description = "ARN of the Secrets Manager secret for the DB password"
  value       = aws_secretsmanager_secret.db_password.arn
}
