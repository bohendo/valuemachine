#!/usr/bin/env bash
set -e

root=$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )
project=$(grep -m 1 '"name":' "$root/package.json" | cut -d '"' -f 4)
commit=$(git rev-parse HEAD | head -c 8)
semver=v$(grep -m 1 '"version":' package.json | cut -d '"' -f 4)

tag="${1:-$semver}"

for name in builder proxy server webserver
do
  if [[ "$name" == "server" ]]
  then image=${project}
  else image=${project}_$name
  fi
  echo "Tagging image $image:$commit as $image:$tag"
  docker tag "$image:$commit" "$image:$tag" || true
done
