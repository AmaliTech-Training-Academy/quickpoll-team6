output "alb_dns_name" {
  description = "Staging application URL — point your browser here"
  value       = module.alb.alb_dns_name
}

output "ecr_repository_urls" {
  description = "ECR URLs — use these in deploy.yml for docker push"
  value       = module.ecr.repository_urls
}

output "rds_endpoint" {
  description = "RDS connection endpoint (host:port)"
  value       = module.rds.db_endpoint
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "nat_gateway_ips" {
  description = "Elastic IPs for the NAT gateway — whitelist these in external services (SonarQube, etc.)"
  value       = module.vpc.nat_gateway_public_ips
}

output "data_engineering_task_definition_arn" {
  description = "ARN of the data-engineering Fargate task definition — use with aws ecs run-task"
  value       = module.ecs_task_data_engineering.task_definition_arn
}

output "data_engineering_log_group" {
  description = "CloudWatch log group for the data-engineering bootstrap task"
  value       = module.ecs_task_data_engineering.log_group_name
}
