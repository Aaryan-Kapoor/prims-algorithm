#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="/home/ubuntu/prims-site"

echo "Deploying prims site to $TARGET_DIR"

# basic checks
for f in index.html scripts.js styles.css; do
  if [ ! -f "$f" ]; then
    echo "Error: $f not found in current directory"
    exit 1
  fi
done

# copy files to prod
cp index.html "$TARGET_DIR/"
cp scripts.js "$TARGET_DIR/"
cp styles.css "$TARGET_DIR/"

echo "Deploy complete."
