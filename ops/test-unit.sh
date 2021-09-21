#!/usr/bin/env bash
set -e

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd)
project=$(grep -m 1 '"name":' "$root/package.json" | cut -d '"' -f 4)

# make sure a network for this project has been created
docker swarm init 2> /dev/null || true
docker network create --attachable --driver overlay "$project" 2> /dev/null || true

unit=$1
cmd=$2

# If file descriptors 0-2 exist, then we're prob running via interactive shell instead of on CD/CI
if [[ -t 0 && -t 1 && -t 2 ]]
then interactive=(--interactive --tty)
else echo "Running in non-interactive mode"
fi

docker run \
  "${interactive[@]}" \
  --entrypoint="bash" \
  --env="CI=$CI" \
  --env="ALCHEMY_PROVIDER=${ALCHEMY_PROVIDER:-}" \
  --env="COVALENT_KEY=${COVALENT_KEY:-}" \
  --env="ETHERSCAN_KEY=${ETHERSCAN_KEY:-}" \
  --env="LOG_LEVEL=${LOG_LEVEL:-}" \
  --env="POLYGONSCAN_KEY=${POLYGONSCAN_KEY:-}" \
  --name="${project}_${cmd}_${unit}" \
  --network "$project" \
  --rm \
  --tmpfs="/tmp" \
  --volume="$root:/root" \
  "${project}_builder" "/test.sh" "${unit}" "$cmd"
