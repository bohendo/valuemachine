#!/bin/bash
set -e

dev_target="src/index.ts"
prod_target="dist/bundle.js"

if [[ -d "modules/server" ]]
then cd modules/server
fi

if [[ ! -f "$dev_target" && ! -f "$prod_target" ]]
then echo "Fatal: couldn't find file to run" && pwd && ls && exit 1
fi

if [[ ! -d "/data" ]]
then mkdir -p /data
fi

if [[ "$VM_PROD" == "true" ]]
then
  echo "Starting valuemachine server in prod-mode"
  exec node --no-deprecation "$prod_target" | pino-pretty --colorize --ignore "pid,hostname" --translateTime
else
  echo "Starting valuemachine server in dev-mode w env:"
  env
  exec nodemon \
    --delay 1 \
    --exitcrash \
    --ignore ./*.test.ts \
    --ignore ./*.swp \
    --legacy-watch \
    --polling-interval 1000 \
    --watch src \
    --exec "node -r ts-node/register" \
    "$dev_target" | pino-pretty --colorize --ignore "pid,hostname" --translateTime
fi
