# ── CloudWatch Log Group ──────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "task" {
  name              = "/ecs/${var.project}/${var.environment}/${var.task_name}"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, { Name = "/ecs/${var.project}/${var.environment}/${var.task_name}" })
}

# ── Secrets Manager — DB password ─────────────────────────────────────────────
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.project}/${var.environment}/${var.task_name}/db-password"
  description             = "DB password for ${var.project} ${var.environment} ${var.task_name} Fargate task"
  recovery_window_in_days = 0 # allow immediate deletion in non-prod; override in prod if needed

  tags = merge(var.tags, { Name = "${var.project}-${var.environment}-${var.task_name}-db-password" })
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}

# ── IAM — Task Execution Role (pull image, write logs, read secrets) ──────────
resource "aws_iam_role" "exec" {
  name = "${var.project}-${var.environment}-${var.task_name}-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "exec_base" {
  role       = aws_iam_role.exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "exec_secret" {
  name = "${var.project}-${var.environment}-${var.task_name}-secret-read"
  role = aws_iam_role.exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = aws_secretsmanager_secret.db_password.arn
    }]
  })
}

# ── IAM — Task Role (minimal, app-level AWS permissions) ─────────────────────
resource "aws_iam_role" "task" {
  name = "${var.project}-${var.environment}-${var.task_name}-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

# ── ECS Task Definition (no ECS Service — run on-demand via aws ecs run-task) ─
resource "aws_ecs_task_definition" "task" {
  family                   = "${var.project}-${var.environment}-${var.task_name}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256  # 0.25 vCPU
  memory                   = 512  # 0.5 GB
  execution_role_arn       = aws_iam_role.exec.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name      = var.task_name
    image     = var.image
    essential = true

    # No portMappings — this task does not serve traffic

    environment = var.environment_vars

    secrets = [{
      name      = "DB_PASSWORD"
      valueFrom = aws_secretsmanager_secret.db_password.arn
    }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.task.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])

  tags = merge(var.tags, { Name = "${var.project}-${var.environment}-${var.task_name}" })
}
