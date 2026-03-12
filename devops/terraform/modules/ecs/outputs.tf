output "cluster_id" {
  value = aws_ecs_cluster.main.id
}

output "cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.task_execution.arn
}

output "service_names" {
  description = "Map of service key to ECS service name"
  value       = { for k, v in aws_ecs_service.services : k => v.name }
}
