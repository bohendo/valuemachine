#!/usr/bin/env bash
set -e

root=$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )
project=$(grep -m 1 '"name":' "$root/package.json" | cut -d '"' -f 4)
registryRoot=$(grep -m 1 '"registry":' "$root/package.json" | cut -d '"' -f 4)
organization="${CI_PROJECT_NAMESPACE:-$(whoami)}"
commit=$(git rev-parse HEAD | head -c 8)

registry="$registryRoot/$organization/$project"

for name in builder proxy server webserver
do
  image=${project}_$name
  for version in ${1:-latest $commit}
  do
    echo "Tagging image $image:$version as $registry/$image:$version"
    docker tag "$image:$version" "$registry/$image:$version" || true
    echo "Pushing image: $registry/$image:$version"
    docker push "$registry/$image:$version" || true
  done
done
