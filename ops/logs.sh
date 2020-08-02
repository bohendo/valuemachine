#!/bin/bash
set -e

root="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
project="`cat $root/package.json | grep '"name":' | head -n 1 | cut -d '"' -f 4`"

name=$1
shift

docker service ps --no-trunc ${project}_$name
sleep 1
docker service logs --raw --tail 100 --follow ${project}_$name $@
