#!/usr/bin/env bash
set -e

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)
project=$(grep -m 1 '"name":' "$root/package.json" | cut -d '"' -f 4)
name="storybook"

if grep -qs "$name" <<<"$(docker container ls | tail -n +2)"
then echo "$name is already running" && exit
fi

####################
# External Env Vars

# make sure a network for this project has been created
docker swarm init 2> /dev/null || true
docker network create --attachable --driver overlay "$project" 2> /dev/null || true

# If file descriptors 0-2 exist, then we're prob running via interactive shell instead of on CD/CI
if [[ -t 0 && -t 1 && -t 2 ]]
then interactive=(--interactive --tty)
else echo "Running in non-interactive mode"
fi

docker run \
  "${interactive[@]}" \
  --detach \
  --entrypoint="npm" \
  --name="${project}_${name}" \
  --network "$project" \
  --publish="6006:6006" \
  --rm \
  --tmpfs="/tmp" \
  --volume="$root:/root" \
  --workdir="/root/modules/react" \
  "${project}_builder" start

