#!/usr/bin/env bash
set -e

root="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
project="`cat $root/package.json | grep '"name":' | head -n 1 | cut -d '"' -f 4`"
registryRoot="`cat $root/package.json | grep '"registry":' | head -n 1 | cut -d '"' -f 4`"
organization="${CI_PROJECT_NAMESPACE:-`whoami`}"
commit="`git rev-parse HEAD | head -c 8`"

registry="$registryRoot/$organization/$project"

for image in builder proxy server webserver
do
  echo "Pulling image: $registry/${project}_$image:$commit"
  docker pull $registry/${project}_$image:$commit || true
  docker tag $registry/${project}_$image:$commit ${project}_$image:$commit || true
  docker pull $registry/${project}_$image:latest || true
  docker tag $registry/${project}_$image:latest ${project}_$image:latest || true
done
