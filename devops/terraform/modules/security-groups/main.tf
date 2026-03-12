# -- ALB Security Group (web-alb-sg) ------------------------------------------
resource "aws_security_group" "alb" {
  name        = "${var.project}-${var.environment}-web-alb-sg"
  description = "ALB - allow HTTP/HTTPS from internet"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.project}-${var.environment}-web-alb-sg" })
}

# -- App Security Group (app-sg) -----------------------------------------------
resource "aws_security_group" "app" {
  name        = "${var.project}-${var.environment}-app-sg"
  description = "ECS tasks - allow traffic from ALB only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "App port from ALB"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.project}-${var.environment}-app-sg" })
}

# -- Data Engineering Security Group -------------------------------------------
# Dedicated SG for the data-engineering Fargate task.
# No inbound needed -- the task does not serve traffic.
# Outbound: RDS (5432) + HTTPS (443) for ECR, CloudWatch, Secrets Manager.
resource "aws_security_group" "data_engineering" {
  name        = "${var.project}-${var.environment}-data-engineering-sg"
  description = "Data Engineering Fargate task - outbound to RDS and AWS services only"
  vpc_id      = var.vpc_id

  egress {
    description     = "PostgreSQL to RDS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.db.id]
  }

  egress {
    description = "HTTPS to AWS services (ECR, CloudWatch, Secrets Manager)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.project}-${var.environment}-data-engineering-sg" })
}

# -- DB Security Group (db-sg) -------------------------------------------------
resource "aws_security_group" "db" {
  name        = "${var.project}-${var.environment}-db-sg"
  description = "RDS - allow PostgreSQL from app layer and data-engineering task"
  vpc_id      = var.vpc_id

  # Inline ingress kept from the original config: this rule already exists in
  # AWS. Keeping it inline prevents Terraform from deleting and recreating it,
  # which would cause an InvalidPermission.Duplicate error on apply.
  ingress {
    description     = "PostgreSQL from ECS app tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.project}-${var.environment}-db-sg" })
}

# Separate rule for data-engineering (new -- was not in the original db-sg).
# Using a separate resource avoids rebuilding the security group and is already
# present in AWS state from the partial apply.
resource "aws_security_group_rule" "db_from_data_engineering" {
  type                     = "ingress"
  description              = "PostgreSQL from data-engineering Fargate task"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = aws_security_group.data_engineering.id
}
