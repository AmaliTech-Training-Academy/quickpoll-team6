output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of public subnets (one per AZ)"
  value       = aws_subnet.public[*].id
}

output "private_app_subnet_ids" {
  description = "IDs of private application subnets (one per AZ)"
  value       = aws_subnet.private_app[*].id
}

output "private_db_subnet_ids" {
  description = "IDs of private database subnets (one per AZ)"
  value       = aws_subnet.private_db[*].id
}

output "nat_gateway_public_ips" {
  description = "Elastic IPs allocated to NAT gateways"
  value       = aws_eip.nat[*].public_ip
}
