#!/usr/bin/env bash
set -euo pipefail

# Load .env (must exist in repo root)
if [ -f .env ]; then
  # export only simple KEY=VAL lines (no spaces)
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  echo ".env file not found. Copy .env.example to .env and edit it." >&2
  exit 1
fi

: "${SSH_HOST:?SSH_HOST must be set in .env}"
SSH_USER="${SSH_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/root/stk}"
SSH_KEY="${SSH_KEY:-}"
SSH_PASS="${SSH_PASS:-}"

# Create a repo archive (prefer git archive when available)
TMP_TAR="/tmp/stk_deploy_$(date +%s).tar.gz"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Creating tar from git (HEAD)..."
  git archive --format=tar --prefix=app/ HEAD | gzip > "$TMP_TAR"
else
  echo "Creating tar from filesystem..."
  tar --exclude='.git' --exclude='node_modules' -czf "$TMP_TAR" .
fi

# Decide how to SSH/SCP: prefer key/agent, fall back to sshpass if provided
SSH_CMD_BASE=(ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)
SCP_CMD_BASE=(scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)
USE_SSHPASS=false

if [ -n "$SSH_KEY" ]; then
  if [ ! -f "$SSH_KEY" ]; then
    echo "SSH_KEY file '$SSH_KEY' not found." >&2
    exit 1
  fi
  SSH_CMD_BASE=(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)
  SCP_CMD_BASE=(scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)
elif [ -n "${SSH_AUTH_SOCK:-}" ]; then
  # ssh agent available, use default SSH_CMD_BASE
  :
elif [ -n "$SSH_PASS" ]; then
  if command -v sshpass >/dev/null 2>&1; then
    USE_SSHPASS=true
  else
    echo "SSH_PASS provided but sshpass not installed. Install sshpass or provide SSH_KEY." >&2
    exit 1
  fi
else
  echo "No SSH_KEY, no SSH agent, and no SSH_PASS provided. Cannot proceed." >&2
  exit 1
fi

TAR_BASENAME=$(basename "$TMP_TAR")

# Ensure remote dir exists and copy archive
if [ "$USE_SSHPASS" = true ]; then
  sshpass -p "$SSH_PASS" "${SSH_CMD_BASE[*]}" "$SSH_USER@$SSH_HOST" "mkdir -p '$REMOTE_DIR'"
  echo "Copying archive to $SSH_USER@$SSH_HOST:$REMOTE_DIR"
  sshpass -p "$SSH_PASS" "${SCP_CMD_BASE[*]}" "$TMP_TAR" "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"
else
  "${SSH_CMD_BASE[*]}" "$SSH_USER@$SSH_HOST" "mkdir -p '$REMOTE_DIR'"
  echo "Copying archive to $SSH_USER@$SSH_HOST:$REMOTE_DIR"
  "${SCP_CMD_BASE[*]}" "$TMP_TAR" "$SSH_USER@$SSH_HOST:$REMOTE_DIR/"
fi

# Remote commands: extract and run docker compose
REMOTE_CMDS=$(cat <<'EOF'
set -euo pipefail
REMOTE_DIR="$1"
TAR_FILE="$2"
mkdir -p "$REMOTE_DIR"
cd "$REMOTE_DIR"
# extract
tar -xzf "$TAR_FILE"
# if archive used prefix 'app/', move contents up
if [ -d app ]; then
  rsync -a --delete app/ .
  rm -rf app
fi
rm -f "$TAR_FILE"
# bring up containers (requires docker/docker-compose on remote)
docker compose down || true
# build and start
docker compose up -d --build --remove-orphans

# Wait for postgres health (if container exists and reports health)
if docker inspect --format '{{.Name}}' postgres >/dev/null 2>&1; then
  # check if health information exists
  if docker inspect --format '{{json .State.Health}}' postgres >/dev/null 2>&1; then
    echo "Waiting for postgres to become healthy..."
    for i in $(seq 1 60); do
      status=$(docker inspect -f '{{.State.Health.Status}}' postgres 2>/dev/null || echo unknown)
      if [ "$status" = "healthy" ]; then
        echo "Postgres is healthy"
        break
      fi
      echo "Postgres status: $status (waiting)"
      sleep 2
    done
  else
    echo "Postgres container has no health status; skipping health wait."
  fi
else
  echo "Postgres container not found; skipping health wait."
fi
EOF
)

if [ "$USE_SSHPASS" = true ]; then
  sshpass -p "$SSH_PASS" "${SSH_CMD_BASE[*]}" "$SSH_USER@$SSH_HOST" bash -s -- "$REMOTE_DIR" "$TAR_BASENAME" <<< "$REMOTE_CMDS"
else
  "${SSH_CMD_BASE[*]}" "$SSH_USER@$SSH_HOST" bash -s -- "$REMOTE_DIR" "$TAR_BASENAME" <<< "$REMOTE_CMDS"
fi

rm -f "$TMP_TAR"

echo "Deployment finished."

echo "Note: Prefer SSH keys or ssh-agent over storing passwords. .env may include SSH_KEY path; remove SSH_PASS when using keys."