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
    description = "PostgreSQL to external managed DB (e.g., DigitalOcean)"
    from_port   = 25060
    to_port     = 25060
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
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
# IMPORTANT: description and inline ingress block are kept IDENTICAL to the
# original config. Changing description or removing the inline ingress would
# force Terraform to destroy and recreate the SG, which fails because the RDS
# ENI cannot be detached without higher AWS permissions.
resource "aws_security_group" "db" {
  name        = "${var.project}-${var.environment}-db-sg"
  description = "RDS - allow PostgreSQL from app layer only"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from ECS tasks"
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

# Add data-engineering access to RDS as a separate rule resource.
# This is the only net-new rule -- the app-sg ingress above already exists.
# Note: db_from_data_engineering was destroyed by the failed apply and will be
# recreated cleanly on the next terraform apply.
resource "aws_security_group_rule" "db_from_data_engineering" {
  type                     = "ingress"
  description              = "PostgreSQL from data-engineering Fargate task"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = aws_security_group.data_engineering.id
}
