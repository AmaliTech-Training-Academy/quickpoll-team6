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
