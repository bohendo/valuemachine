#!/bin/bash
set -e

if [[ -d "modules/server" ]]
then cd modules/server
elif [[ ! -f "src/entry.ts" && ! -f "dist/bundle.js" ]]
then echo "Fatal: couldn't find file to run" && exit 1
fi

if [[ ! -d "/data" ]]
then mkdir -p /data
fi

if [[ "$VM_PROD" == "true" ]]
then
  echo "Starting valuemachine server in prod-mode"
  exec node --no-deprecation dist/bundle.js
else
  echo "Starting valuemachine server in dev-mode"
  exec ./node_modules/.bin/nodemon \
    --delay 1 \
    --exitcrash \
    --ignore ./*.test.ts \
    --ignore ./*.swp \
    --legacy-watch \
    --polling-interval 1000 \
    --watch src \
    --exec "node -r ts-node/register" \
    ./src/entry.ts
fi
