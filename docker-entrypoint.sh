#!/bin/sh
set -e
# Empty volume: copy schema-only seed DB (see UAT-DEPLOY.md).
if [ ! -f /app/data/vaxtrack.db ]; then
  mkdir -p /app/data
  cp /app/data-seed/vaxtrack.seed.db /app/data/vaxtrack.db
fi
exec node server.js
