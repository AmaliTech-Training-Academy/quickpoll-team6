output "alb_arn" {
  value = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "DNS name of the ALB — use this as the application URL"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Hosted zone ID of the ALB (for Route53 alias records)"
  value       = aws_lb.main.zone_id
}

output "backend_target_group_arn" {
  value = aws_lb_target_group.backend.arn
}

output "frontend_target_group_arn" {
  value = aws_lb_target_group.frontend.arn
}

output "http_listener_arn" {
  value = aws_lb_listener.http.arn
}
