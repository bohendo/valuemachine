#!/usr/bin/env bash
set -e

root="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
project="`cat $root/package.json | grep '"name":' | head -n 1 | cut -d '"' -f 4`"
registryRoot="`cat $root/package.json | grep '"registry":' | head -n 1 | cut -d '"' -f 4`"
organization="${CI_PROJECT_NAMESPACE:-`whoami`}"
version="$1"

registry="$registryRoot/$organization/$project"

for image in builder proxy server webserver
do
  echo "Pulling image: $registry/${project}_$image:$version"
  docker pull $registry/${project}_$image:$version || true
  docker tag $registry/${project}_$image:$version ${project}_$image:$version || true
done
