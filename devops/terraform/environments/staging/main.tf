terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "quick-poll-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "quickpoll-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  project     = "quickpoll"
  environment = "staging"

  common_tags = {
    Project     = local.project
    Environment = local.environment
    ManagedBy   = "Terraform"
    Team        = "Team-6"
  }
}

# ── VPC ───────────────────────────────────────────────────────────────────────
module "vpc" {
  source = "../../modules/vpc"

  project     = local.project
  environment = local.environment
  vpc_cidr    = var.vpc_cidr

  availability_zones       = var.availability_zones
  public_subnet_cidrs      = var.public_subnet_cidrs
  private_app_subnet_cidrs = var.private_app_subnet_cidrs
  private_db_subnet_cidrs  = var.private_db_subnet_cidrs

  # Single NAT gateway in staging to save cost
  single_nat_gateway = true

  tags = local.common_tags
}

# ── Security Groups ───────────────────────────────────────────────────────────
module "security_groups" {
  source = "../../modules/security-groups"

  project     = local.project
  environment = local.environment
  vpc_id      = module.vpc.vpc_id

  tags = local.common_tags
}

# ── ECR ───────────────────────────────────────────────────────────────────────
module "ecr" {
  source = "../../modules/ecr"

  project      = local.project
  environment  = local.environment
  repositories = ["backend", "frontend", "data-engineering"]

  tags = local.common_tags
}

# ── ALB ───────────────────────────────────────────────────────────────────────
module "alb" {
  source = "../../modules/alb"

  project     = local.project
  environment = local.environment
  vpc_id      = module.vpc.vpc_id

  public_subnet_ids          = module.vpc.public_subnet_ids
  alb_sg_id                  = module.security_groups.alb_sg_id
  enable_deletion_protection = false

  tags = local.common_tags
}

# ── RDS PostgreSQL ────────────────────────────────────────────────────────────
module "rds" {
  source = "../../modules/rds"

  project     = local.project
  environment = local.environment

  private_db_subnet_ids = module.vpc.private_db_subnet_ids
  db_sg_id              = module.security_groups.db_sg_id

  instance_class = "db.t3.micro"
  db_name        = var.db_name
  db_username    = var.db_username
  db_password    = var.db_password

  allocated_storage       = 20
  max_allocated_storage   = 50
  multi_az                = false
  backup_retention_period = 3
  skip_final_snapshot     = true
  deletion_protection     = false

  tags = local.common_tags
}

# ── ECS Fargate ───────────────────────────────────────────────────────────────
module "ecs" {
  source = "../../modules/ecs"

  project                = local.project
  environment            = local.environment
  aws_region             = var.aws_region
  vpc_id                 = module.vpc.vpc_id
  private_app_subnet_ids = module.vpc.private_app_subnet_ids
  app_sg_id              = module.security_groups.app_sg_id
  log_retention_days     = 14

  services = {
    backend = {
      image          = "${module.ecr.repository_urls["backend"]}:staging"
      cpu            = 512
      memory         = 1024
      container_port = 8080
      desired_count  = 1

      enable_autoscaling = true
      min_count          = 1
      max_count          = 3

      target_group_arn = module.alb.backend_target_group_arn

      environment_vars = [
        { name = "SPRING_PROFILES_ACTIVE", value = "staging" },
        { name = "DB_URL", value = "jdbc:postgresql://${module.rds.db_host}:${module.rds.db_port}/${module.rds.db_name}" },
        { name = "DB_USERNAME", value = var.db_username },
        { name = "DB_PASSWORD", value = var.db_password },
        { name = "JWT_SECRET", value = var.jwt_secret },
        { name = "KAFKA_BOOTSTRAP_SERVERS", value = "localhost:9092" },
      ]
    }

    frontend = {
      image          = "${module.ecr.repository_urls["frontend"]}:staging"
      cpu            = 256
      memory         = 512
      container_port = 8080
      desired_count  = 1

      enable_autoscaling = true
      min_count          = 1
      max_count          = 2

      target_group_arn = module.alb.frontend_target_group_arn
      environment_vars = []
    }
  }

  tags = local.common_tags
}

# ── Data Engineering Bootstrap Task ──────────────────────────────────────────
# One-shot Fargate task: creates analytics tables, deploys triggers, runs
# backfill, then exits. NOT a long-running service.
# Triggered via: aws ecs run-task (called from deploy.yml or manually).
module "ecs_task_data_engineering" {
  source = "../../modules/ecs-task"

  project     = local.project
  environment = local.environment
  aws_region  = var.aws_region
  task_name   = "data-engineering"

  image       = "${module.ecr.repository_urls["data-engineering"]}:staging"
  db_password = var.db_password

  environment_vars = [
    { name = "ENVIRONMENT",               value = "staging" },
    { name = "DB_HOST",                   value = module.rds.db_host },
    { name = "DB_PORT",                   value = tostring(module.rds.db_port) },
    { name = "DB_NAME",                   value = module.rds.db_name },
    { name = "DB_USER",                   value = var.db_username },
    { name = "LOG_LEVEL",                 value = "INFO" },
    { name = "DLQ_DIR",                   value = "data/dlq" },
    { name = "BACKFILL_INTERVAL_MINUTES", value = "30" },
    { name = "WATERMARK_OVERLAP_MINUTES", value = "5" },
    { name = "FORCE_FULL_BACKFILL",       value = "false" },
  ]

  log_retention_days = 14
  tags               = local.common_tags
}
