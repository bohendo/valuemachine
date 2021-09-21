#!/usr/bin/env bash
set -e

root=$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )
project=$(grep -m 1 '"name":' "$root/package.json" | cut -d '"' -f 4)
registryRoot=$(grep -m 1 '"registry":' "$root/package.json" | cut -d '"' -f 4)
organization="${DOCKER_USER:-$(whoami)}"
commit=$(git rev-parse HEAD | head -c 8)

registry="$registryRoot/$organization"

for name in builder proxy server webserver
do
  if [[ "$name" == "server" ]]
  then image=${project}
  else image=${project}_$name
  fi
  for version in ${1:-$commit latest}
  do
    echo "Tagging image $image:$version as $registry/$image:$version"
    docker tag "$image:$version" "$registry/$image:$version" || true
    echo "Pushing image: $registry/$image:$version"
    docker push "$registry/$image:$version" || true
  done
done
