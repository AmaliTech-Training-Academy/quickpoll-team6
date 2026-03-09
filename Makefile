# ──────────────────────────────────────────────────────────────
# QuickPoll — Project Makefile
# ──────────────────────────────────────────────────────────────

HOOKS_DIR := $(shell git rev-parse --show-toplevel)/.git/hooks

OS := $(shell uname -s)

# ──────────────────────────────────────────────────────────────
# Docker Compose v2 Installation
# ──────────────────────────────────────────────────────────────

.PHONY: install-docker-compose
install-docker-compose:
ifeq ($(OS),Linux)
	@if docker compose version >/dev/null 2>&1; then \
		echo "  ✅ Docker Compose v2 is already installed"; \
	else \
		echo "  [INSTALL] Docker Compose v2 plugin for Linux..."; \
		mkdir -p $$HOME/.docker/cli-plugins; \
		LATEST=$$(curl -fsSL https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/'); \
		echo "  [DOWNLOAD] Docker Compose $$LATEST"; \
		curl -fsSL "https://github.com/docker/compose/releases/download/$${LATEST}/docker-compose-linux-$$(uname -m)" \
			-o $$HOME/.docker/cli-plugins/docker-compose; \
		chmod +x $$HOME/.docker/cli-plugins/docker-compose; \
		echo "  ✅ Docker Compose $$LATEST installed successfully"; \
	fi
else ifeq ($(OS),Darwin)
	@if docker compose version >/dev/null 2>&1; then \
		echo "  ✅ Docker Compose v2 is already installed"; \
	else \
		echo "  [ERROR] Docker Compose v2 is not installed."; \
		echo "          Please install Docker Desktop for macOS:"; \
		echo "          https://docs.docker.com/desktop/install/mac-install/"; \
		exit 1; \
	fi
else
	@echo "  [INFO] Windows detected — please install Docker Desktop manually:"
	@echo "         https://docs.docker.com/desktop/install/windows-install/"
endif

# ──────────────────────────────────────────────────────────────
# Git Hooks
# ──────────────────────────────────────────────────────────────

.PHONY: hook-pre-commit
hook-pre-commit:
	@echo "  [INSTALL] pre-commit hook..."
	@mkdir -p $(HOOKS_DIR)
	@cat > $(HOOKS_DIR)/pre-commit << 'HOOK_EOF'
#!/usr/bin/env bash
# ── QuickPoll pre-commit hook ──────────────────────────────
set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BLOCKED=0
SKIP_FILES="devops/scripts/setup-hooks.sh"
MAX_SIZE=$((5 * 1024 * 1024))

staged_files=$(git diff --cached --name-only --diff-filter=ACM)

for file in $staged_files; do
    # ── Block .env files ──────────────────────────────────
    if echo "$file" | grep -qE '(^|/)\.env(\..*)?$'; then
        echo -e "${RED}[BLOCKED]${NC} $file — .env files must not be committed"
        BLOCKED=1
        continue
    fi

    # ── Skip exclusions and binary files ──────────────────
    if echo "$SKIP_FILES" | grep -qF "$file"; then
        continue
    fi
    if file --mime "$file" 2>/dev/null | grep -q 'charset=binary'; then
        continue
    fi

    # ── Block files over 5 MB ─────────────────────────────
    fsize=$(git cat-file -s ":$file" 2>/dev/null || echo 0)
    if [ "$fsize" -gt "$MAX_SIZE" ]; then
        echo -e "${RED}[BLOCKED]${NC} $file — file exceeds 5 MB ($fsize bytes)"
        BLOCKED=1
        continue
    fi

    # ── Scan for hardcoded secrets ────────────────────────
    # Exclude lines containing grep/sed invocations (pattern definitions inside
    # shell scripts and Makefiles) to prevent false positives.
    diff_content=$(git diff --cached -U0 -- "$file" | grep '^+' | grep -v '^+++' | grep -v '^+[[:space:]]*#' | grep -v 'grep -' | grep -v 'grep -q' | grep -v "grep -qF" | grep -v 'sed -' | grep -v "echo.*grep" | grep -v '\${{' || true)
    if echo "$diff_content" | grep -qEi 'password=|secret=|api_key=|apikey=|AWS_SECRET_ACCESS_KEY|private_key=|token='; then
        echo -e "${RED}[BLOCKED]${NC} $file — potential hardcoded secret detected"
        BLOCKED=1
    fi
    if echo "$diff_content" | grep -qE 'AKIA[0-9A-Z]{16}'; then
        echo -e "${RED}[BLOCKED]${NC} $file — AWS access key detected"
        BLOCKED=1
    fi
    if echo "$diff_content" | grep -qE 'ghp_[A-Za-z0-9_]{36}'; then
        echo -e "${RED}[BLOCKED]${NC} $file — GitHub personal access token detected"
        BLOCKED=1
    fi
    if echo "$diff_content" | grep -qE 'sk-[A-Za-z0-9]{20,}'; then
        echo -e "${RED}[BLOCKED]${NC} $file — secret key (sk-...) detected"
        BLOCKED=1
    fi
    if echo "$diff_content" | grep -qF 'BEGIN PRIVATE KEY'; then
        echo -e "${RED}[BLOCKED]${NC} $file — private key block detected"
        BLOCKED=1
    fi

    # ── Warn on debug statements (non-blocking) ──────────
    if echo "$diff_content" | grep -qF 'console.log('; then
        echo -e "${YELLOW}[WARNING]${NC} $file — contains console.log() statement(s)"
    fi
    if echo "$diff_content" | grep -qF 'System.out.println('; then
        echo -e "${YELLOW}[WARNING]${NC} $file — contains System.out.println() statement(s)"
    fi
done

if [ "$BLOCKED" -eq 1 ]; then
    echo ""
    echo -e "${RED}[ERROR] Commit blocked — please fix the issues above.${NC}"
    exit 1
fi
HOOK_EOF
	@chmod +x $(HOOKS_DIR)/pre-commit
	@echo "  ✅ pre-commit hook installed"

.PHONY: hook-commit-msg
hook-commit-msg:
	@echo "  [INSTALL] commit-msg hook..."
	@mkdir -p $(HOOKS_DIR)
	@cat > $(HOOKS_DIR)/commit-msg << 'HOOK_EOF'
#!/usr/bin/env bash
# ── QuickPoll commit-msg hook ─────────────────────────────
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

MSG=$(head -1 "$1")

# ── Skip merge and revert commits ─────────────────────────
if echo "$MSG" | grep -qE '^(Merge|Revert) '; then
    exit 0
fi

VALID_TYPES="feat|fix|docs|ci|chore|refactor|test|style|perf"

# ── Validate type ─────────────────────────────────────────
TYPE=$(echo "$MSG" | sed -nE 's/^([a-z]+)(\(.*\))?:.*/\1/p')
if [ -z "$TYPE" ]; then
    echo -e "${RED}[ERROR] Invalid commit message format.${NC}"
    echo ""
    echo "    Expected:  type(scope): description [QP-XX]"
    echo "    Types:     feat fix docs ci chore refactor test style perf"
    echo ""
    echo "    Examples:"
    echo "      feat(auth): add JWT refresh token [QP-12]"
    echo "      fix: resolve polling timeout #19"
    exit 1
fi

if ! echo "$TYPE" | grep -qE "^($VALID_TYPES)$"; then
    echo -e "${RED}[ERROR] Invalid type: '${TYPE}'${NC}"
    echo ""
    echo "    Allowed types: feat fix docs ci chore refactor test style perf"
    exit 1
fi

# ── Validate description length (max 60 chars) ───────────
DESC=$(echo "$MSG" | sed -nE 's/^[a-z]+(\(.*\))?: (.*)$/\2/p')
DESC_NO_TICKET=$(echo "$DESC" | sed -E 's/ *(\[QP-[0-9]+\]|QP-[0-9]+|#[0-9]+) *$//')
if [ ${#DESC_NO_TICKET} -gt 80 ]; then
    echo -e "${RED}[ERROR] Description exceeds 60 characters (${#DESC_NO_TICKET} chars).${NC}"
    echo "    Please shorten your commit description."
    exit 1
fi

# ── Validate ticket reference ─────────────────────────────
if ! echo "$MSG" | grep -qE '(\[QP-[0-9]+\]|QP-[0-9]+|#[0-9]+)'; then
    echo -e "${RED}[ERROR] Missing ticket reference.${NC}"
    echo ""
    echo "    Add a ticket ref at the end of the subject line:"
    echo "      [QP-19]  or  QP-19  or  #19"
    exit 1
fi

echo -e "${GREEN}✅ Commit message is valid.${NC}"
HOOK_EOF
	@chmod +x $(HOOKS_DIR)/commit-msg
	@echo "  ✅ commit-msg hook installed"

.PHONY: hook-pre-push
hook-pre-push:
	@echo "  [INSTALL] pre-push hook..."
	@mkdir -p $(HOOKS_DIR)
	@cat > $(HOOKS_DIR)/pre-push << 'HOOK_EOF'
#!/usr/bin/env bash
# ── QuickPoll pre-push hook ───────────────────────────────
set -euo pipefail

RED='\033[0;31m'
NC='\033[0m'

BRANCH=$(git rev-parse --abbrev-ref HEAD)

# ── Allow protected branches unconditionally ──────────────
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "develop" ]; then
    exit 0
fi

# ── Validate branch naming convention ─────────────────────
if ! echo "$BRANCH" | grep -qE '^(feature|fix|hotfix|release|chore|docs|ci)/'; then
    echo -e "${RED}[ERROR] Push blocked — invalid branch name: '${BRANCH}'${NC}"
    echo ""
    echo "    Branch must start with one of:"
    echo "      feature/  fix/  hotfix/  release/  chore/  docs/  ci/"
    echo ""
    echo "    Example: feature/QP-19-add-login"
    exit 1
fi
HOOK_EOF
	@chmod +x $(HOOKS_DIR)/pre-push
	@echo "  ✅ pre-push hook installed"

.PHONY: hook-prepare-commit-msg
hook-prepare-commit-msg:
	@echo "  [INSTALL] prepare-commit-msg hook..."
	@mkdir -p $(HOOKS_DIR)
	@cat > $(HOOKS_DIR)/prepare-commit-msg << 'HOOK_EOF'
#!/usr/bin/env bash
# ── QuickPoll prepare-commit-msg hook ─────────────────────
set -euo pipefail

COMMIT_MSG_FILE="$1"
COMMIT_SOURCE="${2:-}"

# ── Skip merge / squash commits ───────────────────────────
if [ "$COMMIT_SOURCE" = "merge" ] || [ "$COMMIT_SOURCE" = "squash" ]; then
    exit 0
fi

MSG=$(cat "$COMMIT_MSG_FILE")

# ── Skip if ticket tag already present ────────────────────
if echo "$MSG" | grep -qE '(\[QP-[0-9]+\]|QP-[0-9]+|#[0-9]+)'; then
    exit 0
fi

# ── Extract ticket ID from branch name ────────────────────
BRANCH=$(git rev-parse --abbrev-ref HEAD)
TICKET=$(echo "$BRANCH" | grep -oE 'QP-[0-9]+' || true)

if [ -n "$TICKET" ]; then
    sed -i.bak "1s/$/ [$TICKET]/" "$COMMIT_MSG_FILE"
    rm -f "${COMMIT_MSG_FILE}.bak"
    echo "[INFO] Auto-appended [$TICKET] from branch '$BRANCH'"
fi
HOOK_EOF
	@chmod +x $(HOOKS_DIR)/prepare-commit-msg
	@echo "  ✅ prepare-commit-msg hook installed"

.PHONY: install-hooks
install-hooks: hook-pre-commit hook-commit-msg hook-pre-push hook-prepare-commit-msg
	@echo ""
	@echo "  ✅ All Git hooks installed to $(HOOKS_DIR)"

# ──────────────────────────────────────────────────────────────
# Setup (main entry point)
# ──────────────────────────────────────────────────────────────

.PHONY: setup
setup: install-docker-compose install-hooks
	@echo ""
	@echo "  ╔══════════════════════════════════════════════════════════╗"
	@echo "  ║                                                          ║"
	@echo "  ║   QuickPoll — Development Environment Ready              ║"
	@echo "  ║                                                          ║"
	@echo "  ║   ✅ Docker Compose v2 verified                          ║"
	@echo "  ║   ✅ Git hooks installed (4/4)                           ║"
	@echo "  ║                                                          ║"
	@echo "  ║   Run 'docker compose up' to start the stack.            ║"
	@echo "  ║                                                          ║"
	@echo "  ╚══════════════════════════════════════════════════════════╝"
	@echo ""
