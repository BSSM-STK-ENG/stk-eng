#!/usr/bin/env bash
set -euo pipefail

OUT=deploy_artifact.tar.gz
TMP=$(mktemp -d)
APP_DIR="$TMP/app"
mkdir -p "$APP_DIR"

echo "Creating temporary app tree in $APP_DIR"
# extract git-tracked files into temp app dir
git archive --format=tar HEAD | tar -x -C "$APP_DIR"

# include frontend/dist if present
if [ -d frontend/dist ]; then
  echo "Including frontend/dist"
  mkdir -p "$APP_DIR/frontend"
  cp -a frontend/dist "$APP_DIR/frontend/"
fi

# create compressed artifact
tar -C "$TMP" -czf "$OUT" app
rm -rf "$TMP"

echo "Artifact created: $OUT"
echo "Copy $OUT to the server (e.g. scp $OUT root@SERVER:/root/) and run scripts/install_remote.sh on the server."