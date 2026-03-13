# ── DB Subnet Group ───────────────────────────────────────────────────────────
resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-db-subnet-group"
  subnet_ids = length(var.db_subnet_ids) > 0 ? var.db_subnet_ids : var.private_db_subnet_ids

  tags = merge(var.tags, { Name = "${var.project}-${var.environment}-db-subnet-group" })
}

# ── RDS PostgreSQL (single instance) ─────────────────────────────────────────
resource "aws_db_instance" "postgres" {
  identifier = "${var.project}-${var.environment}-postgres"

  engine         = "postgres"
  engine_version = "16"
  instance_class = var.instance_class

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.db_sg_id]
  publicly_accessible    = var.publicly_accessible

  # multi_az = true in production for high availability
  multi_az = var.multi_az

  backup_retention_period   = var.backup_retention_period
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.project}-${var.environment}-final-snapshot"

  deletion_protection = var.deletion_protection

  tags = merge(var.tags, { Name = "${var.project}-${var.environment}-postgres" })
}
