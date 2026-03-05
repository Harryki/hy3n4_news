#!/bin/sh
set -e

# Install dependencies into the volume-mounted node_modules
if [ ! -d "/app/node_modules/wrangler" ]; then
  echo "Installing dependencies..."
  npm install
fi

exec "$@"
