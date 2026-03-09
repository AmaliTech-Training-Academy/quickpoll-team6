# ── Staging Environment Values ────────────────────────────────────────────────
# Sensitive variables (db_username, db_password, jwt_secret) must NOT go here.
# Set them as environment variables before running terraform:
#
#   export TF_VAR_db_username="quickpoll"
#   export TF_VAR_db_password="<strong-password>"
#   export TF_VAR_jwt_secret="<min-32-char-secret>"
#
# Then run:
#   terraform init
#   terraform plan
#   terraform apply

aws_region = "eu-west-1"
db_name    = "quickpoll"
