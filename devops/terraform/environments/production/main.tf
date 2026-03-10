terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment once an S3 backend bucket is created:
  # backend "s3" {
  #   bucket         = "quickpoll-terraform-state"
  #   key            = "production/terraform.tfstate"
  #   region         = "eu-west-1"
  #   encrypt        = true
  #   dynamodb_table = "quickpoll-terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region
}

locals {
  project     = "quickpoll"
  environment = "production"

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

  # NAT gateway per AZ in production for high availability
  single_nat_gateway = false

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
  enable_deletion_protection = true

  tags = local.common_tags
}

# ── RDS PostgreSQL ────────────────────────────────────────────────────────────
module "rds" {
  source = "../../modules/rds"

  project     = local.project
  environment = local.environment

  private_db_subnet_ids = module.vpc.private_db_subnet_ids
  db_sg_id              = module.security_groups.db_sg_id

  instance_class = "db.t3.medium"
  db_name        = var.db_name
  db_username    = var.db_username
  db_password    = var.db_password

  allocated_storage       = 50
  max_allocated_storage   = 200
  multi_az                = true
  backup_retention_period = 7
  skip_final_snapshot     = false
  deletion_protection     = true

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
  log_retention_days     = 30

  services = {
    backend = {
      image          = "${module.ecr.repository_urls["backend"]}:${local.environment}"
      cpu            = 1024
      memory         = 2048
      container_port = 8080
      desired_count  = 2

      enable_autoscaling = true
      min_count          = 2
      max_count          = 6

      target_group_arn = module.alb.backend_target_group_arn

      environment_vars = [
        { name = "SPRING_PROFILES_ACTIVE", value = "production" },
        { name = "SPRING_DATASOURCE_URL", value = "jdbc:postgresql://${module.rds.db_host}:${module.rds.db_port}/${module.rds.db_name}" },
        { name = "SPRING_DATASOURCE_USERNAME", value = var.db_username },
        { name = "SPRING_DATASOURCE_PASSWORD", value = var.db_password },
        { name = "JWT_SECRET", value = var.jwt_secret },
      ]
    }

    frontend = {
      image          = "${module.ecr.repository_urls["frontend"]}:${local.environment}"
      cpu            = 512
      memory         = 1024
      container_port = 80
      desired_count  = 2

      enable_autoscaling = true
      min_count          = 2
      max_count          = 4

      target_group_arn = module.alb.frontend_target_group_arn
      environment_vars = []
    }
  }

  tags = local.common_tags
}
