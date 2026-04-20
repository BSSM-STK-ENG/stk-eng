#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /path/to/deploy_artifact.tar.gz"
  exit 1
fi
ARTIFACT="$1"
TARGET="/root/stk"

if [ ! -f "$ARTIFACT" ]; then
  echo "Artifact not found: $ARTIFACT"
  exit 2
fi

echo "Extracting $ARTIFACT to /root/..."
# artifact contains top-level 'app' directory
tar -xzf "$ARTIFACT" -C /root

echo "Moving app -> $TARGET"
rm -rf "$TARGET"
mv /root/app "$TARGET"
cd "$TARGET"

# create .env from example if missing
if [ -f .env.example ] && [ ! -f .env ]; then
  cp .env.example .env
  echo "Copied .env.example -> .env"
fi

# ensure docker compose is present
if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found. Install Docker before running this script." >&2
  exit 3
fi

# bring up services
docker compose down || true
docker compose up -d --build

echo "Deploy finished. Check 'docker compose ps' and 'docker compose logs -f'."